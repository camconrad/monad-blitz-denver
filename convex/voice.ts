import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";

/**
 * Create a new voice session for the Gamma Guide.
 * @return sessionId for use in useQuery and HTTP POST.
 */
export const createSession = mutation({
  args: {},
  handler: async (ctx) => {
    const id = await ctx.db.insert("voiceSessions", {
      updatedAt: Date.now(),
    });
    return id;
  },
});

/**
 * Get a voice session by id (for real-time subscription).
 */
export const getSession = query({
  args: { sessionId: v.id("voiceSessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  },
});

/**
 * Internal: set transcript partial (streaming STT).
 */
export const setTranscriptPartial = internalMutation({
  args: {
    sessionId: v.id("voiceSessions"),
    text: v.string(),
  },
  handler: async (ctx, { sessionId, text }) => {
    await ctx.db.patch(sessionId, {
      transcriptPartial: text,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal: set transcript final.
 */
export const setTranscriptFinal = internalMutation({
  args: {
    sessionId: v.id("voiceSessions"),
    text: v.string(),
  },
  handler: async (ctx, { sessionId, text }) => {
    await ctx.db.patch(sessionId, {
      transcript: text,
      transcriptPartial: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal: set coach partial (streaming LLM).
 */
export const setCoachPartial = internalMutation({
  args: {
    sessionId: v.id("voiceSessions"),
    text: v.string(),
  },
  handler: async (ctx, { sessionId, text }) => {
    await ctx.db.patch(sessionId, {
      coachPartial: text,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal: set coach final.
 */
export const setCoachFinal = internalMutation({
  args: {
    sessionId: v.id("voiceSessions"),
    text: v.string(),
  },
  handler: async (ctx, { sessionId, text }) => {
    await ctx.db.patch(sessionId, {
      coachText: text,
      coachPartial: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal: set TTS audio URL for coach response.
 */
export const setCoachAudioUrl = internalMutation({
  args: {
    sessionId: v.id("voiceSessions"),
    url: v.string(),
  },
  handler: async (ctx, { sessionId, url }) => {
    await ctx.db.patch(sessionId, {
      coachAudioUrl: url,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal: set error message.
 */
export const setError = internalMutation({
  args: {
    sessionId: v.id("voiceSessions"),
    message: v.string(),
  },
  handler: async (ctx, { sessionId, message }) => {
    await ctx.db.patch(sessionId, {
      error: message,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal: get session (for HTTP action).
 */
export const getSessionInternal = internalQuery({
  args: { sessionId: v.id("voiceSessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  },
});
