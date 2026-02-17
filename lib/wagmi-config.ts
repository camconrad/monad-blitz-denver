/**
 * Wagmi + RainbowKit config.
 * Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local (get one at https://cloud.walletconnect.com/).
 */
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { monadTestnet } from 'viem/chains';

export const config = getDefaultConfig({
  appName: 'Monad Options',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'YOUR_PROJECT_ID',
  chains: [monadTestnet],
  ssr: true,
});
