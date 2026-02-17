// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAggregatorV3} from "./interfaces/IAggregatorV3.sol";

/**
 * @title GammaGuide
 * @notice European cash-settled options against tokens using Chainlink oracles (Monad).
 * @dev Buy call/put options; settle at expiry using the underlying's USD price feed.
 *      Follows Checks-Effects-Interactions: all state updates and events occur before
 *      any external calls (transferFrom/transfer) to prevent reentrancy.
 */
contract GammaGuide {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum OptionType {
        Call,
        Put
    }

    /// @param underlyingFeed Chainlink price feed proxy (e.g. ETH_USD_Proxy)
    /// @param strikePrice USD with 8 decimals (Chainlink format)
    /// @param premiumPaid In quoteToken units
    /// @param payoutAmount In quoteToken units; set on settle
    struct Option {
        address underlyingFeed;
        OptionType optionType;
        uint256 strikePrice;
        uint256 expiryTs;
        address buyer;
        uint256 premiumPaid;
        bool settled;
        uint256 payoutAmount;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @dev Quote token for premiums and payouts (e.g. USDC)
    address public quoteToken;

    /// @dev Next option id
    uint256 public nextOptionId;

    /// @dev optionId => Option
    mapping(uint256 => Option) public options;

    /// @dev Buyer => list of option ids (for "My positions" / Robinhood-like)
    mapping(address => uint256[]) private _optionIdsByBuyer;

    /// @dev Allowed Chainlink price feed proxies (underlyings)
    mapping(address => bool) public allowedFeeds;

    /// @dev Max age of price (seconds) when settling; reject if updatedAt is older
    uint256 public maxPriceAge;

    /// @dev When true, buyOption reverts; settle still works
    bool public paused;

    /// @dev Protocol can receive premiums and pay settlements
    address public owner;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when a new option is bought.
    event OptionCreated(
        uint256 indexed optionId,
        address indexed underlyingFeed,
        OptionType optionType,
        uint256 strikePrice,
        uint256 expiryTs,
        address indexed buyer,
        uint256 premiumPaid
    );

    /// @notice Emitted when an option is settled at expiry.
    event OptionSettled(
        uint256 indexed optionId,
        address indexed buyer,
        uint256 payoutAmount,
        int256 settlementPrice
    );

    event FeedAllowed(address indexed feed, bool allowed);
    event MaxPriceAgeSet(uint256 maxPriceAge);
    event PausedSet(bool paused);
    event OwnerSet(address indexed owner);
    event QuoteTokenSet(address indexed quoteToken);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error FeedNotAllowed();       // Underlying feed not in allowedFeeds
    error ExpiryInPast();         // expiryTs <= block.timestamp
    error ExpiryTooFar();         // expiryTs > 365 days from now
    error StrikeZero();           // strikePrice == 0
    error TransferFailed();       // quoteToken transfer/transferFrom failed
    error OptionNotFound();       // No option for optionId
    error NotExpired();           // block.timestamp < expiryTs
    error AlreadySettled();       // Option already settled
    error StalePrice(uint256 updatedAt, uint256 maxAge);  // Price too old
    error PriceNotYetAvailable(uint256 updatedAt, uint256 expiryTs);  // No round at/after expiry
    error OnlyOwner();            // Caller is not owner
    error ContractPaused();       // buyOption disabled when paused

    // -------------------------------------------------------------------------
    // Constructor & admin
    // -------------------------------------------------------------------------

    /// @param _quoteToken Token for premiums and payouts (e.g. USDC)
    constructor(address _quoteToken) {
        owner = msg.sender;
        quoteToken = _quoteToken;
        maxPriceAge = 1 hours;
        emit QuoteTokenSet(_quoteToken);
        emit OwnerSet(msg.sender);
        emit MaxPriceAgeSet(maxPriceAge);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    /// @param feed Chainlink proxy address
    /// @param allowed True to allow as underlying
    function setAllowedFeed(address feed, bool allowed) external onlyOwner {
        allowedFeeds[feed] = allowed;
        emit FeedAllowed(feed, allowed);
    }

    /// @param _maxPriceAge Max seconds since price update when settling
    function setMaxPriceAge(uint256 _maxPriceAge) external onlyOwner {
        maxPriceAge = _maxPriceAge;
        emit MaxPriceAgeSet(_maxPriceAge);
    }

    /// @param _paused True to disable new buys (settle still allowed)
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedSet(_paused);
    }

    /// @param _owner New owner
    function setOwner(address _owner) external onlyOwner {
        owner = _owner;
        emit OwnerSet(_owner);
    }

    /// @param _quoteToken New quote token for premiums/payouts
    function setQuoteToken(address _quoteToken) external onlyOwner {
        quoteToken = _quoteToken;
        emit QuoteTokenSet(_quoteToken);
    }

    // -------------------------------------------------------------------------
    // View
    // -------------------------------------------------------------------------

    /// @notice Latest price from a Chainlink feed (8 decimals for USD pairs).
    /// @param feed Chainlink price feed proxy
    /// @return price Latest answer (8 decimals)
    /// @return updatedAt Timestamp when price was updated
    function getLatestPrice(address feed) public view returns (int256 price, uint256 updatedAt) {
        (, int256 answer, , uint256 updatedAt_, ) = IAggregatorV3(feed).latestRoundData();
        return (answer, updatedAt_);
    }

    /// @notice Option ids bought by a user (for "My positions").
    /// @param buyer User address
    /// @return ids Array of option ids (open + settled)
    function getOptionIdsByBuyer(address buyer) external view returns (uint256[] memory ids) {
        return _optionIdsByBuyer[buyer];
    }

    /// @notice Intrinsic value at spot (8 decimals).
    /// @param optionType Call or Put
    /// @param strikePrice Strike in 8 decimals
    /// @param spotPrice8 Spot in 8 decimals
    /// @return payout8 Payout in 8 decimals (max(0, spot-strike) for call; put analogous)
    function computePayout(
        OptionType optionType,
        uint256 strikePrice,
        int256 spotPrice8
    ) public pure returns (uint256 payout8) {
        if (spotPrice8 <= 0) return 0;
        uint256 spot = uint256(spotPrice8);
        if (optionType == OptionType.Call) {
            return spot > strikePrice ? spot - strikePrice : 0;
        } else {
            return strikePrice > spot ? strikePrice - spot : 0;
        }
    }

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------

    /// @notice Buy a European option. Caller pays premium in quoteToken; must approve this contract.
    /// @param underlyingFeed Chainlink price feed proxy (e.g. ETH_USD_Proxy)
    /// @param isCall True = call, false = put
    /// @param strikePrice Strike in USD, 8 decimals
    /// @param expiryTs Expiry unix timestamp
    /// @param premiumAmount Quote token amount (e.g. USDC)
    /// @return optionId Assigned option id
    function buyOption(
        address underlyingFeed,
        bool isCall,
        uint256 strikePrice,
        uint256 expiryTs,
        uint256 premiumAmount
    ) external returns (uint256 optionId) {
        if (paused) revert ContractPaused();
        if (!allowedFeeds[underlyingFeed]) revert FeedNotAllowed();
        if (expiryTs <= block.timestamp) revert ExpiryInPast();
        if (expiryTs > block.timestamp + 365 days) revert ExpiryTooFar();
        if (strikePrice == 0) revert StrikeZero();

        // Effects: update state and emit before any external call (CEI)
        optionId = nextOptionId++;
        _optionIdsByBuyer[msg.sender].push(optionId);
        OptionType _optionType = isCall ? OptionType.Call : OptionType.Put;
        options[optionId] = Option({
            underlyingFeed: underlyingFeed,
            optionType: _optionType,
            strikePrice: strikePrice,
            expiryTs: expiryTs,
            buyer: msg.sender,
            premiumPaid: premiumAmount,
            settled: false,
            payoutAmount: 0
        });
        emit OptionCreated(
            optionId,
            underlyingFeed,
            _optionType,
            strikePrice,
            expiryTs,
            msg.sender,
            premiumAmount
        );

        // Interactions: external call last
        if (premiumAmount > 0) {
            _transferFrom(msg.sender, address(this), premiumAmount);
        }
        return optionId;
    }

    /// @notice Settle after expiry using Chainlink; payout in quoteToken (scaled from 8-dec USD).
    /// @param optionId Option to settle
    /// @return payoutAmount Quote token amount sent to buyer
    /// @dev Requires updatedAt >= expiry and price not older than maxPriceAge.
    function settle(uint256 optionId) external returns (uint256 payoutAmount) {
        Option storage opt = options[optionId];
        if (opt.buyer == address(0)) revert OptionNotFound();
        if (block.timestamp < opt.expiryTs) revert NotExpired();
        if (opt.settled) revert AlreadySettled();

        (int256 price, uint256 updatedAt) = getLatestPrice(opt.underlyingFeed);
        if (updatedAt < opt.expiryTs) revert PriceNotYetAvailable(updatedAt, opt.expiryTs);
        if (block.timestamp > updatedAt && block.timestamp - updatedAt > maxPriceAge) {
            revert StalePrice(updatedAt, maxPriceAge);
        }

        uint256 payout8 = computePayout(opt.optionType, opt.strikePrice, price);
        // Scale from 8-dec USD to quoteToken decimals (e.g. USDC 6 decimals => divide by 100)
        payoutAmount = _scalePayoutToQuoteToken(opt.underlyingFeed, payout8);

        // Effects: update state and emit before any external call (CEI)
        address buyer_ = opt.buyer;
        opt.settled = true;
        opt.payoutAmount = payoutAmount;
        emit OptionSettled(optionId, buyer_, payoutAmount, price);

        // Interactions: external call last
        if (payoutAmount > 0) {
            _transfer(buyer_, payoutAmount);
        }
        return payoutAmount;
    }

    /// @dev Scale 8-decimal USD payout to quote token units (uses quote decimals).
    /// @param payout8 Payout in 8 decimals
    /// @return Amount in quote token units
    function _scalePayoutToQuoteToken(address, uint256 payout8) internal view returns (uint256) {
        uint8 quoteDecimals = _quoteDecimals();
        if (quoteDecimals >= 8) return payout8 * (10 ** (quoteDecimals - 8));
        return payout8 / (10 ** (8 - quoteDecimals));
    }

    /// @dev Quote token decimals (staticcall); defaults to 6 if not found.
    function _quoteDecimals() internal view returns (uint8) {
        (bool ok, bytes memory data) = quoteToken.staticcall(
            abi.encodeWithSignature("decimals()")
        );
        if (ok && data.length >= 32) return abi.decode(data, (uint8));
        return 6; // default USDC
    }

    /// @dev Pull amount from from to to; reverts on failure.
    function _transferFrom(address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = quoteToken.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)
        );
        if (!ok || (data.length > 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    /// @dev Send amount to recipient; reverts on failure.
    function _transfer(address to, uint256 amount) internal {
        (bool ok, bytes memory data) = quoteToken.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        if (!ok || (data.length > 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }
}
