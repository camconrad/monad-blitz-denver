"use client";

import { useState, useEffect } from "react";

export type SpotPrices = {
  ethereum?: number;
  bitcoin?: number;
  solana?: number;
  "wrapped-bitcoin"?: number;
  monad?: number;
};

export type MarketData = {
  usd_24h_vol?: number;
  usd_24h_change?: number;
};

type PriceApiResponse = {
  prices: SpotPrices;
  marketData?: Record<string, MarketData>;
};

/**
 * Fetch spot prices from /api/price (CoinGecko). Use for Guide context and options chain.
 * Also returns marketData (24h vol, 24h % change) when the API includes it.
 */
export function useSpotPrices(): {
  prices: SpotPrices | null;
  marketData: Record<string, MarketData> | null;
  loading: boolean;
  error: string | null;
} {
  const [prices, setPrices] = useState<SpotPrices | null>(null);
  const [marketData, setMarketData] = useState<Record<string, MarketData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/price")
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data: PriceApiResponse | SpotPrices) => {
        if (!cancelled) {
          // Support both { prices, marketData } and legacy flat { ethereum, ... }
          if (data && "prices" in data && data.prices) {
            setPrices(data.prices);
            setMarketData(data.marketData ?? null);
          } else {
            setPrices(data as SpotPrices);
            setMarketData(null);
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load prices");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { prices, marketData, loading, error };
}

/** ETH spot from prices; fallback to number or undefined. */
export function ethSpot(prices: SpotPrices | null, fallback?: number): number {
  const v = prices?.ethereum;
  if (typeof v === "number") return v;
  return fallback ?? 0;
}

/** MON (Monad) spot from prices; fallback to number or undefined. */
export function monadSpot(prices: SpotPrices | null, fallback?: number): number {
  const v = prices?.monad;
  if (typeof v === "number") return v;
  return fallback ?? 0;
}

/** Response from GET /api/price/monad (CoinGecko coins/markets). */
export type MonadMarketResponse = {
  price: number;
  high24h: number | null;
  low24h: number | null;
  volume24h: number | null;
  change24h: number | null;
  marketCap: number | null;
  marketCapRank: number | null;
  /** True when CoinGecko failed and API returned fallback price. */
  fallback?: boolean;
};

const MONAD_MARKET_CACHE_KEY = "monad_market";
const CACHE_TTL_MS = 45_000; // 45s

function getCached(): MonadMarketResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MONAD_MARKET_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: MonadMarketResponse; ts: number };
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function setCached(data: MonadMarketResponse) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(MONAD_MARKET_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

/**
 * Fetch real MON-USD market data from /api/price/monad (CoinGecko /coins/markets).
 * Uses 5s client timeout; caches in sessionStorage so data shows within 5s or from cache.
 */
export function useMonadMarket(): {
  data: MonadMarketResponse | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<MonadMarketResponse | null>(() => getCached());
  const [loading, setLoading] = useState(() => !getCached());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data != null) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5_000);

    setLoading(true);
    setError(null);
    fetch("/api/price/monad", { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          throw new Error((body as { error?: string }).error ?? res.statusText);
        }
        return body as MonadMarketResponse;
      })
      .then((body) => {
        if (!cancelled) {
          setData(body);
          setCached(body);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load MON market");
          const fallback = getCached();
          if (fallback) {
            setData(fallback);
          }
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [data]);

  return { data, loading, error };
}
