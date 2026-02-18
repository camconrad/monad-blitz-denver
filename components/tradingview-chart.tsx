'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

const WIDGET_SCRIPT_URL =
  'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';

/**
 * Map app symbol (e.g. MON-USD) to TradingView symbol.
 * Uses Coinbase (not Binance). TradingView does not yet support Monad DEXes
 * (e.g. Monday Trade, Atlantis); options settle via Chainlink on Monad.
 */
function getTradingViewSymbol(asset: string): string {
  const normalized = asset.replace('-', '');
  if (asset.startsWith('ETH')) return `COINBASE:ETHUSD`;
  if (asset.startsWith('BTC')) return `COINBASE:BTCUSD`;
  if (asset.startsWith('MON')) return `COINBASE:MONUSD`;
  return `COINBASE:${normalized}USD`;
}

export interface TradingViewChartProps {
  /** Symbol in app format, e.g. ETH-USD */
  symbol: string;
  /** Optional height (default fills container). Min 500px recommended per TradingView best practices. */
  className?: string;
  /** Locale for the chart (default: en). Use to localize per best practices. */
  locale?: string;
}

/**
 * Embeds TradingView Advanced Chart widget (iframe).
 * Respects app theme and resizes with container.
 * Best practices: see TRADINGVIEW.md (chart size ≥500px, keep features separate, localize).
 * @see https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/
 * @see https://www.tradingview.com/charting-library-docs/latest/getting_started/
 */
export function TradingViewChart({
  symbol,
  className = '',
  locale = 'en',
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const tvSymbol = getTradingViewSymbol(symbol);
  const colorTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = 'calc(100% - 32px)';
    widgetDiv.style.width = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = WIDGET_SCRIPT_URL;
    script.async = true;
    script.type = 'text/javascript';

    const config = {
      autosize: true,
      symbol: tvSymbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: colorTheme,
      style: '1',
      locale,
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    };

    script.textContent = JSON.stringify(config);
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [tvSymbol, colorTheme, locale]);

  return (
    <div
      ref={containerRef}
      className={`tradingview-widget-container h-full min-h-[500px] w-full ${className}`}
    />
  );
}
