#!/usr/bin/env node
/**
 * Verify GammaGuide on Monad (Sourcify via Block Vision).
 * Usage: yarn verify:contract <DEPLOYED_ADDRESS>
 * Example: yarn verify:contract 0x1234...abcd
 */
import { spawnSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const address = process.argv[2];
if (!address || !address.startsWith('0x')) {
  console.error('Usage: yarn verify:contract <DEPLOYED_ADDRESS>');
  console.error('Example: yarn verify:contract 0x1234...abcd');
  process.exit(1);
}

// Monad Testnet: matches official guide (--chain 10143, Sourcify Block Vision)
// --rpc-url needed for standard Foundry; omit if using foundry-monad template
const r = spawnSync(
  'forge',
  [
    'verify-contract',
    address,
    'contracts/GammaGuide.sol:GammaGuide',
    '--chain', '10143',
    '--verifier', 'sourcify',
    '--verifier-url', 'https://sourcify-api-monad.blockvision.org/',
    '--rpc-url', 'https://testnet-rpc.monad.xyz',
  ],
  { cwd: root, stdio: 'inherit' }
);

process.exit(r.status ?? 1);
