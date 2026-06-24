import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

export const grantCasualReward = internalMutation({
  args: {
    uid: v.string(),
    coins: v.optional(v.number()),
    gems: v.optional(v.number()),
    seasonVoucher: v.optional(v.number()),
  },
  handler: async () => ({ ok: true }),
});
