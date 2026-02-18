// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import { GammaGuide } from "../contracts/GammaGuide.sol";
import { ChainlinkMonad } from "../contracts/ChainlinkMonad.sol";

/**
 * Deploy GammaGuide(quoteToken) on Monad and allow Chainlink feeds used by the app.
 * Requires: DEPLOYER_PRIVATE_KEY, MONAD_RPC_URL (or use --rpc-url).
 * Quote token: Monad testnet USDC (override with QUOTE_TOKEN_ADDRESS if needed).
 */
contract DeployScript is Script {
    // Monad testnet USDC (Circle faucet). Mainnet: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603
    address constant QUOTE_TOKEN_TESTNET = 0x534b2f3A21130d7a60830c2Df862319e593943A3;

    function run() external returns (GammaGuide guide) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address quoteToken = vm.envOr("QUOTE_TOKEN_ADDRESS", QUOTE_TOKEN_TESTNET);

        vm.startBroadcast(pk);

        guide = new GammaGuide(quoteToken);

        // Allow feeds used by app (SYMBOL_TO_FEED)
        address[] memory feeds = new address[](13);
        feeds[0] = ChainlinkMonad.ETH_USD;
        feeds[1] = ChainlinkMonad.BTC_USD;
        feeds[2] = ChainlinkMonad.SOL_USD;
        feeds[3] = ChainlinkMonad.LINK_USD;
        feeds[4] = ChainlinkMonad.AVAX_USD;
        feeds[5] = ChainlinkMonad.ARB_USD;
        feeds[6] = ChainlinkMonad.OP_USD;
        feeds[7] = ChainlinkMonad.DOGE_USD;
        feeds[8] = ChainlinkMonad.UNI_USD;
        feeds[9] = ChainlinkMonad.MON_USD;
        feeds[10] = ChainlinkMonad.WBTC_USD;
        feeds[11] = ChainlinkMonad.USDC_USD;
        feeds[12] = ChainlinkMonad.USDT_USD;

        for (uint256 i = 0; i < feeds.length; i++) {
            guide.setAllowedFeed(feeds[i], true);
        }

        vm.stopBroadcast();

        console.log("GammaGuide deployed at:", address(guide));
        console.log("Quote token:", quoteToken);
        console.log("Deployer:", vm.addr(pk));
    }
}
