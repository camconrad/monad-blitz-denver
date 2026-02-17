// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAggregatorV3} from "./interfaces/IAggregatorV3.sol";

/**
 * @title GammaGuide
 * @notice European cash-settled options against tokens using Chainlink oracles (Monad).
 * @dev Buy call/put options; settle at expiry using the underlying's USD price feed.
 */
contract GammaGuide {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum OptionType {
        Call,
        Put
    }

    struct Option {
        address underlyingFeed; // Chainlink price feed proxy (e.g. ETH_USD_Proxy)
        OptionType optionType;
        uint256 strikePrice; // USD with 8 decimals (Chainlink format)
        uint256 expiryTs;
        address buyer;
        uint256 premiumPaid; // in quoteToken units
        bool settled;
        uint256 payoutAmount; // in quoteToken units (set on settle)
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

    /// @dev Allowed Chainlink price feed proxies (underlyings)
    mapping(address => bool) public allowedFeeds;

    /// @dev Max age of price (seconds) when settling; reject if updatedAt is older
    uint256 public maxPriceAge;

    /// @dev Protocol can receive premiums and pay settlements
    address public owner;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event OptionCreated(
        uint256 indexed optionId,
        address indexed underlyingFeed,
        OptionType optionType,
        uint256 strikePrice,
        uint256 expiryTs,
        address indexed buyer,
        uint256 premiumPaid
    );

    event OptionSettled(
        uint256 indexed optionId,
        address indexed buyer,
        uint256 payoutAmount,
        int256 settlementPrice
    );

    event FeedAllowed(address indexed feed, bool allowed);
    event MaxPriceAgeSet(uint256 maxPriceAge);
    event OwnerSet(address indexed owner);
    event QuoteTokenSet(address indexed quoteToken);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error FeedNotAllowed();
    error ExpiryInPast();
    error ExpiryTooFar();
    error StrikeZero();
    error TransferFailed();
    error OptionNotFound();
    error NotExpired();
    error AlreadySettled();
    error StalePrice(uint256 updatedAt, uint256 maxAge);
    error PriceNotYetAvailable(uint256 updatedAt, uint256 expiryTs);
    error OnlyOwner();

    // -------------------------------------------------------------------------
    // Constructor & admin
    // -------------------------------------------------------------------------

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

    function setAllowedFeed(address feed, bool allowed) external onlyOwner {
        allowedFeeds[feed] = allowed;
        emit FeedAllowed(feed, allowed);
    }

    function setMaxPriceAge(uint256 _maxPriceAge) external onlyOwner {
        maxPriceAge = _maxPriceAge;
        emit MaxPriceAgeSet(_maxPriceAge);
    }

    function setOwner(address _owner) external onlyOwner {
        owner = _owner;
        emit OwnerSet(_owner);
    }

    function setQuoteToken(address _quoteToken) external onlyOwner {
        quoteToken = _quoteToken;
        emit QuoteTokenSet(_quoteToken);
    }

    // -------------------------------------------------------------------------
    // View
    // -------------------------------------------------------------------------

    /// @notice Get latest price from a Chainlink feed (8 decimals for USD pairs).
    function getLatestPrice(address feed) public view returns (int256 price, uint256 updatedAt) {
        (, int256 answer, , uint256 updatedAt_, ) = IAggregatorV3(feed).latestRoundData();
        return (answer, updatedAt_);
    }

    /// @notice Compute cash payout for an option at a given spot price (8 decimals).
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
    /// @param underlyingFeed Chainlink price feed proxy for the underlying (e.g. ETH_USD_Proxy).
    /// @param isCall True = call, false = put.
    /// @param strikePrice Strike in USD with 8 decimals.
    /// @param expiryTs Unix timestamp of expiry (exercise/settlement time).
    /// @param premiumAmount Amount of quoteToken to pay as premium.
    function buyOption(
        address underlyingFeed,
        bool isCall,
        uint256 strikePrice,
        uint256 expiryTs,
        uint256 premiumAmount
    ) external returns (uint256 optionId) {
        if (!allowedFeeds[underlyingFeed]) revert FeedNotAllowed();
        if (expiryTs <= block.timestamp) revert ExpiryInPast();
        if (expiryTs > block.timestamp + 365 days) revert ExpiryTooFar();
        if (strikePrice == 0) revert StrikeZero();

        optionId = nextOptionId++;
        options[optionId] = Option({
            underlyingFeed: underlyingFeed,
            optionType: isCall ? OptionType.Call : OptionType.Put,
            strikePrice: strikePrice,
            expiryTs: expiryTs,
            buyer: msg.sender,
            premiumPaid: premiumAmount,
            settled: false,
            payoutAmount: 0
        });

        if (premiumAmount > 0) {
            _transferFrom(msg.sender, address(this), premiumAmount);
        }

        emit OptionCreated(
            optionId,
            underlyingFeed,
            options[optionId].optionType,
            strikePrice,
            expiryTs,
            msg.sender,
            premiumAmount
        );
        return optionId;
    }

    /// @notice Settle an option after expiry using Chainlink price. Payout is in quoteToken (scaled from 8-dec USD).
    /// @param optionId Option to settle.
    /// @dev Uses latestRoundData; requires updatedAt >= expiry and updatedAt not older than maxPriceAge.
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
        opt.settled = true;
        opt.payoutAmount = payoutAmount;

        if (payoutAmount > 0) {
            _transfer(opt.buyer, payoutAmount);
        }

        emit OptionSettled(optionId, opt.buyer, payoutAmount, price);
        return payoutAmount;
    }

    /// @dev Scale payout from 8-decimal USD to quote token units.
    /// Assumes quote token has 6 decimals (e.g. USDC); otherwise override or configure.
    function _scalePayoutToQuoteToken(address, uint256 payout8) internal view returns (uint256) {
        uint8 quoteDecimals = _quoteDecimals();
        if (quoteDecimals >= 8) return payout8 * (10 ** (quoteDecimals - 8));
        return payout8 / (10 ** (8 - quoteDecimals));
    }

    function _quoteDecimals() internal view returns (uint8) {
        (bool ok, bytes memory data) = quoteToken.staticcall(
            abi.encodeWithSignature("decimals()")
        );
        if (ok && data.length >= 32) return abi.decode(data, (uint8));
        return 6; // default USDC
    }

    function _transferFrom(address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = quoteToken.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)
        );
        if (!ok || (data.length > 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _transfer(address to, uint256 amount) internal {
        (bool ok, bytes memory data) = quoteToken.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        if (!ok || (data.length > 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }
}
