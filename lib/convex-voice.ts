/**
 * Convex voice backend: HTTP action base URL for POST /api/voice.
 * Prefer NEXT_PUBLIC_CONVEX_SITE_URL if set (e.g. https://<deployment>.convex.site);
 * else derive from NEXT_PUBLIC_CONVEX_URL (.convex.cloud → .convex.site).
 */
export function getConvexVoiceUrl(): string {
  const site = process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim();
  if (site) return site.replace(/\/$/, "");
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return "";
  return url.replace(".convex.cloud", ".convex.site");
}

export const CONVEX_VOICE_API_PATH = "/api/voice";
