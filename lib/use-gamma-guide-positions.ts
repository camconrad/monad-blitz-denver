'use client';

import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { getGammaGuideAddress } from '@/lib/gamma-guide-address';
import { gammaGuideAbi } from '@/lib/abi/gamma-guide';
import { FEED_TO_SYMBOL } from '@/lib/chainlink-monad';

const QUOTE_DECIMALS = 6;

export type ChainOption = {
  optionId: number;
  underlyingFeed: string;
  optionType: number; // 0 Call, 1 Put
  strikePrice: bigint;
  expiryTs: number;
  buyer: string;
  premiumPaid: bigint;
  settled: boolean;
  payoutAmount: bigint;
};

function formatExpiryFromTs(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toISOString().slice(0, 10);
}

function formatClosedAtFromTs(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export type OpenPositionFromChain = {
  id: string;
  optionId: number;
  symbol: string;
  expiry: string;
  strike: number;
  side: 'call' | 'put';
  size: number;
  entryPrice: number;
  markPrice: number;
  liqPrice: number | null;
  unrealizedPnl: number;
  expiryTs: number;
  canSettle: boolean;
};

export type ClosedPositionFromChain = {
  id: string;
  optionId: number;
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

export function useGammaGuidePositions(): {
  open: OpenPositionFromChain[];
  closed: ClosedPositionFromChain[];
  isLoading: boolean;
  refetch: () => void;
} {
  const address = getGammaGuideAddress();
  const { address: userAddress } = useAccount();

  const { data: optionIds, refetch: refetchIds } = useReadContract({
    address: address ?? undefined,
    abi: gammaGuideAbi,
    functionName: 'getOptionIdsByBuyer',
    args: userAddress ? [userAddress] : undefined,
  });

  const ids = optionIds ?? [];
  const contracts = address && ids.length > 0
    ? ids.map((id) => ({
        address,
        abi: gammaGuideAbi,
        functionName: 'options' as const,
        args: [id] as [bigint],
      }))
    : [];

  const { data: optionsResults, refetch: refetchOptions } = useReadContracts({
    contracts,
  });

  const refetch = () => {
    refetchIds();
    refetchOptions();
  };

  const now = Math.floor(Date.now() / 1000);
  const open: OpenPositionFromChain[] = [];
  const closed: ClosedPositionFromChain[] = [];

  if (optionsResults?.length) {
    optionsResults.forEach((res, i) => {
      if (res.status !== 'success' || !res.result) return;
      const id = Number(ids[i]);
      const [underlyingFeed, optionType, strikePrice, expiryTs, buyer, premiumPaid, settled, payoutAmount] = res.result as readonly [string, number, bigint, bigint, string, bigint, boolean, bigint];
      const expiryStr = formatExpiryFromTs(Number(expiryTs));
      const symbol = FEED_TO_SYMBOL[underlyingFeed.toLowerCase()] ?? '?';
      const strike = Number(strikePrice) / 1e8;
      const side = optionType === 0 ? 'call' : 'put';
      const size = 1;
      const entryPrice = Number(premiumPaid) / 10 ** QUOTE_DECIMALS / size;

      if (settled) {
        const payout = Number(payoutAmount) / 10 ** QUOTE_DECIMALS;
        closed.push({
          id: `chain-${id}`,
          optionId: id,
          symbol,
          expiry: expiryStr,
          strike,
          side,
          size,
          entryPrice,
          closePrice: payout / size,
          realizedPnl: payout - entryPrice * size,
          closedAt: 'Settled',
        });
      } else {
        const canSettle = now >= Number(expiryTs);
        open.push({
          id: `chain-${id}`,
          optionId: id,
          symbol,
          expiry: expiryStr,
          strike,
          side,
          size,
          entryPrice,
          markPrice: 0,
          liqPrice: null,
          unrealizedPnl: 0,
          expiryTs: Number(expiryTs),
          canSettle,
        });
      }
    });
  }

  const isLoading = userAddress && address && optionIds && optionsResults === undefined;

  return {
    open,
    closed,
    isLoading: !!isLoading,
    refetch,
  };
}
