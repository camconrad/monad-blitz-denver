/**
 * Options chain types and live/mock data for trade page.
 * Spot and strikes are driven by real MON price (CoinGecko); quotes are model-derived until an options API exists.
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

/** Options for building chain from live spot (e.g. CoinGecko MON price). */
export interface OptionsChainWithSpotInput {
  /** 24h % price change; used to nudge ATM IV (higher vol → higher IV). */
  change24h?: number | null;
}

const DEFAULT_SPOT_FALLBACK = 1.15;

/** Deterministic "noise" from numbers (no Math.random) so quotes are stable for same inputs. */
function hashNum(...args: number[]): number {
  let h = 0;
  for (const x of args) {
    h = Math.imul(31, h) + (x * 1000) | 0;
  }
  return Math.abs(h) / 2147483647;
}

const MIN_STRIKE_ROWS = 9;

/**
 * Strikes centered around spot (≈ 80%–125% of spot), rounded to 2 decimals.
 * Step size scales with spot; ensures at least MIN_STRIKE_ROWS so the chain table has enough rows (e.g. for low spot like MON ~$0.02).
 */
export function strikesForSpot(spot: number): number[] {
  if (spot <= 0) return [1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3];
  const rawStep = Math.max(0.01, Math.round(spot * 0.05 * 100) / 100);
  const low = Math.round((spot * 0.8) * 100) / 100;
  const high = Math.round((spot * 1.25) * 100) / 100;
  const range = Math.max(high - low, spot * 0.08);
  // Use a step that gives at least MIN_STRIKE_ROWS strikes (allow small step for low spot)
  const step = Math.min(rawStep, range / (MIN_STRIKE_ROWS - 1));
  const stepRounded = Math.max(0.001, Math.round(step * 1000) / 1000);
  const strikes: number[] = [];
  for (let i = 0; i <= 25; i++) {
    const s = Math.round((low + i * stepRounded) * 1000) / 1000;
    if (s > high) break;
    if (strikes.length === 0 || s > strikes[strikes.length - 1]) strikes.push(s);
  }
  return strikes.length > 0 ? strikes : [spot];
}

/**
 * Next N monthly expirations (third Friday of each month). Always returns future dates.
 */
export function getNextExpirations(count: number = 5): string[] {
  const out: string[] = [];
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  for (let i = 0; i < count * 2; i++) {
    const thirdFriday = getThirdFriday(year, month);
    const iso = `${thirdFriday.getFullYear()}-${String(thirdFriday.getMonth() + 1).padStart(2, '0')}-${String(thirdFriday.getDate()).padStart(2, '0')}`;
    if (thirdFriday > now && !out.includes(iso)) {
      out.push(iso);
      if (out.length >= count) break;
    }
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return out.length > 0 ? out : [formatDateYMD(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))];
}

function getThirdFriday(year: number, month: number): Date {
  const first = new Date(year, month, 1);
  const dayOfWeek = first.getDay(); // 0=Sun, 5=Fri
  const daysUntilFirstFriday = (5 - dayOfWeek + 7) % 7;
  const firstFridayDate = 1 + daysUntilFirstFriday;
  const thirdFridayDate = firstFridayDate + 14;
  return new Date(year, month, thirdFridayDate);
}

function formatDateYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Model-derived quote (deterministic from strike, side, spot, baseIv, seed). No exchange order book yet. */
function modelQuote(
  strike: number,
  side: OptionSide,
  spot: number,
  baseIv: number,
  seed: number
): OptionQuote {
  const moneyness = side === 'call' ? (spot - strike) / spot : (strike - spot) / spot;
  const ivNoise = (hashNum(seed, strike, side === 'call' ? 1 : 0) - 0.5) * 4;
  const iv = Math.max(35, Math.min(95, baseIv + moneyness * 15 + ivNoise));
  const atmDist = Math.abs(strike - spot);
  const spreadPct = 0.02 + (atmDist / spot) * 0.01;
  const mid =
    side === 'call'
      ? Math.max(0.02, (spot - strike) * 0.4 + atmDist * 0.15)
      : Math.max(0.02, (strike - spot) * 0.4 + atmDist * 0.15);
  const spread = mid * spreadPct;
  const bid = Math.round((mid - spread / 2) * 100) / 100;
  const ask = Math.round((mid + spread / 2) * 100) / 100;
  const last = Math.round(((bid + ask) / 2) * 100) / 100;
  const sizeChoice = Math.floor(hashNum(seed, strike, side === 'call' ? 2 : 3) * 3) % 3;
  const bidSize = [50, 100, 250][sizeChoice];
  const askSize = [50, 100, 250][(sizeChoice + 1) % 3];
  const delta =
    side === 'call'
      ? Math.max(0.05, Math.min(0.95, 0.5 + moneyness * 2 + ((strike - spot) / spot) * -1.5))
      : Math.max(0.05, Math.min(0.95, 0.5 - moneyness * 2 + ((strike - spot) / spot) * 1.5));
  const chg = (hashNum(seed, strike, 4) - 0.5) * 4;
  const vol = Math.floor(hashNum(seed, strike, 5) * 800) + 50;
  const oi = Math.floor(hashNum(seed, strike, 6) * 2000) + 100;
  const gamma = 0.001 + hashNum(seed, strike, 7) * 0.002;
  const theta = -0.02 - hashNum(seed, strike, 8) * 0.03;
  const vega = 0.08 + hashNum(seed, strike, 9) * 0.04;
  return {
    bid,
    ask,
    last,
    change: Math.round(chg * 100) / 100,
    volume: vol,
    openInterest: oi,
    bidSize,
    askSize,
    iv: Math.round(iv * 10) / 10,
    delta: Math.round(delta * 100) / 100,
    gamma: Math.round(gamma * 1000) / 1000,
    theta: Math.round(theta * 100) / 100,
    vega: Math.round(vega * 100) / 100,
  };
}

function buildChainForExpiry(
  expiry: string,
  spot: number,
  baseIv: number,
  strikes: number[],
  expiryIndex: number
): StrikeRow[] {
  const seed = expiry.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + expiryIndex * 1000;
  return strikes.map((strike) => ({
    strike,
    call: modelQuote(strike, 'call', spot, baseIv, seed + strike * 10),
    put: modelQuote(strike, 'put', spot, baseIv, seed + strike * 10 + 1),
  }));
}

/**
 * Build options chain from live spot (e.g. MON price from CoinGecko).
 * - Spot: used as underlying price and to center strikes.
 * - Strikes: generated around spot (80%–125%).
 * - Expirations: next 5 third-Fridays (monthly).
 * - IV: base from tenor; optionally nudged by change24h (higher |change24h| → higher ATM IV).
 * Bid/ask/volume/OI are model-derived until an options API is available.
 */
export function getOptionsChainWithSpot(
  spot: number,
  options?: OptionsChainWithSpotInput
): OptionsChainSnapshot {
  const safeSpot = spot > 0 ? spot : DEFAULT_SPOT_FALLBACK;
  const strikes = strikesForSpot(safeSpot);
  const expirations = getNextExpirations(5);
  const volNudge =
    options?.change24h != null ? Math.min(15, Math.abs(options.change24h) * 0.5) : 0;
  const chainsByExpiry: Record<string, StrikeRow[]> = {};
  expirations.forEach((expiry, i) => {
    const baseIv = 52 + i * 3 + volNudge;
    chainsByExpiry[expiry] = buildChainForExpiry(expiry, safeSpot, baseIv, strikes, i);
  });
  return {
    symbol: 'MON-USD',
    spot: safeSpot,
    expirations,
    chainsByExpiry,
  };
}

export const MOCK_EXPIRATIONS = [
  '2025-02-21',
  '2025-03-21',
  '2025-04-18',
  '2025-06-20',
  '2025-09-19',
];

/** Legacy: returns chain with default spot. Prefer getOptionsChainWithSpot(realSpot) when MON price is available. */
export function getMockOptionsChain(): OptionsChainSnapshot {
  return getOptionsChainWithSpot(DEFAULT_SPOT_FALLBACK);
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
