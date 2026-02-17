"use client";

import { useState, useEffect } from "react";

export type SpotPrices = {
  ethereum?: number;
  bitcoin?: number;
  solana?: number;
  "wrapped-bitcoin"?: number;
};

/**
 * Fetch spot prices from /api/price (CoinGecko). Use for Guide context and options chain.
 */
export function useSpotPrices(): {
  prices: SpotPrices | null;
  loading: boolean;
  error: string | null;
} {
  const [prices, setPrices] = useState<SpotPrices | null>(null);
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
      .then((data: SpotPrices) => {
        if (!cancelled) {
          setPrices(data);
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

  return { prices, loading, error };
}

/** ETH spot from prices; fallback to number or undefined. */
export function ethSpot(prices: SpotPrices | null, fallback?: number): number {
  const v = prices?.ethereum;
  if (typeof v === "number") return v;
  return fallback ?? 0;
}
