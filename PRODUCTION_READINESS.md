# Production Readiness

Checklist and notes for shipping Monad Options (Gamma Guide + options trading).

---

## Steps to completion

Recommended order: **UI polish → Deploy contracts → Integrate → Run tests**.

| Phase | Tasks | Owner |
|-------|--------|--------|
| **1. Minor UI touch** | ~~Fix remaining lints (aria-selected on trade page)~~; final copy/spacing; ensure Guide context, ticker, and trade layout match design. | Dev |
| **2. Deploy contracts** | Deploy `GammaGuide(quoteToken)` on Monad testnet; configure `allowedFeeds` (Chainlink ETH/USD); fund contract with quote token for payouts; note deployed address. | Dev / ops |
| **3. Integrate** | Wire app to deployed contract: set contract address in env (e.g. `NEXT_PUBLIC_GAMMA_GUIDE_ADDRESS`); point wagmi/abis to deployed address; verify buy option, positions, settle, and pause flows. | Dev |
| **4. Run tests** | E2E: connect wallet, view chain, buy option, view position, settle (or wait for expiry); smoke test Guide (voice → Convex → playback); verify price/spot from CoinGecko. | Dev / QA |

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
| COINGECKO_API_KEY | Vercel, .env.local | Optional (higher rate limit) |
| NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID | Vercel, .env.local | Yes for wallet connect |
| NEXT_PUBLIC_MONAD_TESTNET_RPC_URL | Optional override | Default: testnet RPC |

---

## Performance

| Item | Status | Notes |
|------|--------|--------|
| Price cache | ✅ | /api/price revalidate 60s |
| Convex subscription | ✅ | Real-time session updates |
| Voice action | ⚠️ | Fire-and-forget; no client timeout (user waits for subscription) |
| Next build | ✅ | outputFileTracingRoot set to process.cwd() to silence lockfile warning |

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
