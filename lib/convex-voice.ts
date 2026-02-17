/**
 * Convex voice backend: HTTP action base URL for POST /api/voice.
 * Convex HTTP actions are at https://<deployment>.convex.site
 * (NEXT_PUBLIC_CONVEX_URL is https://<deployment>.convex.cloud).
 */
export function getConvexVoiceUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return "";
  return url.replace(".convex.cloud", ".convex.site");
}

export const CONVEX_VOICE_API_PATH = "/api/voice";
