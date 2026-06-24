import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

export const applySeasonWalletBalanceDelta = internalMutation({
  args: {
    uid: v.string(),
    seasonId: v.optional(v.string()),
    coinsDelta: v.optional(v.number()),
    gemsDelta: v.optional(v.number()),
    seasonVouchersDelta: v.optional(v.number()),
  },
  handler: async () => ({ ok: true }),
});

export const addPassXpFromRun = internalMutation({
  args: {
    uid: v.string(),
    xp: v.number(),
    seasonId: v.optional(v.string()),
  },
  handler: async () => {},
});
