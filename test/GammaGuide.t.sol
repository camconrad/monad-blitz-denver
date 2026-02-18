// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import { GammaGuide } from "../contracts/GammaGuide.sol";
import { IAggregatorV3 } from "../contracts/interfaces/IAggregatorV3.sol";

/**
 * Mock Chainlink aggregator: configurable price and updatedAt for testing.
 */
contract MockAggregatorV3 is IAggregatorV3 {
    int256 public price;
    uint256 public updatedAt;
    uint80 public roundId;

    function setPrice(int256 _price, uint256 _updatedAt) external {
        price = _price;
        updatedAt = _updatedAt;
        roundId++;
    }

    function decimals() external pure override returns (uint8) {
        return 8;
    }

    function description() external pure override returns (string memory) {
        return "Mock USD";
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    function getRoundData(uint80) external view override returns (uint80, int256, uint256, uint256, uint80) {
        return (roundId, price, 0, updatedAt, roundId);
    }

    function latestRoundData() external view override returns (uint80, int256, uint256, uint256, uint80) {
        return (roundId, price, 0, updatedAt, roundId);
    }
}

/**
 * Mock ERC20 for quote token (premiums/payouts).
 */
contract MockERC20 {
    string public name = "Mock USDC";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "balance");
        require(allowance[from][msg.sender] >= amount, "allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract GammaGuideTest is Test {
    GammaGuide public guide;
    MockERC20 public quoteToken;
    MockAggregatorV3 public feed;

    address public owner;
    address public buyer;
    uint256 constant STRIKE_8 = 2000 * 1e8;   // $2000 in 8 decimals
    uint256 constant PREMIUM = 50 * 1e6;      // 50 USDC (6 decimals)

    function setUp() public {
        owner = address(this);
        buyer = makeAddr("buyer");
        quoteToken = new MockERC20();
        quoteToken.mint(buyer, 1000 * 1e6);
        guide = new GammaGuide(address(quoteToken));
        feed = new MockAggregatorV3();
        guide.setAllowedFeed(address(feed), true);
    }

    function test_Constructor() public view {
        assertEq(guide.quoteToken(), address(quoteToken));
        assertEq(guide.nextOptionId(), 0);
        assertEq(guide.maxPriceAge(), 1 hours);
        assertFalse(guide.paused());
        assertTrue(guide.allowedFeeds(address(feed)));
    }

    function test_BuyOption_RevertWhenFeedNotAllowed() public {
        guide.setAllowedFeed(address(feed), false);
        vm.prank(buyer);
        vm.expectRevert(GammaGuide.FeedNotAllowed.selector);
        guide.buyOption(address(feed), true, STRIKE_8, block.timestamp + 1 days, PREMIUM);
    }

    function test_BuyOption_RevertWhenExpiryInPast() public {
        quoteToken.mint(buyer, PREMIUM);
        vm.prank(buyer);
        quoteToken.approve(address(guide), PREMIUM);
        vm.prank(buyer);
        vm.expectRevert(GammaGuide.ExpiryInPast.selector);
        guide.buyOption(address(feed), true, STRIKE_8, block.timestamp - 1, PREMIUM);
    }

    function test_BuyOption_RevertWhenStrikeZero() public {
        vm.prank(buyer);
        vm.expectRevert(GammaGuide.StrikeZero.selector);
        guide.buyOption(address(feed), true, 0, block.timestamp + 1 days, 0);
    }

    function test_BuyOption_Success_ZeroPremium() public {
        vm.prank(buyer);
        uint256 optionId = guide.buyOption(address(feed), true, STRIKE_8, block.timestamp + 1 days, 0);
        assertEq(optionId, 0);
        assertEq(guide.nextOptionId(), 1);
        (address underlyingFeed,, uint256 strikePrice, uint256 expiryTs, address optBuyer,,,) = guide.options(0);
        assertEq(underlyingFeed, address(feed));
        assertEq(strikePrice, STRIKE_8);
        assertEq(expiryTs, block.timestamp + 1 days);
        assertEq(optBuyer, buyer);
        uint256[] memory ids = guide.getOptionIdsByBuyer(buyer);
        assertEq(ids.length, 1);
        assertEq(ids[0], 0);
    }

    function test_BuyOption_Success_WithPremium() public {
        vm.prank(buyer);
        quoteToken.approve(address(guide), PREMIUM);
        vm.prank(buyer);
        uint256 optionId = guide.buyOption(address(feed), true, STRIKE_8, block.timestamp + 1 days, PREMIUM);
        assertEq(optionId, 0);
        assertEq(quoteToken.balanceOf(address(guide)), PREMIUM);
        assertEq(quoteToken.balanceOf(buyer), 1000 * 1e6 - PREMIUM);
    }

    function test_Settle_CallInTheMoney() public {
        vm.prank(buyer);
        quoteToken.approve(address(guide), PREMIUM);
        vm.prank(buyer);
        guide.buyOption(address(feed), true, STRIKE_8, block.timestamp + 1 days, PREMIUM);
        vm.warp(block.timestamp + 2 days);
        feed.setPrice(int256(2500 * 1e8), block.timestamp);
        quoteToken.mint(address(guide), 500 * 1e6); // fund contract for payout
        uint256 payout = guide.settle(0);
        assertEq(payout, 500 * 1e6);
        assertEq(quoteToken.balanceOf(buyer), 1000 * 1e6 - PREMIUM + 500 * 1e6);
        (, , , , , , bool settled, uint256 payoutAmount) = guide.options(0);
        assertTrue(settled);
        assertEq(payoutAmount, 500 * 1e6);
    }

    function test_Settle_PutInTheMoney() public {
        vm.prank(buyer);
        quoteToken.approve(address(guide), PREMIUM);
        vm.prank(buyer);
        guide.buyOption(address(feed), false, STRIKE_8, block.timestamp + 1 days, PREMIUM); // put
        vm.warp(block.timestamp + 2 days);
        feed.setPrice(int256(1500 * 1e8), block.timestamp);
        quoteToken.mint(address(guide), 500 * 1e6);
        uint256 payout = guide.settle(0);
        assertEq(payout, 500 * 1e6);
    }

    function test_Settle_OutOfTheMoney_ZeroPayout() public {
        vm.prank(buyer);
        quoteToken.approve(address(guide), PREMIUM);
        vm.prank(buyer);
        guide.buyOption(address(feed), true, STRIKE_8, block.timestamp + 1 days, PREMIUM);
        vm.warp(block.timestamp + 2 days);
        feed.setPrice(int256(1500 * 1e8), block.timestamp);
        uint256 payout = guide.settle(0);
        assertEq(payout, 0);
        assertEq(quoteToken.balanceOf(buyer), 1000 * 1e6 - PREMIUM);
    }

    function test_Settle_RevertWhenNotExpired() public {
        vm.prank(buyer);
        guide.buyOption(address(feed), true, STRIKE_8, block.timestamp + 1 days, 0);
        feed.setPrice(int256(2500 * 1e8), block.timestamp);
        vm.expectRevert(GammaGuide.NotExpired.selector);
        guide.settle(0);
    }

    function test_Settle_RevertWhenAlreadySettled() public {
        vm.prank(buyer);
        guide.buyOption(address(feed), true, STRIKE_8, block.timestamp + 1 days, 0);
        vm.warp(block.timestamp + 2 days);
        feed.setPrice(int256(2500 * 1e8), block.timestamp);
        quoteToken.mint(address(guide), 500 * 1e6);
        guide.settle(0);
        vm.expectRevert(GammaGuide.AlreadySettled.selector);
        guide.settle(0);
    }

    function test_GetLatestPrice() public {
        feed.setPrice(int256(3000 * 1e8), block.timestamp);
        (int256 price, uint256 updatedAt) = guide.getLatestPrice(address(feed));
        assertEq(price, 3000 * 1e8);
        assertEq(updatedAt, block.timestamp);
    }

    function test_ComputePayout_Call() public view {
        assertEq(guide.computePayout(GammaGuide.OptionType.Call, 2000 * 1e8, 2500 * 1e8), 500 * 1e8);
        assertEq(guide.computePayout(GammaGuide.OptionType.Call, 2000 * 1e8, 2000 * 1e8), 0);
        assertEq(guide.computePayout(GammaGuide.OptionType.Call, 2000 * 1e8, 1500 * 1e8), 0);
    }

    function test_ComputePayout_Put() public view {
        assertEq(guide.computePayout(GammaGuide.OptionType.Put, 2000 * 1e8, 1500 * 1e8), 500 * 1e8);
        assertEq(guide.computePayout(GammaGuide.OptionType.Put, 2000 * 1e8, 2500 * 1e8), 0);
    }

    function test_Paused_BuyReverts() public {
        guide.setPaused(true);
        vm.prank(buyer);
        quoteToken.approve(address(guide), PREMIUM);
        vm.prank(buyer);
        vm.expectRevert(GammaGuide.ContractPaused.selector);
        guide.buyOption(address(feed), true, STRIKE_8, block.timestamp + 1 days, PREMIUM);
    }

    function test_MaxPriceAgeTooLow_Reverts() public {
        vm.expectRevert(GammaGuide.MaxPriceAgeTooLow.selector);
        guide.setMaxPriceAge(0);
    }
}
