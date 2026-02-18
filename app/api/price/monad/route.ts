import { NextResponse } from "next/server";

/**
 * GET /api/price/monad — real MON market data from CoinGecko /coins/markets.
 * Returns current price, 24h high, 24h low, 24h volume, 24h % change.
 * Optional: set COINGECKO_API_KEY in .env.local (Demo API key as header) for higher rate limits.
 */
export async function GET() {
  const key = process.env.COINGECKO_API_KEY?.trim();
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("ids", "monad");
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", "1");
  url.searchParams.set("page", "1");

  const headers: Record<string, string> = {};
  if (key && key.length > 10 && !key.startsWith("x_cg_")) {
    headers["x-cg-demo-api-key"] = key;
  }

  // Debug: confirm key is available in production (does not expose the key)
  const responseHeaders: Record<string, string> = {
    "X-CoinGecko-Key": key ? "present" : "missing",
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers,
      next: { revalidate: 60 },
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return NextResponse.json(
        { error: `CoinGecko ${res.status}` },
        { status: 502, headers: responseHeaders }
      );
    }
    const data = (await res.json()) as Array<{
      current_price?: number;
      high_24h?: number;
      low_24h?: number;
      total_volume?: number;
      price_change_percentage_24h?: number;
      market_cap?: number | null;
      market_cap_rank?: number | null;
    }>;
    const coin = Array.isArray(data) ? data[0] : null;
    if (!coin || typeof coin.current_price !== "number") {
      return NextResponse.json(
        { error: "Monad market data not found" },
        { status: 404, headers: responseHeaders }
      );
    }
    return NextResponse.json(
      {
        price: coin.current_price,
        high24h: coin.high_24h ?? null,
        low24h: coin.low_24h ?? null,
        volume24h: coin.total_volume ?? null,
        change24h: coin.price_change_percentage_24h ?? null,
        marketCap: coin.market_cap ?? null,
        marketCapRank: coin.market_cap_rank ?? null,
      },
      { headers: responseHeaders }
    );
  } catch (e) {
    clearTimeout(timeoutId);
    const message =
      e instanceof Error
        ? e.name === "AbortError"
          ? "Price fetch timeout"
          : e.message
        : "Price fetch failed";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: responseHeaders }
    );
  }
}
