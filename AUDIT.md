# GammaGuide Smart Contract Audit

Pre-deploy audit of `contracts/GammaGuide.sol` (European cash-settled options on Monad with Chainlink oracles).

---

## 1. Reentrancy

| Item | Status | Notes |
|------|--------|------|
| ReentrancyGuard | ✅ | `ReentrancyGuard.sol` with `nonReentrant` modifier. |
| CEI pattern | ✅ | `buyOption` and `settle` do checks → effects (state + events) → interactions (transferFrom/transfer). |
| Guard usage | ✅ | `buyOption` and `settle` are protected with `nonReentrant`. |

**Rationale:** Even with CEI, a malicious or callback-style quote token (e.g. ERC777) could reenter. The guard blocks reentry for the same contract. Chainlink feed calls in `getLatestPrice` are view-only; value-changing external calls are only the token transfers at the end.

---

## 2. Admin & Access Control

| Item | Status | Notes |
|------|--------|------|
| Owner | ✅ | Single `owner`, set in constructor and via `setOwner`. |
| onlyOwner | ✅ | All admin functions use `onlyOwner`. |
| Zero-address | ✅ | `constructor(quoteToken)`, `setOwner`, `setQuoteToken`, `setAllowedFeed` revert on `address(0)`. |
| Pause | ✅ | `setPaused(true)` disables `buyOption`; `settle` still works so users can claim at expiry. |
| Feed allowlist | ✅ | Only `allowedFeeds[feed]` can be used in `buyOption`; `setAllowedFeed(false)` removes a feed. |
| maxPriceAge | ✅ | `setMaxPriceAge` requires `_maxPriceAge >= 1` to avoid making `settle` always revert (DoS). |

**Admin functions:** `setAllowedFeed`, `setMaxPriceAge`, `setPaused`, `setOwner`, `setQuoteToken`. No two-step ownership transfer; owner must not set `address(0)`.

---

## 3. Edge Cases & Input Validation

| Check | Location | Notes |
|-------|----------|------|
| `paused` | buyOption | Reverts with `ContractPaused()`. |
| `allowedFeeds[underlyingFeed]` | buyOption | Reverts with `FeedNotAllowed()`. |
| `underlyingFeed != address(0)` | buyOption | Reverts with `ZeroAddress()`. |
| `expiryTs > block.timestamp` | buyOption | Reverts with `ExpiryInPast()`. |
| `expiryTs <= block.timestamp + 365 days` | buyOption | Reverts with `ExpiryTooFar()`. |
| `strikePrice != 0` | buyOption | Reverts with `StrikeZero()`. |
| Option exists | settle | `opt.buyer != address(0)` → `OptionNotFound()`. |
| Expired | settle | `block.timestamp >= opt.expiryTs` → `NotExpired()` otherwise. |
| Not already settled | settle | `!opt.settled` → `AlreadySettled()` otherwise. |
| Price at/after expiry | settle | `updatedAt >= opt.expiryTs` → `PriceNotYetAvailable()` otherwise. |
| Price not stale | settle | `block.timestamp - updatedAt <= maxPriceAge` → `StalePrice()` otherwise. |

**Chainlink in getLatestPrice:** Reverts with `InvalidPriceData()` if `roundId == 0`, `answer <= 0`, or `answeredInRound < roundId` (per Chainlink data-feed best practices).

---

## 4. Token & Transfer Handling

| Item | Status | Notes |
|------|--------|------|
| transferFrom | ✅ | Used only in `buyOption` after state and events; reverts on failure. |
| transfer | ✅ | Used only in `settle` after state and events; reverts on failure. |
| Return value | ✅ | Both use low-level `call` and require success and (if data) `abi.decode(..., (bool))`. |
| Zero amount | ✅ | `if (premiumAmount > 0)` / `if (payoutAmount > 0)` before transfers to avoid unnecessary calls. |

Quote token must implement standard ERC20 `transfer`/`transferFrom` return (bool or no return). Default `_quoteDecimals()` is 6 if `decimals()` is missing (e.g. non-contract).

---

## 5. Economic & Scaling

| Item | Status | Notes |
|------|--------|------|
| Payout scaling | ✅ | `_scalePayoutToQuoteToken` converts 8-decimal USD to quote token decimals; truncation possible for 8→6. |
| computePayout | ✅ | Call: `max(0, spot - strike)`; Put: `max(0, strike - spot)`. Handles `spotPrice8 <= 0` (returns 0). |
| premiumAmount | ✅ | Can be 0 (no transfer); no explicit minimum premium. |

---

## 6. Summary of Code Changes (This Audit)

1. **ReentrancyGuard** — New `contracts/ReentrancyGuard.sol`; `GammaGuide` inherits it and uses `nonReentrant` on `buyOption` and `settle`.
2. **Zero-address checks** — Constructor (`_quoteToken`), `setOwner`, `setQuoteToken`, `setAllowedFeed`, and `buyOption` (`underlyingFeed`).
3. **Chainlink validation** — `getLatestPrice` reverts with `InvalidPriceData()` when `roundId == 0`, `answer <= 0`, or `answeredInRound < roundId`.
4. **New error** — `ZeroAddress()` and `InvalidPriceData()`.

---

## 7. Recommendations Before Mainnet

- Consider a two-step ownership transfer (e.g. `pendingOwner` + `acceptOwnership`) to avoid locking the contract if a wrong address is set.
- Ensure `quoteToken` is a known, audited token (e.g. USDC); avoid setting it to arbitrary tokens via `setQuoteToken`.
- Run `forge build` and full test suite after any further changes.
- Consider a small minimum premium or fee to avoid dust/spam if desired (currently not enforced).

---

**Audit date:** Pre-deploy (pre-verification).  
**Scope:** `GammaGuide.sol`, `ReentrancyGuard.sol`, `IAggregatorV3.sol`, `ChainlinkMonad.sol` (addresses only).
