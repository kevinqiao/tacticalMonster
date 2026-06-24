import { internalMutation, internalQuery } from "../../_generated/server";
import { v } from "convex/values";

export const notifyTournamentJoined = internalMutation({
  args: { uid: v.string() },
  handler: async () => {},
});

export const notifyScoreSubmitted = internalMutation({
  args: {
    uid: v.string(),
    matchType: v.optional(v.string()),
    platformGameType: v.optional(v.string()),
    multiplayerFinalRank: v.optional(v.number()),
  },
  handler: async () => {},
});
