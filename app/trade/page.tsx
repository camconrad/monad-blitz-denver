'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, X, Eye } from 'lucide-react';
import { CoachTradeTabs } from '@/components/coach-trade-tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { WalletAvatar } from '@/components/wallet-avatar';
import { TradingViewChart } from '@/components/tradingview-chart';
import {
  getMockOptionsChain,
  formatExpiryLabel,
  formatExpiryShort,
  type ChainView,
  type OptionSide,
  type StrikeRow,
} from '@/lib/options-chain';
import { cn } from '@/lib/utils';
import { createCoachBus } from '@/lib/voice-coach-bus';
import type { CoachBusEnvelope } from '@/lib/voice-coach-bus';

// Mock types for positions (replace with real data/API later)
type OpenPosition = {
  id: string;
  symbol: string;
  expiry: string;
  strike: number;
  side: 'call' | 'put';
  size: number;
  entryPrice: number;
  markPrice: number;
  liqPrice: number | null;
  unrealizedPnl: number;
};

type ClosedPosition = {
  id: string;
  symbol: string;
  expiry: string;
  strike: number;
  side: 'call' | 'put';
  size: number;
  entryPrice: number;
  closePrice: number;
  realizedPnl: number;
  closedAt: string;
};

const INITIAL_OPEN: OpenPosition[] = [];
const INITIAL_CLOSED: ClosedPosition[] = [];

