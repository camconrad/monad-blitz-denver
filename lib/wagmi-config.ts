/**
 * Wagmi + RainbowKit config.
 * Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local (get one at https://cloud.reown.com).
 * Add your production domain to the project Allowlist to avoid 403 from pulse.walletconnect.org.
 */
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { monadTestnet } from 'viem/chains';

export const config = getDefaultConfig({
  appName: 'Monad Options',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'e523222a9cef75442658dc95523fcac1',
  chains: [monadTestnet],
  ssr: true,
});
