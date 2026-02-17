"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_PROMPT = `You are a concise options-trading coach. The user will speak (audio). Do two things:
1. Transcribe their speech exactly (TRANSCRIPT: ...).
2. Give a brief, helpful coach response in 1-2 sentences—risk-aware, no jargon (COACH: ...).
Format your reply as:
TRANSCRIPT: <their words>
COACH: <your response>`;

/**
 * Process voice audio: Gemini for transcript + coach, ElevenLabs for TTS; update session.
 * Requires GEMINI_API_KEY and ELEVEN_LABS_API_KEY in Convex env.
 */
export const processAudio = internalAction({
  args: {
    sessionId: v.id("voiceSessions"),
    audioBase64: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, audioBase64 }) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const elevenKey = process.env.ELEVEN_LABS_API_KEY;

    if (!geminiKey) {
      await ctx.runMutation(internal.voice.setError, {
        sessionId,
        message: "GEMINI_API_KEY not set",
      });
      return;
    }

    let transcript = "No audio provided.";
    let coachText =
      "Add audio and set GEMINI_API_KEY for transcript and coach. Set ELEVEN_LABS_API_KEY for voice.";

    if (audioBase64 && audioBase64.length > 0) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      inlineData: {
                        mimeType: "audio/webm",
                        data: audioBase64,
                      },
                    },
                    { text: GEMINI_PROMPT },
                  ],
                },
              ],
              generationConfig: {
                maxOutputTokens: 512,
                temperature: 0.7,
              },
            }),
          },
        );

        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          await ctx.runMutation(internal.voice.setError, {
            sessionId,
            message: `Gemini error: ${geminiRes.status} ${errText.slice(0, 200)}`,
          });
          return;
        }

        const geminiJson = (await geminiRes.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        const rawText =
          geminiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

        const transcriptMatch = rawText.match(/TRANSCRIPT:\s*(.+?)(?=COACH:|$)/is);
        const coachMatch = rawText.match(/COACH:\s*(.+?)$/is);
        transcript = transcriptMatch?.[1]?.trim() ?? rawText.slice(0, 200);
        coachText = coachMatch?.[1]?.trim() ?? coachText;
      } catch (e) {
        await ctx.runMutation(internal.voice.setError, {
          sessionId,
          message: e instanceof Error ? e.message : "Gemini request failed",
        });
        return;
      }
    }

    await ctx.runMutation(internal.voice.setTranscriptFinal, {
      sessionId,
      text: transcript,
    });
    await ctx.runMutation(internal.voice.setCoachFinal, {
      sessionId,
      text: coachText,
    });

    if (elevenKey && coachText) {
      try {
        const voiceId = process.env.ELEVEN_LABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
        const ttsRes = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": elevenKey,
              "Content-Type": "application/json",
              accept: "audio/mpeg",
            },
            body: JSON.stringify({
              text: coachText,
              model_id: "eleven_multilingual_v2",
            }),
          }
        );

        if (ttsRes.ok) {
          const audioBuffer = await ttsRes.arrayBuffer();
          const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
          const storageId = await ctx.storage.store(blob);
          const url = await ctx.storage.getUrl(storageId);
          if (url) {
            await ctx.runMutation(internal.voice.setCoachAudioUrl, {
              sessionId,
              url,
            });
          }
        }
      } catch {
        // TTS optional; session already has coach text
      }
    }
  },
});
