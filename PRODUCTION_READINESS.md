# Production Readiness

Checklist and notes for shipping Monad Options (Gamma Guide + options trading).

---

## Steps to completion

Recommended order: **UI polish → Deploy contracts → Integrate → Run tests**.  
**Test suite:** `yarn test` (contract: `forge test --offline`; integration: CoinGecko + ElevenLabs; optional API when `BASE_URL` set). See `test/GammaGuide.t.sol` and `scripts/run-tests.mjs`.

| Phase | Tasks | Owner |
|-------|--------|--------|
| **1. Minor UI touch** | ~~Fix remaining lints (aria-selected on trade page)~~; final copy/spacing; ensure Guide context, ticker, and trade layout match design. | Dev |
| **2. Deploy contracts** | Audit: see `AUDIT.md`. Run `yarn deploy:contract` (Foundry). Deployer: `0x1433dF88aa130363B523f3f452C05854C0a02084`. Set `NEXT_PUBLIC_GAMMA_GUIDE_ADDRESS`; fund contract with quote token for payouts. | Dev / ops |
| **3. Integrate** | ~~Wire app to contract~~ Done: set `NEXT_PUBLIC_GAMMA_GUIDE_ADDRESS`; Trade page uses GammaGuide for positions, buyOption (1 contract), and settle. | Dev |
| **4. Run tests** | **Automated:** `yarn test` runs Forge contract tests (16) + integration (CoinGecko, ElevenLabs). Set `BASE_URL=http://localhost:3000` to include `/api/price/monad` when the app is running. **E2E:** connect wallet, view chain, buy option, view position, settle; smoke test Guide (voice → Convex → playback). | Dev / QA |

---

## Security

| Item | Status | Notes |
|------|--------|--------|
| API keys not in client | ✅ | Gemini, ElevenLabs, CoinGecko used server-side (Convex / Next API) |
| Convex env | ✅ | Set GEMINI_API_KEY, ELEVEN_LABS_API_KEY in Convex dashboard |
| Vercel env | ✅ | Set NEXT_PUBLIC_CONVEX_URL, NEXT_PUBLIC_CONVEX_SITE_URL, COINGECKO_API_KEY |
| CORS | ⚠️ | Convex HTTP allows `*`; restrict via CLIENT_ORIGIN in Convex env if needed |
| WalletConnect | ⚠️ | Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (Vercel + .env.local) |
| Security headers | ✅ | next.config.ts sets X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| Contract | ✅ | CEI, pause, NatSpec; no keys in contract |

---

## Errors & Resilience

| Item | Status | Notes |
|------|--------|--------|
| Error boundary | ✅ | app/error.tsx catches route errors |
| Global error | ✅ | app/global-error.tsx catches root/layout errors |
| 404 page | ✅ | app/not-found.tsx |
| Voice errors | ✅ | Session error field; user sees message in UI |
| Price API | ✅ | Timeout + 502/500 with message |
| Convex action | ✅ | setError on session on Gemini/API failure |

---

## Config & Env

| Variable | Where | Required |
|----------|--------|----------|
| NEXT_PUBLIC_CONVEX_URL | Vercel, .env.local | Yes (for Guide) |
| NEXT_PUBLIC_CONVEX_SITE_URL | Vercel (Convex sets on dev) | Yes for voice POST |
| GEMINI_API_KEY | Convex dashboard | Yes for voice |
| ELEVEN_LABS_API_KEY | Convex dashboard | Yes for TTS |
| COINGECKO_API_KEY | Vercel, .env.local | Optional (higher rate limit). **Vercel:** add in Project → Settings → Environment Variables; name must be exactly `COINGECKO_API_KEY`; select **Production** (and Preview if needed); **redeploy** after adding—env vars apply only to new deployments. |
| NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID | Vercel, .env.local | Yes for wallet connect |
| NEXT_PUBLIC_MONAD_TESTNET_RPC_URL | Optional override | Default: testnet RPC |
| NEXT_PUBLIC_GAMMA_GUIDE_ADDRESS | Vercel, .env.local | After deploy; Trade page contract |
| DEPLOYER_PRIVATE_KEY | .env.local only (never commit) | Forge deploy script |
| MONAD_RPC_URL | .env.local for deploy | Default: https://testnet-rpc.monad.xyz |

---

## CoinGecko in production (“CoinGecko unavailable”)

If the Guide shows “CoinGecko unavailable” in production but works locally:

1. **Redeploy** — Vercel applies env vars only to **new** deployments. After adding or changing `COINGECKO_API_KEY`, trigger a new production deploy (push to main or “Redeploy” in Vercel).
2. **Environment** — In Vercel → Project → Settings → Environment Variables, ensure `COINGECKO_API_KEY` is checked for **Production** (and Preview if you use preview URLs).
3. **Name** — Variable must be exactly `COINGECKO_API_KEY` (all caps, underscore).
4. **Verify** — After redeploying, open `https://<your-domain>/api/price/monad` and check the response header `X-CoinGecko-Key`: `present` means the key is loaded; `missing` means the env var is not available to the serverless function. If the body is `{ "error": "CoinGecko 429" }`, the key may be invalid or you are rate-limited.

---

## Performance

| Item | Status | Notes |
|------|--------|--------|
| Price cache | ✅ | /api/price revalidate 60s |
| Convex subscription | ✅ | Real-time session updates |
| Voice action | ⚠️ | Fire-and-forget; no client timeout (user waits for subscription) |
| Next build | ✅ | outputFileTracingRoot set to process.cwd() to silence lockfile warning |
| WebSocket RPC | 📌 Optional | For lowest-latency blocks/logs, use an RPC with WebSocket support and `eth_subscribe` (see below). |

### Real-time data (WebSocket RPC)

For lower-latency block headers and contract events (e.g. option fills, settlements), use an RPC endpoint that supports **WebSocket** and **`eth_subscribe`**. Point wagmi/viem at a `ws://` or `wss://` URL and subscribe to `newHeads` or `logs` instead of polling.

**Node operators:** WebSocket on Monad RPC requires the execution daemon to be configured with Execution Events and the RPC daemon with `--ws-enabled`. See [Set up Execution Events \| Monad Developer Documentation](https://docs.monad.xyz/guides/execution-events/setup) for the full setup (huge pages, event ring, RPC override).

---

## UX

| Item | Status | Notes |
|------|--------|--------|
| Guide processing state | ✅ | "Processing…" after End until session updates |
| Price loading | ✅ | Spot shows fallback or "…" while loading |
| Error messages | ✅ | Backend/config errors shown in Guide |
| Contract | ✅ | Pause for emergencies; getOptionIdsByBuyer for positions |

---

## Deployment

1. **Convex**: `yarn cd` (convex deploy --yes). Set env in dashboard (GEMINI_API_KEY, ELEVEN_LABS_API_KEY, etc.).
2. **Vercel**: Connect repo; set env vars; deploy. Optional: outputFileTracingRoot in next.config if needed.
3. **Contract** (see Steps to completion): Deploy GammaGuide(quoteToken) on Monad; set allowedFeeds; fund with quote token for payouts; then set `NEXT_PUBLIC_GAMMA_GUIDE_ADDRESS` (or equivalent) and integrate in app.

---

## Post-launch

- [ ] Rate limit /api/voice and Convex HTTP if abuse appears
- [ ] Restrict CORS to production domain(s) in Convex
- [ ] Monitor Convex logs and Vercel functions for errors
- [ ] Rotate API keys if ever exposed
