import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Voice session for Gamma Guide: transcript and coach response,
 * updated in real time so the client can subscribe via useQuery.
 */
export default defineSchema({
  voiceSessions: defineTable({
    transcript: v.optional(v.string()),
    transcriptPartial: v.optional(v.string()),
    coachText: v.optional(v.string()),
    coachPartial: v.optional(v.string()),
    coachAudioUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_updated", ["updatedAt"]),
});
