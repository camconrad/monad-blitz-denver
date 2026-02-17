'use client';

import { useState, useMemo, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, X, Eye } from 'lucide-react';
import { CoachTradeTabs } from '@/components/coach-trade-tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
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

const INITIAL_OPEN: OpenPosition[] = [
  { id: '1', symbol: 'ETH', expiry: '2025-03-28', strike: 3400, side: 'call', size: 2, entryPrice: 42.50, markPrice: 48.20, liqPrice: null, unrealizedPnl: 1140 },
  { id: '2', symbol: 'ETH', expiry: '2025-04-25', strike: 3200, side: 'put', size: 1, entryPrice: 85.00, markPrice: 78.40, liqPrice: null, unrealizedPnl: -660 },
];

const INITIAL_CLOSED: ClosedPosition[] = [
  { id: 'c1', symbol: 'ETH', expiry: '2025-02-21', strike: 3300, side: 'call', size: 1, entryPrice: 55.00, closePrice: 72.50, realizedPnl: 1750, closedAt: '2025-02-17 14:32' },
  { id: 'c2', symbol: 'ETH', expiry: '2025-02-14', strike: 3100, side: 'put', size: 2, entryPrice: 22.00, closePrice: 18.20, realizedPnl: -760, closedAt: '2025-02-15 09:15' },
];

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
              <Activity className="w-3 h-3 mr-1" />
              LIVE
            </Badge>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Portfolio Value</p>
              <p className="text-sm font-semibold">$125,430.50</p>
            </div>
          </div>
        </div>
        </header>
      </div>

      {/* Main Trading Interface */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row gap-2 p-2">
          {/* Left Column - Market Data & Chart */}
          <div className="flex-1 lg:flex-[0.6] flex flex-col gap-2">
            {/* Asset Selector & Price */}
            <div className="border border-border rounded-lg card-glass p-3">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">Ξ</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedAsset}</h2>
                    <p className="text-xs text-muted-foreground">Ethereum / US Dollar</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">24h High</p>
                    <p className="font-semibold">$3,285.20</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">24h Low</p>
                    <p className="font-semibold">$3,156.40</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Volume</p>
                    <p className="font-semibold">$2.4B</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">IV Rank</p>
                    <p className="font-semibold">68%</p>
                  </div>
                </div>
                
                <div className="text-right">
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
                      <p className="text-sm text-muted-foreground py-8 text-center">No open positions</p>
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
                      <p className="text-sm text-muted-foreground py-8 text-center">No closed positions</p>
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
                      <span className="text-right">Vol</span>
                      <span className="text-right">Chg</span>
                      <span className="text-right">Last</span>
                      <span className="text-right">Bid Sz</span>
                      <span className="text-right">Ask Sz</span>
                      <span className="text-right">Bid</span>
                      <span className="text-right">Ask</span>
                      <span className="text-right">IV</span>
                      <span className="text-right">Δ</span>
                      <span className="text-center font-semibold">Strike</span>
                      <span className="text-left">Δ</span>
                      <span className="text-left">IV</span>
                      <span className="text-left">Bid</span>
                      <span className="text-left">Ask</span>
                      <span className="text-left">Bid Sz</span>
                      <span className="text-left">Ask Sz</span>
                      <span className="text-left">Last</span>
                      <span className="text-left">Chg</span>
                      <span className="text-left">Vol</span>
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
                      <span>Strike</span>
                      <span className="text-right">Bid</span>
                      <span className="text-right">Ask</span>
                      <span className="text-right">Last</span>
                      <span className="text-right">Chg</span>
                      <span className="text-right">Vol</span>
                      <span className="text-right">Bid Sz</span>
                      <span className="text-right">Ask Sz</span>
                      <span className="text-right">OI</span>
                      <span className="text-right">IV</span>
                      <span className="text-right">Δ</span>
                    </div>
                    {chain.map((row) => {
                      const q = chainView === 'calls' ? row.call : row.put;
                      const isSelected =
                        selectedOption?.strike === row.strike && selectedOption?.side === chainView;
                      const atmStrike = chain.length ? chain.reduce((best, r) => Math.abs(r.strike - spot) < Math.abs(best - spot) ? r.strike : best, chain[0].strike) : null;
                      const isAtm = atmStrike !== null && row.strike === atmStrike;
                      return (
                        <button
                          key={row.strike}
                          onClick={() =>
                            setSelectedOption({
                              expiry: selectedExpiry,
                              strike: row.strike,
                              side: chainView,
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
              <div className="space-y-2">
                <fieldset className="space-y-1 border-0 p-0 m-0">
                  <legend className="text-xs text-muted-foreground">Side</legend>
                  <div className="flex gap-2 pl-3 mt-0.5" role="group" aria-label="Side">
                    <Button
                      type="button"
                      variant={orderSide === 'buy' ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'flex-1 text-xs',
                        orderSide === 'buy' && 'bg-green-600 hover:bg-green-700 text-white'
                      )}
                      onClick={() => setOrderSide('buy')}
                      aria-pressed={orderSide === 'buy'}
                    >
                      Buy
                    </Button>
                    <Button
                      type="button"
                      variant={orderSide === 'sell' ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'flex-1 text-xs',
                        orderSide === 'sell' && 'bg-red-600 hover:bg-red-700 text-white'
                      )}
                      onClick={() => setOrderSide('sell')}
                      aria-pressed={orderSide === 'sell'}
                    >
                      Sell
                    </Button>
                  </div>
                </fieldset>

                <fieldset className="space-y-1 border-0 p-0 m-0">
                  <legend className="text-xs text-muted-foreground">Order Type</legend>
                  <div className="flex gap-2 pl-3 mt-0.5" role="group" aria-label="Order Type">
                    <Button
                      type="button"
                      variant={orderType === 'limit' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setOrderType('limit')}
                      aria-pressed={orderType === 'limit'}
                    >
                      Limit
                    </Button>
                    <Button
                      type="button"
                      variant={orderType === 'market' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setOrderType('market')}
                      aria-pressed={orderType === 'market'}
                    >
                      Market
                    </Button>
                  </div>
                </fieldset>

                <div>
                  <label htmlFor="order-quantity" className="text-xs text-muted-foreground">Quantity (contracts)</label>
                  <input
                    id="order-quantity"
                    type="number"
                    min={0.01}
                    step={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm rounded border border-border bg-background/50"
                    placeholder="1"
                  />
                </div>

                {orderType === 'limit' ? (
                  <div>
                    <label htmlFor="order-limit-price" className="text-xs text-muted-foreground">Limit Price ($ per contract)</label>
                    <input
                      id="order-limit-price"
                      type="number"
                      min={0}
                      step={0.01}
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      placeholder={defaultLimit ? defaultLimit.toFixed(2) : '0.00'}
                      className="w-full mt-1 px-3 py-2 text-sm rounded border border-border bg-background/50"
                    />
                  </div>
                ) : (
                  <div>
                    <span className="text-xs text-muted-foreground">Market</span>
                    <p className="mt-1 px-3 py-2 text-sm rounded border border-border bg-muted/30 text-muted-foreground" aria-live="polite">
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

                <Button className="w-full" size="lg" disabled={!selectedOption}>
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