function formatClosedAt(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function TradePage() {
  const [selectedAsset] = useState('ETH-USD');
  const chainSnapshot = useMemo(() => getMockOptionsChain(), []);
  const [selectedExpiry, setSelectedExpiry] = useState<string>(chainSnapshot.expirations[0]);
  const [chainView, setChainView] = useState<ChainView>('all');
  const [selectedOption, setSelectedOption] = useState<{
    expiry: string;
    strike: number;
    side: OptionSide;
    row: StrikeRow;
  } | null>(null);
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState<string>('1');
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [positionsTab, setPositionsTab] = useState<'open' | 'closed'>('open');
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>(INITIAL_OPEN);
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>(INITIAL_CLOSED);
  const [closeModalPosition, setCloseModalPosition] = useState<OpenPosition | null>(null);
  const [closeMode, setCloseMode] = useState<'full' | 'partial'>('full');
  const [partialCloseQty, setPartialCloseQty] = useState<string>('1');
  const [viewClosedId, setViewClosedId] = useState<string | null>(null);
  const [coachSuggestions, setCoachSuggestions] = useState<Array<{ id: string; receivedAt: number; payload: unknown }>>([]);
  const [coachRisk, setCoachRisk] = useState<{ severity: 'warn' | 'block'; message: string; receivedAt: number } | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string | undefined>(undefined);
  const busRef = useRef<ReturnType<typeof createCoachBus> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    busRef.current = createCoachBus();
    const bus = busRef.current;
    const unsub = bus.subscribe((env: CoachBusEnvelope) => {
      switch (env.type) {
        case 'coach.suggestion':
          setCoachSuggestions((prev) => {
            const next = [...prev, { id: `s-${env.ts}`, receivedAt: env.ts, payload: env.payload }];
            return next.slice(-5);
          });
          break;
        case 'coach.risk.alert':
          setCoachRisk({
            severity: (env.payload as { severity?: string })?.severity === 'block' ? 'block' : 'warn',
            message: (env.payload as { message?: string })?.message ?? 'Risk alert',
            receivedAt: env.ts,
          });
          break;
        case 'coach.transcript.partial':
        case 'coach.transcript.final':
          setLiveTranscript((env.payload as { text?: string })?.text ?? '');
          break;
        default:
          break;
      }
    });
    return () => {
      unsub();
      busRef.current = null;
    };
  }, []);

  const tradingContextPayload = useMemo(() => {
    const symbol = typeof selectedAsset === 'string' ? selectedAsset : (selectedAsset as { symbol?: string })?.symbol ?? (selectedAsset as { underlying?: string })?.underlying ?? 'UNKNOWN';
    return {
      ts: Date.now(),
      symbol,
      selectedAsset: typeof selectedAsset === 'string' ? selectedAsset : selectedAsset,
      selectedOption: selectedOption
        ? { expiry: selectedOption.expiry, strike: selectedOption.strike, side: selectedOption.side }
        : null,
      orderSide,
      orderType,
      quantity,
      limitPrice: orderType === 'limit' ? limitPrice : undefined,
      openCount: openPositions.length,
      closedCount: closedPositions.length,
      openPositions: openPositions.slice(0, 10).map((p) => ({ id: p.id, symbol: p.symbol, expiry: p.expiry, strike: p.strike, side: p.side, size: p.size, unrealizedPnl: p.unrealizedPnl })),
      closedPositions: closedPositions.slice(0, 5).map((p) => ({ id: p.id, symbol: p.symbol, realizedPnl: p.realizedPnl })),
    };
  }, [selectedAsset, selectedOption, openPositions, closedPositions, orderSide, orderType, quantity, limitPrice]);

  useEffect(() => {
    if (typeof window === 'undefined' || !busRef.current) return;
    busRef.current.publish('trading.context', tradingContextPayload);
  }, [tradingContextPayload]);

  const chain = chainSnapshot.chainsByExpiry[selectedExpiry] ?? [];
  const spot = chainSnapshot.spot;

  const selectedQuote = selectedOption
    ? selectedOption.row[selectedOption.side]
    : null;
  const defaultLimit = selectedQuote
    ? orderSide === 'buy'
      ? selectedQuote.ask
      : selectedQuote.bid
    : 0;
  const displayLimit = limitPrice !== '' ? parseFloat(limitPrice) : defaultLimit;
  const qtyNum = parseFloat(quantity) || 0;
  const CONTRACT_MULTIPLIER = 100;
  const estPremium = displayLimit * qtyNum * CONTRACT_MULTIPLIER;

  // For market orders use current bid/ask as effective price for estimate
  const effectivePrice = orderType === 'market' ? defaultLimit : displayLimit;
  const effectivePremium = effectivePrice * qtyNum * CONTRACT_MULTIPLIER;

  // Estimated cost breakdown (mock fee structure; replace with real fee schedule when available)
  const estCost = useMemo(() => {
    if (!selectedOption || qtyNum <= 0) return null;
    const regFeePerContract = 0.02;
    const exchangeFeePerContract = 0.01;
    const contractFeePerContract = 0.5;
    const premium = effectivePremium;
    const regFee = regFeePerContract * qtyNum;
    const exchangeFee = exchangeFeePerContract * qtyNum;
    const contractFee = contractFeePerContract * qtyNum;
    return {
      premium,
      regFee,
      exchangeFee,
      contractFee,
      total: premium + regFee + exchangeFee + contractFee,
    };
  }, [selectedOption, qtyNum, effectivePremium]);

  // Max Profit, Breakeven (underlying price), Max Loss for the order (use effective price for market/limit)
  const orderGreeks = useMemo(() => {
    if (!selectedOption || qtyNum <= 0) return null;
    const strike = selectedOption.strike;
    const isLong = orderSide === 'buy';
    const isCall = selectedOption.side === 'call';
    const premium = effectivePremium;
    // Breakeven: long call = strike + premium/share, long put = strike - premium/share (same for short)
    const breakeven = isCall ? strike + effectivePrice : strike - effectivePrice;
    const maxLossLongCallPut = premium;
    const maxProfitShort = premium;
    const maxLossShortPut = strike * 100 * qtyNum - premium;

    if (isLong) {
      return {
        maxProfit: isCall ? Infinity : strike * 100 * qtyNum - premium,
        maxProfitUnlimited: isCall,
        breakeven,
        maxLoss: maxLossLongCallPut,
        maxLossUnlimited: false,
      };
    }
    return {
      maxProfit: maxProfitShort,
      maxProfitUnlimited: false,
      breakeven,
      maxLoss: isCall ? Infinity : maxLossShortPut,
      maxLossUnlimited: isCall,
    };
  }, [selectedOption, orderSide, qtyNum, effectivePrice, effectivePremium]);

  const selectionKey = selectedOption
    ? `${selectedOption.expiry}-${selectedOption.strike}-${selectedOption.side}`
    : null;

  function confirmClosePosition() {
    const pos = closeModalPosition;
    if (!pos) return;
    const qty = closeMode === 'full' ? pos.size : Math.min(Math.max(1, parseInt(partialCloseQty, 10) || 1), pos.size);
    const realizedPnl = (pos.unrealizedPnl / pos.size) * qty;
    const closed: ClosedPosition = {
      id: `${pos.id}-${Date.now()}`,
      symbol: pos.symbol,
      expiry: pos.expiry,
      strike: pos.strike,
      side: pos.side,
      size: qty,
      entryPrice: pos.entryPrice,
      closePrice: pos.markPrice,
      realizedPnl,
      closedAt: formatClosedAt(),
    };
    setClosedPositions((prev) => [...prev, closed]);
    if (qty >= pos.size) {
      setOpenPositions((prev) => prev.filter((p) => p.id !== pos.id));
    } else {
      setOpenPositions((prev) =>
        prev.map((p) =>
          p.id === pos.id
            ? {
                ...p,
                size: p.size - qty,
                unrealizedPnl: (p.unrealizedPnl / p.size) * (p.size - qty),
              }
            : p
        )
      );
    }
    if (busRef.current) {
      busRef.current.publish('trading.intent', {
        intent: qty >= pos.size ? 'close' : 'reduce',
        symbol: pos.symbol,
        details: { positionId: pos.id, closeQty: qty, full: qty >= pos.size },
      });
    }
    setCloseModalPosition(null);
    setCloseMode('full');
    setPartialCloseQty('1');
  }

  useEffect(() => {
    if (!selectedOption) {
      setLimitPrice('');
      return;
    }
    const q = selectedOption.row[selectedOption.side];
    const def = orderSide === 'buy' ? q.ask : q.bid;
    setLimitPrice(def.toFixed(2));
  }, [selectionKey, orderSide]);

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* Header - wrapped card to match page content pattern */}
      <div className="px-2 pt-2 shrink-0">
        <header className="rounded-lg border border-border card-glass">
          <div className="grid grid-cols-3 items-center gap-3 px-3 py-2">
          <div className="min-w-0 flex justify-start">
            <h1 className="text-lg font-semibold">Options Trading</h1>
          </div>

          <CoachTradeTabs />
          
          <div className="flex items-center gap-4 min-w-0 justify-end">
            <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary">
              Testnet
            </Badge>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Portfolio Value</p>
              <p className="text-sm font-semibold">$125,430.50</p>
            </div>
            <WalletAvatar className="shrink-0" />
          </div>
        </div>
        </header>
      </div>

      <main className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col gap-2 p-2">
          {(coachRisk || liveTranscript || coachSuggestions.length > 0) && (
            <div className="shrink-0 rounded-lg border border-border card-glass p-3 space-y-2">
              <h3 className="text-sm font-semibold">Coach</h3>
              {coachRisk && (
                <div
                  className={cn(
                    'rounded-md px-3 py-2 text-sm',
                    coachRisk.severity === 'block'
                      ? 'bg-destructive/15 text-destructive border border-destructive/40'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40'
                  )}
                >
                  {coachRisk.message}
                </div>
              )}
              {liveTranscript && <p className="text-xs text-muted-foreground truncate">Last: {liveTranscript}</p>}
              {coachSuggestions.length > 0 && (
                <div className="space-y-1.5">
                  {coachSuggestions.map((s) => {
                    const p = s.payload as { title?: string; rationale?: string; actions?: unknown[] };
                    return (
                      <div key={s.id} className="rounded-md border border-border bg-muted/20 p-2 text-xs">
                        {p.title != null && <p className="font-medium text-foreground">{p.title}</p>}
                        {p.rationale != null && <p className="text-muted-foreground mt-0.5">{p.rationale}</p>}
                        {Array.isArray(p.actions) && p.actions.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {p.actions.map((a, i) => (
                              <span key={i} className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                                {typeof a === 'object' && a !== null && 'label' in (a as object) ? (a as { label: string }).label : String(a)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <div className="flex-1 flex flex-col lg:flex-row gap-2 min-h-0">
          <div className="flex-1 lg:flex-[0.6] flex flex-col gap-2">
            {/* Asset Selector & Price */}
            <div className="border border-border rounded-lg card-glass p-3">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">Ξ</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedAsset}</h2>
                    <p className="text-xs text-muted-foreground">Ethereum / US Dollar</p>
                  </div>
                </div>

                <div className="flex-1 min-w-0 grid grid-cols-4 gap-4 text-sm">
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">24h High</p>
                    <p className="font-semibold">$3,285.20</p>
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">24h Low</p>
                    <p className="font-semibold">$3,156.40</p>
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Volume</p>
                    <p className="font-semibold">$2.4B</p>
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">IV Rank</p>
                    <p className="font-semibold">68%</p>
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold">$3,245.80</p>
                  <div className="flex items-center justify-end gap-1 text-sm text-green-500">
                    <TrendingUp className="w-4 h-4" />
                    <span>+2.4% (24h)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TradingView Chart */}
            <div className="flex-1 min-h-[400px] border border-border rounded-lg card-glass overflow-hidden">
              <TradingViewChart symbol={selectedAsset} className="h-full min-h-[400px]" />
            </div>

            {/* Open / Closed Positions (exchange-style) */}
            <div className="shrink-0 border border-border rounded-lg card-glass overflow-hidden flex flex-col min-h-[200px] max-h-[280px]">
              <div className="flex items-center border-b border-border bg-muted/20">
                <button
                  type="button"
                  onClick={() => setPositionsTab('open')}
                  className={cn(
                    'px-3 py-2 text-sm font-medium transition-colors',
                    positionsTab === 'open'
                      ? 'bg-background text-foreground border-b-2 border-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  )}
                >
                  Open Positions
                  {openPositions.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs font-normal">
                      {openPositions.length}
                    </Badge>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setPositionsTab('closed')}
                  className={cn(
                    'px-3 py-2 text-sm font-medium transition-colors',
                    positionsTab === 'closed'
                      ? 'bg-background text-foreground border-b-2 border-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  )}
                >
                  Closed Positions
                </button>
              </div>
              <div className="flex-1 overflow-auto p-1.5">
                {positionsTab === 'open' && (
                  <>
                    {openPositions.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No positions yet</p>
                    ) : (
                      <div className="min-w-[640px]">
                        <div className="text-[10px] text-muted-foreground grid grid-cols-[1fr_1fr_0.6fr_0.8fr_0.8fr_0.8fr_1fr_auto] gap-2 pb-2 border-b border-border mb-2">
                          <span>Instrument</span>
                          <span>Side</span>
                          <span className="text-right">Size</span>
                          <span className="text-right">Entry</span>
                          <span className="text-right">Mark</span>
                          <span className="text-right">Liq. Price</span>
                          <span className="text-right">Unrealized PnL</span>
                          <span className="w-20 text-right">Actions</span>
                        </div>
                        {openPositions.map((pos) => (
                          <div
                            key={pos.id}
                            className="text-xs grid grid-cols-[1fr_1fr_0.6fr_0.8fr_0.8fr_0.8fr_1fr_auto] gap-2 py-2 px-1 rounded border border-transparent hover:bg-muted/30 items-center"
                          >
                            <span className="font-medium">{pos.symbol} {formatExpiryShort(pos.expiry)} ${pos.strike} {pos.side}</span>
                            <span className={cn('uppercase', pos.side === 'call' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{pos.side}</span>
                            <span className="text-right">{pos.size}</span>
                            <span className="text-right">${pos.entryPrice.toFixed(2)}</span>
                            <span className="text-right">${pos.markPrice.toFixed(2)}</span>
                            <span className="text-right text-muted-foreground">{pos.liqPrice != null ? `$${pos.liqPrice}` : '—'}</span>
                            <span className={cn('text-right font-medium', pos.unrealizedPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                              {pos.unrealizedPnl >= 0 ? '+' : ''}${pos.unrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <div className="flex items-center justify-end gap-0.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-1.5 text-muted-foreground hover:text-destructive"
                                aria-label="Close position"
                                onClick={() => {
                                  setCloseModalPosition(pos);
                                  setCloseMode('full');
                                  setPartialCloseQty(String(pos.size > 1 ? 1 : 1));
                                }}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {positionsTab === 'closed' && (
                  <>
                    {closedPositions.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No closed positions yet</p>
                    ) : (
                      <div className="min-w-[640px]">
                        <div className="text-[10px] font-mono text-muted-foreground grid grid-cols-[1fr_1fr_0.6fr_0.8fr_0.8fr_1fr_1.2fr_auto] gap-2 pb-2 border-b border-border mb-2">
                          <span>Instrument</span>
                          <span>Side</span>
                          <span className="text-right">Size</span>
                          <span className="text-right">Entry</span>
                          <span className="text-right">Close</span>
                          <span className="text-right">Realized PnL</span>
                          <span>Closed</span>
                          <span className="w-10" />
                        </div>
                        {closedPositions.map((pos) => (
                          <div
                            key={pos.id}
                            className="text-xs font-mono grid grid-cols-[1fr_1fr_0.6fr_0.8fr_0.8fr_1fr_1.2fr_auto] gap-2 py-2 px-1 rounded border border-transparent hover:bg-muted/30 items-center"
                          >
                            <span className="font-medium">{pos.symbol} {formatExpiryShort(pos.expiry)} ${pos.strike} {pos.side}</span>
                            <span className={cn('uppercase', pos.side === 'call' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{pos.side}</span>
                            <span className="text-right">{pos.size}</span>
                            <span className="text-right">${pos.entryPrice.toFixed(2)}</span>
                            <span className="text-right">${pos.closePrice.toFixed(2)}</span>
                            <span className={cn('text-right font-medium', pos.realizedPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                              {pos.realizedPnl >= 0 ? '+' : ''}${pos.realizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-muted-foreground">{pos.closedAt}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-1.5 text-muted-foreground hover:text-foreground"
                              aria-label="View details"
                              onClick={() => setViewClosedId(pos.id)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Options Chain & Order Entry */}
          <div className="flex-1 lg:flex-[0.4] flex flex-col gap-2 min-w-0">
            {/* Options Chain */}
            <div className="flex-1 min-h-0 border border-border rounded-lg card-glass p-3 flex flex-col overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <h3 className="text-sm font-semibold">Options Chain</h3>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Options expiration date"
                    value={selectedExpiry}
                    onChange={(e) => {
                      setSelectedExpiry(e.target.value);
                      setSelectedOption(null);
                    }}
                    className="text-xs rounded border border-border bg-background/80 px-2 py-1.5 pr-6 appearance-none cursor-pointer"
                  >
                    {chainSnapshot.expirations.map((exp) => (
                      <option key={exp} value={exp}>
                        {formatExpiryLabel(exp)} ({formatExpiryShort(exp)})
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-0.5 rounded border border-border bg-muted/30 p-0.5">
                    <Button
                      variant={chainView === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setChainView('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={chainView === 'calls' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setChainView('calls')}
                    >
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Calls
                    </Button>
                    <Button
                      variant={chainView === 'puts' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setChainView('puts')}
                    >
                      <TrendingDown className="w-3 h-3 mr-1" />
                      Puts
                    </Button>
                  </div>
                </div>
              </div>

              {/* Compact underlying bar (pro-style) */}
              <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-0.5 py-1.5 px-2 rounded bg-muted/20 border border-border/50 mb-1">
                <span>{chainSnapshot.symbol}</span>
                <span>Last: <span className="text-foreground font-medium">${spot.toFixed(2)}</span></span>
                <span className="text-green-600 dark:text-green-400">Net Chg: +2.4%</span>
                <span>Bid: <span className="text-green-600 dark:text-green-400">$3,245.50</span></span>
                <span>Ask: <span className="text-red-600 dark:text-red-400">$3,246.10</span></span>
                <span>High: $3,285.20</span>
                <span>Low: $3,156.40</span>
                <span>Vol: $2.4B</span>
              </div>

              <div className="flex-1 overflow-auto">
                {chainView === 'all' && (
                  <div className="min-w-[640px]">
                    {/* Pro-style column order: CALLS Vol, Chg, Last, BidSz, AskSz, Bid, Ask, IV, Δ | STRIKE | PUTS Δ, IV, Bid, Ask, AskSz, BidSz, Last, Chg, Vol */}
                    <div className="text-[10px] text-muted-foreground grid grid-cols-[repeat(19,minmax(0,1fr))] gap-x-1 pb-1.5 border-b border-border sticky top-0 bg-card/95 z-10">
                      <span className="text-right truncate min-w-0" title="Vol">Vol</span>
                      <span className="text-right truncate min-w-0" title="Chg">Chg</span>
                      <span className="text-right truncate min-w-0" title="Last">Last</span>
                      <span className="text-right truncate min-w-0" title="Bid Sz">Bid Sz</span>
                      <span className="text-right truncate min-w-0" title="Ask Sz">Ask Sz</span>
                      <span className="text-right truncate min-w-0" title="Bid">Bid</span>
                      <span className="text-right truncate min-w-0" title="Ask">Ask</span>
                      <span className="text-right truncate min-w-0" title="IV">IV</span>
                      <span className="text-right truncate min-w-0" title="Δ">Δ</span>
                      <span className="text-center font-semibold truncate min-w-0" title="Strike">Strike</span>
                      <span className="text-left truncate min-w-0" title="Δ">Δ</span>
                      <span className="text-left truncate min-w-0" title="IV">IV</span>
                      <span className="text-left truncate min-w-0" title="Bid">Bid</span>
                      <span className="text-left truncate min-w-0" title="Ask">Ask</span>
                      <span className="text-left truncate min-w-0" title="Bid Sz">Bid Sz</span>
                      <span className="text-left truncate min-w-0" title="Ask Sz">Ask Sz</span>
                      <span className="text-left truncate min-w-0" title="Last">Last</span>
                      <span className="text-left truncate min-w-0" title="Chg">Chg</span>
                      <span className="text-left truncate min-w-0" title="Vol">Vol</span>
                    </div>
                    {(() => {
                      const atmStrike = chain.length
                        ? chain.reduce((best, r) =>
                            Math.abs(r.strike - spot) < Math.abs(best - spot) ? r.strike : best,
                          chain[0].strike)
                        : null;
                      return chain.map((row) => {
                        const callSelected =
                          selectedOption?.side === 'call' && selectedOption?.strike === row.strike;
                        const putSelected =
                          selectedOption?.side === 'put' && selectedOption?.strike === row.strike;
                        const isAtm = atmStrike !== null && row.strike === atmStrike;
                        const rowClick = (side: OptionSide) =>
                          setSelectedOption({ expiry: selectedExpiry, strike: row.strike, side, row });
                        return (
                          <div
                            key={row.strike}
                            className={cn(
                              'text-[11px] grid grid-cols-[repeat(19,minmax(0,1fr))] gap-x-1 py-1 px-1 rounded border border-transparent',
                              (callSelected || putSelected) && 'bg-primary/10 border-primary/30',
                              isAtm && !callSelected && !putSelected && 'bg-muted/40 border-muted'
                            )}
                          >
                            {/* Calls: Vol, Chg, Last, BidSz, AskSz, Bid, Ask, IV, Δ */}
                            <button onClick={() => rowClick('call')} className={cn('text-right py-0.5 rounded hover:bg-primary/5 text-muted-foreground', callSelected && 'ring-1 ring-primary/40')}>{row.call.volume}</button>
                            <button onClick={() => rowClick('call')} className={cn('text-right py-0.5 rounded hover:bg-primary/5', callSelected && 'ring-1 ring-primary/40', row.call.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{row.call.change >= 0 ? '+' : ''}{row.call.change.toFixed(2)}</button>
                            <button onClick={() => rowClick('call')} className={cn('text-right py-0.5 rounded hover:bg-primary/5', callSelected && 'ring-1 ring-primary/40')}>${row.call.last}</button>
                            <button onClick={() => rowClick('call')} className={cn('text-right py-0.5 rounded hover:bg-primary/5 text-muted-foreground', callSelected && 'ring-1 ring-primary/40')}>{row.call.bidSize}</button>
                            <button onClick={() => rowClick('call')} className={cn('text-right py-0.5 rounded hover:bg-primary/5 text-muted-foreground', callSelected && 'ring-1 ring-primary/40')}>{row.call.askSize}</button>
                            <button onClick={() => rowClick('call')} className={cn('text-right py-0.5 rounded hover:bg-primary/5 text-green-600 dark:text-green-400', callSelected && 'ring-1 ring-primary/40')}>${row.call.bid}</button>
                            <button onClick={() => rowClick('call')} className={cn('text-right py-0.5 rounded hover:bg-primary/5 text-red-600 dark:text-red-400', callSelected && 'ring-1 ring-primary/40')}>${row.call.ask}</button>
                            <button onClick={() => rowClick('call')} className={cn('text-right py-0.5 rounded hover:bg-primary/5 text-muted-foreground', callSelected && 'ring-1 ring-primary/40')}>{row.call.iv}%</button>
                            <button onClick={() => rowClick('call')} className={cn('text-right py-0.5 rounded hover:bg-primary/5 text-muted-foreground', callSelected && 'ring-1 ring-primary/40')}>{row.call.delta}</button>
                            <span className="text-center font-semibold py-0.5">${row.strike}</span>
                            {/* Puts: Δ, IV, Bid, Ask, BidSz, AskSz, Last, Chg, Vol */}
                            <button onClick={() => rowClick('put')} className={cn('text-left py-0.5 rounded hover:bg-primary/5 text-muted-foreground', putSelected && 'ring-1 ring-primary/40')}>{row.put.delta}</button>
                            <button onClick={() => rowClick('put')} className={cn('text-left py-0.5 rounded hover:bg-primary/5 text-muted-foreground', putSelected && 'ring-1 ring-primary/40')}>{row.put.iv}%</button>
                            <button onClick={() => rowClick('put')} className={cn('text-left py-0.5 rounded hover:bg-primary/5 text-green-600 dark:text-green-400', putSelected && 'ring-1 ring-primary/40')}>${row.put.bid}</button>
                            <button onClick={() => rowClick('put')} className={cn('text-left py-0.5 rounded hover:bg-primary/5 text-red-600 dark:text-red-400', putSelected && 'ring-1 ring-primary/40')}>${row.put.ask}</button>
                            <button onClick={() => rowClick('put')} className={cn('text-left py-0.5 rounded hover:bg-primary/5 text-muted-foreground', putSelected && 'ring-1 ring-primary/40')}>{row.put.bidSize}</button>
                            <button onClick={() => rowClick('put')} className={cn('text-left py-0.5 rounded hover:bg-primary/5 text-muted-foreground', putSelected && 'ring-1 ring-primary/40')}>{row.put.askSize}</button>
                            <button onClick={() => rowClick('put')} className={cn('text-left py-0.5 rounded hover:bg-primary/5', putSelected && 'ring-1 ring-primary/40')}>${row.put.last}</button>
                            <button onClick={() => rowClick('put')} className={cn('text-left py-0.5 rounded hover:bg-primary/5', putSelected && 'ring-1 ring-primary/40', row.put.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{row.put.change >= 0 ? '+' : ''}{row.put.change.toFixed(2)}</button>
                            <button onClick={() => rowClick('put')} className={cn('text-left py-0.5 rounded hover:bg-primary/5 text-muted-foreground', putSelected && 'ring-1 ring-primary/40')}>{row.put.volume}</button>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

                {(chainView === 'calls' || chainView === 'puts') && (
                  <div className="min-w-[520px]">
                    <div className="text-[10px] text-muted-foreground grid grid-cols-11 gap-1 pb-1.5 border-b border-border sticky top-0 bg-card/95 z-10">
                      <span className="truncate min-w-0" title="Strike">Strike</span>
                      <span className="text-right truncate min-w-0" title="Bid">Bid</span>
                      <span className="text-right truncate min-w-0" title="Ask">Ask</span>
                      <span className="text-right truncate min-w-0" title="Last">Last</span>
                      <span className="text-right truncate min-w-0" title="Chg">Chg</span>
                      <span className="text-right truncate min-w-0" title="Vol">Vol</span>
                      <span className="text-right truncate min-w-0" title="Bid Sz">Bid Sz</span>
                      <span className="text-right truncate min-w-0" title="Ask Sz">Ask Sz</span>
                      <span className="text-right truncate min-w-0" title="OI">OI</span>
                      <span className="text-right truncate min-w-0" title="IV">IV</span>
                      <span className="text-right truncate min-w-0" title="Δ">Δ</span>
                    </div>
                    {chain.map((row) => {
                      const q = chainView === 'calls' ? row.call : row.put;
                      const side: OptionSide = chainView === 'calls' ? 'call' : 'put';
                      const isSelected =
                        selectedOption?.strike === row.strike && selectedOption?.side === side;
                      const atmStrike = chain.length ? chain.reduce((best, r) => Math.abs(r.strike - spot) < Math.abs(best - spot) ? r.strike : best, chain[0].strike) : null;
                      const isAtm = atmStrike !== null && row.strike === atmStrike;
                      return (
                        <button
                          key={row.strike}
                          onClick={() =>
                            setSelectedOption({
                              expiry: selectedExpiry,
                              strike: row.strike,
                              side,
                              row,
                            })
                          }
                          className={cn(
                            'w-full text-[11px] grid grid-cols-11 gap-1 py-2 px-2 rounded border border-transparent hover:bg-primary/5 text-left',
                            isSelected && 'bg-primary/10 border-primary/30',
                            isAtm && !isSelected && 'bg-muted/40'
                          )}
                        >
                          <span className="font-semibold">${row.strike}</span>
                          <span className="text-right text-green-600 dark:text-green-400">${q.bid}</span>
                          <span className="text-right text-red-600 dark:text-red-400">${q.ask}</span>
                          <span className="text-right">${q.last}</span>
                          <span className={cn('text-right', q.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{q.change >= 0 ? '+' : ''}{q.change.toFixed(2)}</span>
                          <span className="text-right text-muted-foreground">{q.volume}</span>
                          <span className="text-right text-muted-foreground">{q.bidSize}</span>
                          <span className="text-right text-muted-foreground">{q.askSize}</span>
                          <span className="text-right text-muted-foreground">{q.openInterest}</span>
                          <span className="text-right">{q.iv}%</span>
                          <span className="text-right">{q.delta}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Order Entry Panel */}
            <div className="border border-border rounded-lg card-glass p-3 shrink-0">
              <h3 className="text-sm font-semibold mb-2">Place Order</h3>
              {selectedOption && (
                <p className="text-xs text-muted-foreground mb-2 font-mono">
                  {chainSnapshot.symbol} {formatExpiryLabel(selectedOption.expiry)} ${selectedOption.strike}{' '}
                  {selectedOption.side === 'call' ? 'Call' : 'Put'}
                </p>
              )}
              <div className="space-y-3">
                <fieldset className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 items-center border-0 p-0 m-0">
                  <legend className="col-span-2 text-xs text-muted-foreground mb-0.5">Side</legend>
                  <div className="col-start-2 flex items-center gap-0 rounded-lg border border-border bg-muted/30 p-0.5" role="tablist" aria-label="Side">
                    <button
                      type="button"
                      role="tab"
                      onClick={() => setOrderSide('buy')}
                      aria-selected={orderSide === 'buy' ? 'true' : 'false'}
                      className={cn(
                        'relative z-0 flex-1 min-w-0 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                        orderSide === 'buy' ? 'text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      {orderSide === 'buy' && (
                        <motion.div
                          layoutId="place-order-side-pill"
                          transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                          className="absolute inset-0 rounded-md bg-green-600"
                          style={{ zIndex: -1 }}
                        />
                      )}
                      <span className="relative">Buy</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      onClick={() => setOrderSide('sell')}
                      aria-selected={orderSide === 'sell' ? 'true' : 'false'}
                      className={cn(
                        'relative z-0 flex-1 min-w-0 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                        orderSide === 'sell' ? 'text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      {orderSide === 'sell' && (
                        <motion.div
                          layoutId="place-order-side-pill"
                          transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                          className="absolute inset-0 rounded-md bg-red-600"
                          style={{ zIndex: -1 }}
                        />
                      )}
                      <span className="relative">Sell</span>
                    </button>
                  </div>
                </fieldset>

                <fieldset className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 items-center border-0 p-0 m-0">
                  <legend className="col-span-2 text-xs text-muted-foreground mb-0.5">Order Type</legend>
                  <div className="col-start-2 flex items-center gap-0 rounded-lg border border-border bg-muted/30 p-0.5" role="tablist" aria-label="Order Type">
                    <button
                      type="button"
                      role="tab"
                      onClick={() => setOrderType('limit')}
                      aria-selected={orderType === 'limit' ? 'true' : 'false'}
                      className={cn(
                        'relative z-0 flex-1 min-w-0 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                        orderType === 'limit' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      {orderType === 'limit' && (
                        <motion.div
                          layoutId="place-order-type-pill"
                          transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                          className="absolute inset-0 rounded-md bg-primary"
                          style={{ zIndex: -1 }}
                        />
                      )}
                      <span className="relative">Limit</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      onClick={() => setOrderType('market')}
                      aria-selected={orderType === 'market' ? 'true' : 'false'}
                      className={cn(
                        'relative z-0 flex-1 min-w-0 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                        orderType === 'market' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      {orderType === 'market' && (
                        <motion.div
                          layoutId="place-order-type-pill"
                          transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                          className="absolute inset-0 rounded-md bg-primary"
                          style={{ zIndex: -1 }}
                        />
                      )}
                      <span className="relative">Market</span>
                    </button>
                  </div>
                </fieldset>

                <div className="space-y-1">
                  <label htmlFor="order-quantity" className="block text-xs text-muted-foreground">Quantity (contracts)</label>
                  <input
                    id="order-quantity"
                    type="number"
                    min={0.01}
                    step={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded border border-border bg-background/50"
                    placeholder="1"
                  />
                </div>

                {orderType === 'limit' ? (
                  <div className="space-y-1">
                    <label htmlFor="order-limit-price" className="block text-xs text-muted-foreground">Limit Price ($ per contract)</label>
                    <input
                      id="order-limit-price"
                      type="number"
                      min={0}
                      step={0.01}
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      placeholder={defaultLimit ? defaultLimit.toFixed(2) : '0.00'}
                      className="w-full px-3 py-2 text-sm rounded border border-border bg-background/50"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="block text-xs text-muted-foreground">Market</span>
                    <p className="px-3 py-2 text-sm rounded border border-border bg-muted/30 text-muted-foreground" aria-live="polite">
                      Fill at best available {orderSide === 'buy' ? 'ask' : 'bid'} (~${defaultLimit ? defaultLimit.toFixed(2) : '—'})
                    </p>
                  </div>
                )}

                {estCost && (
                  <div className="text-xs text-muted-foreground space-y-1 rounded-md border border-border bg-muted/20 p-2">
                    <p className="font-medium text-foreground mb-1">Est. cost</p>
                    <div className="flex justify-between">
                      <span>Premium (×{CONTRACT_MULTIPLIER})</span>
                      <span className="">${estCost.premium.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Est. reg. fee</span>
                      <span className="">${estCost.regFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Exchange fee</span>
                      <span className="">${estCost.exchangeFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contract fee</span>
                      <span className="">${estCost.contractFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border font-medium text-foreground">
                      <span>Total est.</span>
                      <span className="">${estCost.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  disabled={!selectedOption}
                  onClick={() => {
                    if (!busRef.current || !selectedOption) return;
                    const symbol = typeof selectedAsset === 'string' ? selectedAsset : (selectedAsset as { symbol?: string })?.symbol ?? 'UNKNOWN';
                    busRef.current.publish('trading.intent', {
                      intent: 'open',
                      symbol,
                      details: {
                        expiry: selectedOption.expiry,
                        strike: selectedOption.strike,
                        side: selectedOption.side,
                        orderSide,
                        quantity: quantity,
                        orderType,
                        limitPrice: orderType === 'limit' ? limitPrice : undefined,
                      },
                    });
                  }}
                >
                  {orderType === 'market' ? 'Place Market Order' : 'Place Limit Order'}
                </Button>

                <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-border">
                  {orderGreeks ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span>Max Profit</span>
                        <span className={cn('font-semibold', orderGreeks.maxProfitUnlimited ? 'text-foreground' : 'text-green-600 dark:text-green-400')}>
                          {orderGreeks.maxProfitUnlimited ? 'Unlimited' : `$${orderGreeks.maxProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Breakeven</span>
                        <span className="font-semibold text-foreground">${orderGreeks.breakeven.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Max Loss</span>
                        <span className={cn('font-semibold', orderGreeks.maxLossUnlimited ? 'text-red-600 dark:text-red-400' : 'text-red-600 dark:text-red-400')}>
                          {orderGreeks.maxLossUnlimited ? 'Unlimited' : `$${orderGreeks.maxLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span>Max Profit</span>
                        <span className="">—</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Breakeven</span>
                        <span className="">—</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Max Loss</span>
                        <span className="">—</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </main>

      {/* Footer - wrapped card to match page content pattern */}
      <div className="px-2 pb-2 shrink-0">
        <footer className="rounded-lg border border-border card-glass px-3 py-2 w-full">
          <div className="w-full flex items-center justify-between">
            <p className="text-xs text-muted-foreground">© Monad Blitz Denver</p>
            <ThemeToggle />
          </div>
        </footer>
      </div>

      {/* Close position modal */}
      {closeModalPosition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="close-modal-title">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-sm w-full p-4">
            <h2 id="close-modal-title" className="text-sm font-semibold mb-2">Close position</h2>
            <p className="text-xs text-muted-foreground mb-3">
              {closeModalPosition.symbol} {formatExpiryShort(closeModalPosition.expiry)} ${closeModalPosition.strike} {closeModalPosition.side} · Size {closeModalPosition.size}
            </p>
            <div className="space-y-3 mb-4">
              <div className="flex gap-2">
                <Button
                  variant={closeMode === 'full' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setCloseMode('full')}
                >
                  Close full
                </Button>
                <Button
                  variant={closeMode === 'partial' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setCloseMode('partial')}
                  disabled={closeModalPosition.size < 2}
                >
                  Close partial
                </Button>
              </div>
              {closeMode === 'partial' && (
                <div>
                  <label id="partial-close-qty-label" className="text-xs text-muted-foreground">Contracts to close</label>
                  <input
                    id="partial-close-qty"
                    type="number"
                    min={1}
                    max={closeModalPosition.size}
                    value={partialCloseQty}
                    onChange={(e) => setPartialCloseQty(e.target.value)}
                    aria-labelledby="partial-close-qty-label"
                    title="Contracts to close"
                    placeholder={`1–${closeModalPosition.size}`}
                    className="w-full mt-1 px-3 py-2 text-sm font-mono rounded border border-border bg-background/50"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Max {closeModalPosition.size}</p>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                Est. close at ${closeModalPosition.markPrice.toFixed(2)} · Unrealized PnL: {closeModalPosition.unrealizedPnl >= 0 ? '+' : ''}${closeModalPosition.unrealizedPnl.toFixed(2)}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setCloseModalPosition(null); setCloseMode('full'); setPartialCloseQty('1'); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={confirmClosePosition} className="bg-red-600 hover:bg-red-700">
                Confirm close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View closed position modal */}
      {viewClosedId && (() => {
        const pos = closedPositions.find((p) => p.id === viewClosedId);
        if (!pos) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="view-closed-title">
            <div className="bg-card border border-border rounded-lg shadow-lg max-w-sm w-full p-4">
              <h2 id="view-closed-title" className="text-sm font-semibold mb-3">Closed position details</h2>
              <dl className="text-xs space-y-2 font-mono">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Instrument</dt>
                  <dd>{pos.symbol} {formatExpiryShort(pos.expiry)} ${pos.strike} {pos.side}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Size</dt>
                  <dd>{pos.size}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Entry</dt>
                  <dd>${pos.entryPrice.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Close price</dt>
                  <dd>${pos.closePrice.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Realized PnL</dt>
                  <dd className={cn('font-medium', pos.realizedPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                    {pos.realizedPnl >= 0 ? '+' : ''}${pos.realizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Closed at</dt>
                  <dd>{pos.closedAt}</dd>
                </div>
              </dl>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setViewClosedId(null)}>Close</Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
