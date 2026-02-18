import { NextResponse } from "next/server";

const COINGECKO_IDS = "ethereum,bitcoin,solana,wrapped-bitcoin,monad";
const COINGECKO_VS = "usd";

type CoinGeckoCoin = {
  usd?: number;
  usd_last_updated_at?: number;
  usd_24h_vol?: number;
  usd_24h_change?: number;
};

/**
 * GET /api/price — spot prices from CoinGecko (ETH, BTC, SOL, WBTC, MON).
 * Also returns 24h volume and 24h % change when available (e.g. for monad).
 * Set COINGECKO_API_KEY in .env.local for higher rate limits (Demo API: x_cg_demo_api_key).
 */
export async function GET() {
  const key = process.env.COINGECKO_API_KEY;
  const url = new URL("https://api.coingecko.com/api/v3/simple/price");
  url.searchParams.set("ids", COINGECKO_IDS);
  url.searchParams.set("vs_currencies", COINGECKO_VS);
  url.searchParams.set("include_last_updated_at", "true");
  url.searchParams.set("include_24hr_vol", "true");
  url.searchParams.set("include_24hr_change", "true");
  if (key) url.searchParams.set("x_cg_demo_api_key", key);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return NextResponse.json(
        { error: `CoinGecko ${res.status}` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as Record<string, CoinGeckoCoin>;
    const prices: Record<string, number> = {};
    const marketData: Record<string, { usd_24h_vol?: number; usd_24h_change?: number }> = {};
    for (const [id, o] of Object.entries(data)) {
      if (typeof o?.usd === "number") prices[id] = o.usd;
      if (o && (o.usd_24h_vol !== undefined || o.usd_24h_change !== undefined)) {
        marketData[id] = {};
        if (typeof o.usd_24h_vol === "number") marketData[id].usd_24h_vol = o.usd_24h_vol;
        if (typeof o.usd_24h_change === "number") marketData[id].usd_24h_change = o.usd_24h_change;
      }
    }
    return NextResponse.json({ prices, marketData });
  } catch (e) {
    clearTimeout(timeoutId);
    const message =
      e instanceof Error
        ? e.name === "AbortError"
          ? "Price fetch timeout"
          : e.message
        : "Price fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
