import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "origin",
};

/**
 * POST /api/voice — receive audio for a voice session.
 * Body: JSON { sessionId: string, audioBase64?: string }.
 * Updates session with stub transcript + coach (add OpenAI for real STT/LLM).
 */
export const postVoice = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: new Headers(CORS_HEADERS) });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: new Headers(CORS_HEADERS),
    });
  }

  try {
    const body = (await request.json()) as {
      sessionId?: string;
      audioBase64?: string;
    };
    const sessionId = body?.sessionId as Id<"voiceSessions"> | undefined;
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId required" }),
        { status: 400, headers: new Headers({ ...CORS_HEADERS, "Content-Type": "application/json" }) }
      );
    }

    const existing = await ctx.runQuery(internal.voice.getSessionInternal, {
      sessionId,
    });
    if (!existing) {
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404, headers: new Headers({ ...CORS_HEADERS, "Content-Type": "application/json" }) }
      );
    }

    // Stub: no real STT/LLM yet — set placeholder transcript and coach.
    // Add OPENAI_API_KEY and call Whisper + Chat in a Convex action for real behavior.
    const hasAudio = typeof body.audioBase64 === "string" && body.audioBase64.length > 0;
    const transcriptText = hasAudio
      ? "Voice message received. Add OpenAI for speech-to-text."
      : "No audio in request.";
    const coachText =
      "Consider your risk tolerance before trading. This is placeholder guidance — add OpenAI for full coach.";

    await ctx.runMutation(internal.voice.setTranscriptFinal, {
      sessionId,
      text: transcriptText,
    });
    await ctx.runMutation(internal.voice.setCoachFinal, {
      sessionId,
      text: coachText,
    });

    return new Response(
      JSON.stringify({ ok: true, sessionId }),
      { status: 200, headers: new Headers({ ...CORS_HEADERS, "Content-Type": "application/json" }) }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: new Headers({ ...CORS_HEADERS, "Content-Type": "application/json" }) }
    );
  }
});
