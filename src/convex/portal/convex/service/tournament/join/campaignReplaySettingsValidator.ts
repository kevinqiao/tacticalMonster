import { v } from "convex/values";

/** Join stamp: sparse campaign overlay on partner replay settings. */
export const campaignReplaySettingsValidator = v.object({
  maxReplaysPerMatch: v.optional(v.number()),
  adReplayEnabled: v.optional(v.boolean()),
  adReplayDailyCap: v.optional(v.number()),
  ticketReplayEnabled: v.optional(v.boolean()),
  ticketReplayPriceTickets: v.optional(v.number()),
  coinReplayEnabled: v.optional(v.boolean()),
  coinReplayPriceCoins: v.optional(v.number()),
  coinReplayDailyCap: v.optional(v.union(v.number(), v.null())),
});
