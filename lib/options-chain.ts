/**
 * Options chain types and mock data for trade page.
 * Replace with real API/WebSocket data when backend is wired.
 */

export type OptionSide = 'call' | 'put';
export type ChainView = 'all' | 'calls' | 'puts';

export interface OptionQuote {
  bid: number;
  ask: number;
  last: number;
  change: number;
  volume: number;
  openInterest: number;
  bidSize: number;
  askSize: number;
  iv: number;
  delta: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface StrikeRow {
  strike: number;
  call: OptionQuote;
  put: OptionQuote;
}

export interface OptionsChainSnapshot {
  symbol: string;
  spot: number;
  expirations: string[];
  chainsByExpiry: Record<string, StrikeRow[]>;
}

const SPOT = 3245.8;
const STRIKES = [3000, 3050, 3100, 3150, 3200, 3250, 3300, 3350, 3400, 3450, 3500];

function mockQuote(
  strike: number,
  side: OptionSide,
  spot: number,
  baseIv: number
): OptionQuote {
  const moneyness = side === 'call' ? (spot - strike) / spot : (strike - spot) / spot;
  const iv = Math.max(35, Math.min(95, baseIv + moneyness * 15 + (Math.random() - 0.5) * 4));
  const atmDist = Math.abs(strike - spot);
  const spreadPct = 0.02 + atmDist / spot * 0.01;
  const mid = side === 'call'
    ? Math.max(5, (spot - strike) * 0.4 + atmDist * 0.15)
    : Math.max(5, (strike - spot) * 0.4 + atmDist * 0.15);
  const spread = mid * spreadPct;
  const bid = Math.round((mid - spread / 2) * 100) / 100;
  const ask = Math.round((mid + spread / 2) * 100) / 100;
  const last = Math.round((bid + ask) / 2 * 100) / 100;
  const bidSize = [50, 100, 250][Math.floor(Math.random() * 3)];
  const askSize = [50, 100, 250][Math.floor(Math.random() * 3)];
  const delta = side === 'call'
    ? Math.max(0.05, Math.min(0.95, 0.5 + moneyness * 2 + (strike - spot) / spot * -1.5))
    : Math.max(0.05, Math.min(0.95, 0.5 - moneyness * 2 + (strike - spot) / spot * 1.5));
  return {
    bid,
    ask,
    last,
    change: (Math.random() - 0.5) * 4,
    volume: Math.floor(Math.random() * 800) + 50,
    openInterest: Math.floor(Math.random() * 2000) + 100,
    bidSize,
    askSize,
    iv: Math.round(iv * 10) / 10,
    delta: Math.round(delta * 100) / 100,
    gamma: Math.round((0.001 + Math.random() * 0.002) * 1000) / 1000,
    theta: Math.round((-0.02 - Math.random() * 0.03) * 100) / 100,
    vega: Math.round((0.08 + Math.random() * 0.04) * 100) / 100,
  };
}

function buildChainForExpiry(expiry: string, spot: number, baseIv: number): StrikeRow[] {
  return STRIKES.map((strike) => ({
    strike,
    call: mockQuote(strike, 'call', spot, baseIv),
    put: mockQuote(strike, 'put', spot, baseIv),
  }));
}

export const MOCK_EXPIRATIONS = [
  '2025-02-21',
  '2025-03-21',
  '2025-04-18',
  '2025-06-20',
  '2025-09-19',
];

export function getMockOptionsChain(): OptionsChainSnapshot {
  const chainsByExpiry: Record<string, StrikeRow[]> = {};
  MOCK_EXPIRATIONS.forEach((expiry, i) => {
    chainsByExpiry[expiry] = buildChainForExpiry(expiry, SPOT, 58 + i * 3);
  });
  return {
    symbol: 'ETH-USD',
    spot: SPOT,
    expirations: MOCK_EXPIRATIONS,
    chainsByExpiry,
  };
}

export function formatExpiryLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatExpiryShort(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z');
  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Expired';
  if (days === 1) return '1 DTE';
  return `${days} DTE`;
}
