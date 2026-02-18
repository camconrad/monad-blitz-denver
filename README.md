# Monad Options

**AI-powered voice trading assistant for European vanilla options.** Ask in plain English, get guidance, and trade on Monad Testnet.

---

## What’s done and verified

| Area | Status | Notes |
|------|--------|--------|
| **Pages** | ✅ | Home (`/`), Coach (`/coach`), Guide (`/guide`), Trade (`/trade`). Tabs: Guide ↔ Trade. Layout: consistent 8px gap (pt-2 / px-2 / pb-2); side padding not overridden (safe-area on `<body>` only). |
| **Voice (Gamma Guide)** | ✅ | Convex backend: session → Gemini → ElevenLabs TTS. Optional WebSocket (`NEXT_PUBLIC_VOICE_WS_URL`). Guide page: record → POST `/api/voice` → real-time transcript + coach response. BroadcastChannel bus for cross-tab (Coach ↔ Trade). |
| **Options trading (Trade page)** | ✅ | MON-USD chain; live spot from CoinGecko (`/api/price/monad`). Options chain (calls/puts), order panel (buy/sell, limit/market), TradingView chart. |
| **Contract (GammaGuide)** | ✅ | Deployed on Monad Testnet. Trade page wired: positions from chain, `buyOption`, `settle`. Set `NEXT_PUBLIC_GAMMA_GUIDE_ADDRESS` after deploy. |
| **Price APIs** | ✅ | `/api/price` (multi-coin); `/api/price/monad` (MON markets). Timeouts + 502/500. Optional `COINGECKO_API_KEY` for higher rate limits. Guide Spot row shows “Live (CoinGecko)” from MON market data only. |
| **Wallet** | ✅ | RainbowKit + Wagmi; Monad Testnet (Chain ID 10143). WalletConnect: `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. |
| **Security** | ✅ | API keys server-side (Convex, Next API). Security headers in `next.config.ts`. No keys in contract. |
| **Errors / resilience** | ✅ | `error.tsx`, `global-error.tsx`, `not-found.tsx`. Voice/price errors surfaced in UI. |
| **Tests** | ✅ | `yarn test`: Forge contract tests (16) + integration (CoinGecko, ElevenLabs; optional `BASE_URL` for `/api/price/monad`). |

---

## Quick start

```bash
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

**Network:** Monad Testnet (Chain ID `10143`, RPC `https://testnet-rpc.monad.xyz`). Config: `lib/chain.ts`.

**Voice:** Convex (recommended). Run `npx convex dev`, set `NEXT_PUBLIC_CONVEX_URL` in `.env.local`. Convex env: `GEMINI_API_KEY`, `ELEVEN_LABS_API_KEY`. Or set `NEXT_PUBLIC_VOICE_WS_URL` for your own WebSocket backend.

**Contract:** After `yarn deploy:contract`, set `NEXT_PUBLIC_GAMMA_GUIDE_ADDRESS` in `.env.local` (and in Vercel for production). See [DEPLOY.md](./DEPLOY.md).

Copy [.env.example](./.env.example) to `.env.local` and fill required values.

---

## Deployed and wired

- **GammaGuide:** Deployed on Monad Testnet. Current address in [DEPLOY.md](./DEPLOY.md); set as `NEXT_PUBLIC_GAMMA_GUIDE_ADDRESS`. Trade page uses it for positions, `buyOption`, and `settle`. Quote token (testnet USDC) funded for payouts.
- **Convex:** Voice backend; HTTP action `/api/voice`; env in Convex dashboard.
- **Vercel:** Frontend + API routes. Env: `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_GAMMA_GUIDE_ADDRESS`; optional `COINGECKO_API_KEY`.

---

## Tested

| Command | What it runs |
|---------|----------------|
| `yarn test` | Contract (Forge, offline) + integration (CoinGecko, ElevenLabs; optional `BASE_URL=http://localhost:3000` for `/api/price/monad`) |
| `yarn test:contract` | `forge test --offline` (16 tests) |
| `yarn test:integration` | `scripts/run-tests.mjs` (CoinGecko, ElevenLabs, optional Next API) |
| `yarn test:coingecko` | CoinGecko Monad endpoint |
| `yarn test:elevenlabs` | ElevenLabs TTS (needs `ELEVEN_LABS_API_KEY`) |

E2E (manual): connect wallet, view chain, place order, view/settle position; Guide: voice → Convex → transcript/playback.

---

## Commands

| Command | Purpose |
|---------|---------|
| `yarn dev` | Dev server |
| `yarn build` | Production build |
| `yarn start` | Production server |
| `yarn lint` | ESLint |
| `yarn c` | Convex dev |
| `yarn cd` | Convex deploy |
| `yarn deploy:contract` | Deploy GammaGuide (Foundry); needs `DEPLOYER_PRIVATE_KEY`, `MONAD_RPC_URL` in `.env.local` |
| `yarn verify:contract <addr>` | Verify GammaGuide on Sourcify (Monad Testnet) |

---

## Docs

| Doc | Purpose |
|-----|---------|
| [QUICKSTART.md](./QUICKSTART.md) | Short setup |
| [DEPLOY.md](./DEPLOY.md) | Contract deploy + verify + app wiring |
| [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) | Checklist, env, security, deployment |
| [PAGES_GUIDE.md](./PAGES_GUIDE.md) | Coach/Trade implementation, Web APIs (BroadcastChannel, getUserMedia, WebSocket, Fetch, TTS) |
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Architecture and data flow |
| [.env.example](./.env.example) | Env template |

---

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Motion, Convex, Wagmi/RainbowKit, Viem. Contract: Solidity (Foundry).

---

**Monad Blitz Denver** — fork and submit via [Blitz Portal](https://blitz.devnads.com).
