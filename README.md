# Monad Options

**AI-powered voice trading assistant for European vanilla options.** Ask in plain English, get guidance, and trade on Monad Testnet.

---

## What’s done and verified

| Area | Status | Notes |
|------|--------|--------|
| **Pages** | ✅ | Home, Guide, Trade. Tabs: Guide ↔ Trade. |
| **Voice (Gamma Guide)** | ✅ | Convex: Gemini + ElevenLabs TTS. Guide: record → transcript + coach response; syncs to Trade tab. |
| **Options trading (Trade page)** | ✅ | MON-USD; live spot (CoinGecko). Options chain (calls/puts), order panel (buy/sell, limit/market), TradingView chart. |
| **Contract (GammaGuide)** | ✅ | Deployed on Monad Testnet. Trade: positions, buy, settle. Set contract address in env after deploy. |
| **Price APIs** | ✅ | Multi-coin and MON prices (CoinGecko). Guide shows live MON spot. |
| **Wallet** | ✅ | RainbowKit + Wagmi on Monad Testnet. WalletConnect supported. |
| **Security** | ✅ | API keys server-side. No keys in contract. |
| **Errors / resilience** | ✅ | Error boundaries and not-found. Voice/price errors shown in UI. |
| **Tests** | ✅ | Contract tests (Forge) + integration (CoinGecko, ElevenLabs). |

---

## Quick start

```bash
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

**Setup:** Copy [.env.example](./.env.example) to `.env.local` and fill. Monad Testnet (Chain ID 10143). For voice: run `npx convex dev` and set Convex env. For contract: see [DEPLOY.md](./DEPLOY.md).

---

---

## Tested

| Command | What it runs |
|---------|----------------|
| `yarn test` | Contract (Forge) + integration (CoinGecko, ElevenLabs) |
| `yarn test:contract` | Forge tests only |
| `yarn test:integration` | CoinGecko, ElevenLabs, optional Next API |
| `yarn test:coingecko` | CoinGecko Monad |
| `yarn test:elevenlabs` | ElevenLabs TTS |

Manual E2E: wallet, chain, order, position; Guide voice → transcript/playback.

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
| `yarn deploy:contract` | Deploy contract (see [DEPLOY.md](./DEPLOY.md)) |
| `yarn verify:contract <addr>` | Verify on Sourcify |

---

## Docs

| Doc | Purpose |
|-----|---------|
| [QUICKSTART.md](./QUICKSTART.md) | Short setup |
| [DEPLOY.md](./DEPLOY.md) | Contract deploy + verify + app wiring |
| [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) | Checklist, env, security, deployment |
| [PAGES_GUIDE.md](./PAGES_GUIDE.md) | Guide/Trade and Web APIs |
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Architecture and data flow |
| [.env.example](./.env.example) | Env template |

---

Guide and Trade tabs sync via **BroadcastChannel** (transcript, coach suggestions). Details: [PAGES_GUIDE.md](./PAGES_GUIDE.md), [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md).

---

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Motion, Convex, Wagmi/RainbowKit, Viem. Contract: Solidity (Foundry).

---

**Monad Blitz Denver** — fork and submit via [Blitz Portal](https://blitz.devnads.com).
