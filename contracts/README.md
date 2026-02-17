# Gamma Guide — Options Smart Contracts

European cash-settled options against tokens using **Chainlink** price feeds on **Monad**.

## Overview

- **GammaGuide.sol**: Main contract. Users buy European call/put options; settlement at expiry uses the underlying’s Chainlink USD price feed.
- **Chainlink**: Use the **Proxy** addresses (push oracle) as `underlyingFeed`. Data feeds: [Chainlink Monad addresses](https://docs.chain.link/data-feeds/price-feeds/addresses?page=1&testnetPage=1&network=monad).
- **ChainlinkMonad.sol**: Library of Monad Chainlink proxy addresses for use in GammaGuide or frontend config.

## Flow

1. **Setup**: Deploy `GammaGuide(quoteToken)` (e.g. USDC). Owner sets `allowedFeeds` for each Chainlink proxy (e.g. `ETH_USD`, `BTC_USD` from `ChainlinkMonad`).
2. **Buy option**: User calls `buyOption(underlyingFeed, isCall, strikePrice, expiryTs, premiumAmount)`. Strike and oracle prices use **8 decimals** (Chainlink USD convention). User must approve `quoteToken` to the contract.
3. **Settle**: After `expiryTs`, anyone calls `settle(optionId)`. Contract reads `latestRoundData()` from the feed; requires `updatedAt >= expiryTs` and price not older than `maxPriceAge`. Payout = intrinsic value in USD (8 decimals), converted to quote token and sent to the option buyer.

## Key details

- **Strike / price format**: 8 decimals (e.g. $3245.80 = `324580000000`).
- **Quote token**: Typically USDC (6 decimals). Payout is scaled from 8-decimal USD to quote token decimals.
- **Stale protection**: `maxPriceAge` (default 1 hour); settlement requires a round updated at or after expiry.

## Compiling

Use Foundry or Hardhat with Solidity 0.8.20+.

**Foundry:**

```bash
forge build
```

**Hardhat:** Add a minimal `hardhat.config.js` and compile.

## Deployment (Monad)

1. Deploy `GammaGuide` with your USDC (or other quote token) address.
2. Call `setAllowedFeed(ChainlinkMonad.ETH_USD, true)` (and other underlyings you support).
3. Optionally set `maxPriceAge` and ensure the contract holds enough quote token to pay settlements.

## Chainlink on Monad

- **Price feeds (push oracle)**: Use the Proxy addresses in `ChainlinkMonad.sol` or from the JSON you provided (e.g. `ETH_USD_Proxy`, `BTC_USD_Proxy`).
- **Data Streams (pull)**: `Router` / `VerifierProxy` are for Data Streams; GammaGuide uses the price feed proxies only.

## Files

| File | Purpose |
|------|--------|
| `GammaGuide.sol` | Options lifecycle: buy, settle via oracle |
| `interfaces/IAggregatorV3.sol` | Chainlink price feed interface |
| `ChainlinkMonad.sol` | Monad Chainlink proxy address constants |
