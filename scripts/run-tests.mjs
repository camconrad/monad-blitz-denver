#!/usr/bin/env node
/**
 * Integration test runner: CoinGecko, ElevenLabs, and optional /api/price/monad.
 * Run: node scripts/run-tests.mjs   OR   yarn test
 * Set BASE_URL (e.g. http://localhost:3000) to test the Monad price API; omit to skip.
 * Loads .env.local for ELEVEN_LABS_API_KEY.
 */
import { spawnSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      const raw = m[2].trim();
      const value = raw.startsWith('"') && raw.endsWith('"')
        ? raw.slice(1, -1).replace(/\\"/g, '"')
        : raw.replace(/#.*$/, "").trim();
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  }
}

loadEnv();

const failures = [];

async function run(name, fn) {
  process.stdout.write(`  ${name} ... `);
  try {
    await fn();
    console.log("OK");
  } catch (e) {
    console.log("FAIL");
    failures.push({ name, error: e.message || String(e) });
  }
}

async function main() {
// 1) CoinGecko (public API)
await run("CoinGecko Monad data", async () => {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=monad&order=market_cap_desc&per_page=1&page=1"
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();
  const coin = data[0];
  if (!coin || typeof coin.current_price !== "number") throw new Error("Monad market data not found");
});

// 2) ElevenLabs (requires ELEVEN_LABS_API_KEY in .env.local)
await run("ElevenLabs TTS", async () => {
  const key = process.env.ELEVEN_LABS_API_KEY;
  if (!key) throw new Error("ELEVEN_LABS_API_KEY not set (skip or set in .env.local)");
  const voiceId = process.env.ELEVEN_LABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({ text: "Test.", model_id: "eleven_multilingual_v2" }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status} ${await res.text()}`);
});

// 3) Next.js API /api/price/monad (optional when BASE_URL set)
const baseUrl = process.env.BASE_URL?.trim();
if (baseUrl) {
  await run("GET /api/price/monad", async () => {
    const url = baseUrl.replace(/\/$/, "") + "/api/price/monad";
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`API ${res.status} ${await res.text()}`);
    const body = await res.json();
    if (body.error) throw new Error(body.error);
    if (typeof body.price !== "number") throw new Error("Missing price in response");
  });
} else {
  console.log("  GET /api/price/monad ... skipped (set BASE_URL to enable)");
}

if (failures.length > 0) {
  console.error("\nFailures:");
  failures.forEach(({ name, error }) => console.error(`  ${name}: ${error}`));
  process.exit(1);
}

console.log("\nAll integration tests passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
