# Deploy GammaGuide to Monad Testnet

- **Deployer address:** `0x1433dF88aa130363B523f3f452C05854C0a02084`
- **GammaGuide (current):** `0xDBF6FB7d82B6C178A73a795b54Ff3dBAea45DAe6` — set as `NEXT_PUBLIC_GAMMA_GUIDE_ADDRESS`
- **Testnet explorer:** https://testnet.monadvision.com (MonadVision / BlockVision)
- **Sourcify (verification):** https://sourcify-api-monad.blockvision.org/

## Where the contract address comes from

1. **From the deploy script** — When you run `yarn deploy:contract`, the last lines of output look like:
   ```text
   GammaGuide deployed at: 0x...
   Quote token: 0x534b2f3A21130d7a60830c2Df862319e593943A3
   Deployer: 0x1433dF88aa130363B523f3f452C05854C0a02084
   ```
   Copy the **GammaGuide deployed at** address and set it as `NEXT_PUBLIC_GAMMA_GUIDE_ADDRESS`.

2. **From the block explorer** — If you didn’t save it, open https://testnet.monadvision.com and search for your deployer address `0x1433dF88aa130363B523f3f452C05854C0a02084`. In the list of transactions, find the **contract creation** (first deploy tx). The created contract address is your GammaGuide address (click the tx → “Contract” / “Created” or “To” for the new contract).

## Prerequisites

1. **Foundry** (for compiling and running the deploy script):
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Env**: In `.env.local` set:
   - `DEPLOYER_PRIVATE_KEY` — deployer wallet private key (hex, with or without `0x`)
   - `MONAD_RPC_URL` — optional; default is `https://testnet-rpc.monad.xyz`

3. **MON for gas**: The deployer address must hold MON on Monad testnet for gas.

## Deploy

From the project root:

```bash
yarn deploy:contract
```

Or with Forge directly (env from `.env` or export vars):

```bash
export MONAD_RPC_URL="${MONAD_RPC_URL:-https://testnet-rpc.monad.xyz}"
forge script script/Deploy.s.sol --rpc-url monad --broadcast
```

(Ensure `DEPLOYER_PRIVATE_KEY` is set in the environment.)

## After deploy

1. Note the **GammaGuide** address printed by the script.
2. Set in `.env.local` (and in Vercel/env for production):
   ```
   NEXT_PUBLIC_GAMMA_GUIDE_ADDRESS=0x<deployed_address>
   ```
3. **Verify** the contract (optional but recommended):
   ```bash
   yarn verify:contract 0x<deployed_address>
   ```
4. Fund the GammaGuide contract with quote token (testnet USDC) for option payouts if needed.

## Wiring (app ↔ contract)

With `NEXT_PUBLIC_GAMMA_GUIDE_ADDRESS` set:

- **Trade page** uses the contract when the user’s wallet is connected:
  - **Positions**: Open and closed positions come from `getOptionIdsByBuyer` + `options(id)` (no mock data).
  - **Place order**: “Place order (1 contract)” sends `buyOption(underlyingFeed, isCall, strikePrice8, expiryTs, premiumAmount)`. User must have approved the quote token (USDC) for the GammaGuide address first.
  - **Settle**: For expired options, a “Settle” button calls `settle(optionId)` and payouts are sent in quote token.
- **Quote token**: 6 decimals (USDC). Premium is `(price × 100) × 1e6` in token units per contract.
- **Expiry**: UI expiry date (e.g. `2025-02-21`) is converted to end-of-day UTC unix timestamp for the contract.

## Quote token

- **Testnet**: USDC `0x534b2f3A21130d7a60830c2Df862319e593943A3` (default in script).
- **Mainnet**: Set `QUOTE_TOKEN_ADDRESS=0x754704Bc059F8C67012fEd69BC8A327a5aafb603` and use mainnet RPC.

## Verify contract (Sourcify / Block Vision)

After deploying, verify GammaGuide on **Monad Testnet** so it shows as verified on [MonadVision](https://testnet.monadvision.com). This matches the [official Monad verification guide](https://docs.monad.xyz/) (Foundry + Sourcify).

**Correct setup (Monad Testnet):**
- **Chain:** `10143`
- **Verifier:** Sourcify  
- **Verifier URL:** `https://sourcify-api-monad.blockvision.org/`

**Using the npm script (recommended):**

```bash
yarn verify:contract 0x<your_deployed_gamma_guide_address>
```

**Or with Forge directly** (same as [Monad’s guide](https://docs.monad.xyz/)):

```bash
forge verify-contract \
  0xYourGammaGuideAddress \
  contracts/GammaGuide.sol:GammaGuide \
  --chain 10143 \
  --verifier sourcify \
  --verifier-url https://sourcify-api-monad.blockvision.org/
```

If you use standard Foundry (not the foundry-monad template), add:

```bash
  --rpc-url https://testnet-rpc.monad.xyz
```

On success you should see: **Contract successfully verified**. Then check the contract on [MonadVision](https://testnet.monadvision.com).

**Note:** `foundry.toml` has `metadata = true`, `metadata_hash = "none"`, and `use_literal_content = true` so source is in the JSON and verification is less likely to time out.
