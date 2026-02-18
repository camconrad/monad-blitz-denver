# Monad Options

**AI-powered voice trading assistant for European vanilla options.** Ask in plain English, get guidance, and trade on Monad Testnet.

---

## What’s done and verified

| Area | Status | Notes |
|------|--------|--------|
| **Pages** | ✅ | Home (`/`), Guide (`/guide`), Trade (`/trade`). Tabs: Guide ↔ Trade. Layout: consistent 8px gap (pt-2 / px-2 / pb-2); side padding not overridden (safe-area on `<body>` only). |
| **Voice (Gamma Guide)** | ✅ | Convex backend: session → Gemini → ElevenLabs TTS. Optional WebSocket (`NEXT_PUBLIC_VOICE_WS_URL`). Guide page: record → POST `/api/voice` → real-time transcript + coach response. BroadcastChannel bus for cross-tab (Guide ↔ Trade). |
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
| [PAGES_GUIDE.md](./PAGES_GUIDE.md) | Guide/Trade implementation, Web APIs (BroadcastChannel, getUserMedia, WebSocket, Fetch, TTS) |
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Architecture and data flow |
| [.env.example](./.env.example) | Env template |

---

## Web APIs: communication between tabs

The app uses the **BroadcastChannel API** so the **Guide** tab (voice/coach) and the **Trade** tab stay in sync without sharing a React tree.

### How it works

- **Channel:** One same-origin channel, name `gamma_guide_bus` (see `lib/voice-coach-bus.ts`). Any tab that opens a `BroadcastChannel` with this name can send and receive messages; only other same-origin tabs (and iframes) receive a given post (the posting tab does not receive its own message).
- **Bus abstraction:** `createCoachBus()` returns a small bus: `publish(type, payload, requestId?)` and `subscribe(handler)`. Under the hood it uses `new BroadcastChannel(BUS_NAME)`, and on `publish` calls `channel.postMessage(envelope)`. Incoming messages are delivered to the channel’s `onmessage`; the bus forwards them to every registered `handler`.
- **Message shape:** Every message is an envelope `{ type: string, ts: number, requestId?: string, payload: unknown }`. `type` identifies the event; `payload` carries the data.

### Who publishes, who subscribes

| Tab   | Role | What it does |
|-------|------|----------------|
| **Guide** | Publisher | After voice/Convex returns transcript or coach output, it calls `bus.publish(...)` so other tabs can show it. |
| **Trade** | Subscriber | Creates a bus, calls `bus.subscribe(handler)`, and in the handler updates Coach panel state (suggestions, risk alerts, live transcript). |

So: Guide speaks and gets coach responses; it publishes those events on the bus. Trade (and any other tab using the same channel) receives them and can show the same suggestions and transcript.

### Event types

| `type` | When it’s published | `payload` (typical) |
|--------|----------------------|----------------------|
| `coach.transcript.partial` | Interim transcript from voice pipeline | `{ text: string }` |
| `coach.transcript.final` | Final transcript for an utterance | `{ text: string }` |
| `coach.suggestion` | Coach suggestion (e.g. strategy idea) | `{ title?, rationale?, actions? }` |
| `coach.risk.alert` | Risk warning or block from coach | `{ severity?, message? }` (e.g. `warn` / `block`) |

Trade’s handler maps these to `liveTranscript`, `coachSuggestions`, and `coachRisk`, which drive the Coach panel on the Trade page.

### Why BroadcastChannel

- **Same-origin only:** No cross-site leakage; only tabs/windows for this app’s origin see the messages.
- **No server round-trip:** Tab-to-tab only; no backend needed for sync.
- **Simple API:** `postMessage` + `onmessage`; the bus adds a typed envelope and local subscribe/publish.

Other options (e.g. `localStorage` + `storage` event, `SharedWorker`, or a central server) would add complexity or latency; BroadcastChannel fits this “one coach, many tabs” use case. See also [PAGES_GUIDE.md](./PAGES_GUIDE.md) and [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) for flow and architecture.

---

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Motion, Convex, Wagmi/RainbowKit, Viem. Contract: Solidity (Foundry).

---

**Monad Blitz Denver** — fork and submit via [Blitz Portal](https://blitz.devnads.com).
