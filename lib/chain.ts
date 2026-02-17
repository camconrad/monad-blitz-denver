/**
 * Monad Testnet — network configuration for this app.
 * Used for wallet/chain integration (e.g. wagmi/viem) and display.
 *
 * Network details:
 * - RPC URL: https://testnet-rpc.monad.xyz
 * - Chain ID: 10143
 * - Currency: MON
 * - Block Explorer: https://testnet.monadvision.com
 */

export const MONAD_TESTNET_CHAIN_ID = 10143 as const;
export const MONAD_TESTNET_CURRENCY_SYMBOL = 'MON' as const;
export const MONAD_TESTNET_EXPLORER_URL = 'https://testnet.monadvision.com' as const;

const defaultRpcUrl = 'https://testnet-rpc.monad.xyz';

/** RPC URL for Monad Testnet (override via NEXT_PUBLIC_MONAD_TESTNET_RPC_URL). */
export const MONAD_TESTNET_RPC_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_MONAD_TESTNET_RPC_URL) ||
  defaultRpcUrl;

/** Monad Testnet config object for use with wagmi/viem or other chain consumers. */
export const monadTestnet = {
  id: MONAD_TESTNET_CHAIN_ID,
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: MONAD_TESTNET_CURRENCY_SYMBOL,
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [MONAD_TESTNET_RPC_URL] },
  },
  blockExplorers: {
    default: {
      name: 'MonadVision',
      url: MONAD_TESTNET_EXPLORER_URL,
    },
  },
} as const;

export default monadTestnet;
