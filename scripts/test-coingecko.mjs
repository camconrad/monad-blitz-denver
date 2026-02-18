#!/usr/bin/env node
/**
 * Test CoinGecko API for Monad (id: monad).
 * Run: node scripts/test-coingecko.mjs  OR  yarn test:coingecko
 * No API key required for public /coins/markets.
 */
const url =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=monad&order=market_cap_desc&per_page=1&page=1";

async function main() {
  const res = await fetch(url);
  if (!res.ok) {
    console.error("CoinGecko error:", res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const coin = data[0];
  if (!coin || typeof coin.current_price !== "number") {
    console.error("Monad market data not found");
    process.exit(1);
  }
  console.log("Monad (MON) from CoinGecko:");
  console.log("  Price:     $", coin.current_price);
  console.log("  24h High:  $", coin.high_24h);
  console.log("  24h Low:   $", coin.low_24h);
  console.log("  Volume:    ", coin.total_volume);
  console.log("  24h %:     ", coin.price_change_percentage_24h, "%");
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
