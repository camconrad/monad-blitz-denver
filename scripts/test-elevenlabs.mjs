#!/usr/bin/env node
/**
 * Test Eleven Labs TTS API (same request shape as convex/voiceAction.ts).
 * Loads ELEVEN_LABS_API_KEY from .env.local or process.env.
 *
 * Run: node scripts/test-elevenlabs.mjs
 * Or:  node --env-file=.env.local scripts/test-elevenlabs.mjs
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

function loadEnvLocal() {
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      const key = m[1];
      const raw = m[2].trim();
      const value = raw.startsWith('"') && raw.endsWith('"')
        ? raw.slice(1, -1).replace(/\\"/g, '"')
        : raw.replace(/#.*$/, "").trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnvLocal();

const apiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceId = process.env.ELEVEN_LABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

if (!apiKey) {
  console.error("Missing ELEVEN_LABS_API_KEY. Set it in .env.local or Convex env.");
  process.exit(1);
}

const testText = "Eleven Labs is working. You will hear this if TTS is correct.";

console.log("Calling Eleven Labs TTS API...");
console.log("Voice ID:", voiceId);
console.log("Model: eleven_multilingual_v2");
console.log("");

const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    "xi-api-key": apiKey,
    "Content-Type": "application/json",
    accept: "audio/mpeg",
  },
  body: JSON.stringify({
    text: testText,
    model_id: "eleven_multilingual_v2",
  }),
});

if (res.ok) {
  const contentType = res.headers.get("content-type") ?? "";
  const size = (await res.arrayBuffer()).byteLength;
  console.log("OK – Eleven Labs TTS is working.");
  console.log("Status:", res.status);
  console.log("Content-Type:", contentType);
  console.log("Audio size:", size, "bytes");
  process.exit(0);
} else {
  const text = await res.text();
  console.error("Eleven Labs request failed.");
  console.error("Status:", res.status, res.statusText);
  console.error("Body:", text.slice(0, 500));
  process.exit(1);
}
