#!/usr/bin/env node
/**
 * Run Forge deploy script with env from .env.local.
 * Requires: Foundry (forge) installed. Set DEPLOYER_PRIVATE_KEY and optionally MONAD_RPC_URL in .env.local.
 *
 * Usage: node scripts/deploy-contract.mjs
 * Or:    yarn deploy:contract
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env.local');

function loadEnv() {
  const env = { ...process.env };
  if (!existsSync(envPath)) return env;
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      const key = m[1];
      let raw = m[2].trim();
      if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1).replace(/\\"/g, '"');
      else raw = raw.replace(/#.*$/, '').trim();
      env[key] = raw;
    }
  }
  return env;
}

const env = loadEnv();
if (!env.DEPLOYER_PRIVATE_KEY) {
  console.error('Missing DEPLOYER_PRIVATE_KEY in .env.local');
  process.exit(1);
}
if (!env.MONAD_RPC_URL) {
  env.MONAD_RPC_URL = 'https://testnet-rpc.monad.xyz';
  console.log('Using default MONAD_RPC_URL:', env.MONAD_RPC_URL);
}

const r = spawnSync('forge', [
  'script',
  'script/Deploy.s.sol',
  '--rpc-url', 'monad',
  '--broadcast',
], {
  cwd: root,
  env,
  stdio: 'inherit',
});

process.exit(r.status ?? 1);