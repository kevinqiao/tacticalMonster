import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  campaignExperienceTypeValidator,
  campaignRewardModelValidator,
  campaignSettlementStatusValidator,
  campaignStatusValidator,
  displayConfigValidator,
  rewardRuleValidator,
  themeJsonValidator,
} from "./service/merchant/validators";

export default defineSchema({
  // `partner_brands` removed — slug→partnerId now resolves only via SSO
  // `partner.slug` (see service/bridge/partnerSlugResolveBridge.ts).

  campaigns: defineTable({
    campaignId: v.string(),
    partnerId: v.number(),
    slug: v.string(),
    status: campaignStatusValidator,
    title: v.string(),
    rulesText: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.number(),
    experienceType: v.optional(campaignExperienceTypeValidator),
    displayConfig: v.optional(displayConfigValidator),
    /**
     * Portal tournament template id (play desk SoT for game campaigns).
     * gameType/mode are derived from PORTAL_TOURNAMENT_DEFINITIONS (not stored).
     */
    tournamentId: v.optional(v.string()),
    rewardModel: v.optional(campaignRewardModelValidator),
    /**
     * Competitive leaderboard settlement (embedded; replaces campaign_leaderboard_settlements).
     */
    settlement: v.optional(
      v.object({
        status: campaignSettlementStatusValidator,
        winnerCount: v.optional(v.number()),
        couponsIssued: v.optional(v.number()),
        error: v.optional(v.string()),
        settledAt: v.optional(v.number()),
        updatedAt: v.number(),
      })
    ),
    posterStorageId: v.optional(v.id("_storage")),
    posterPortraitStorageId: v.optional(v.id("_storage")),
    posterLandscapeStorageId: v.optional(v.id("_storage")),
    playLimits: v.object({
      maxCouponsPerPlayer: v.number(),
      maxPlaysPerDay: v.optional(v.number()),
      dayTimezone: v.optional(v.string()),
    }),
    /** Sparse overlay on Portal partner replay settings (join stamp). */
    replaySettings: v.optional(
      v.object({
        maxReplaysPerMatch: v.optional(v.number()),
        adReplayEnabled: v.optional(v.boolean()),
        adReplayDailyCap: v.optional(v.number()),
        ticketReplayEnabled: v.optional(v.boolean()),
        ticketReplayPriceTickets: v.optional(v.number()),
        coinReplayEnabled: v.optional(v.boolean()),
        coinReplayPriceCoins: v.optional(v.number()),
        coinReplayDailyCap: v.optional(v.union(v.number(), v.null())),
      })
    ),
    rewardRules: v.array(rewardRuleValidator),
    themeOverride: v.optional(themeJsonValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_campaignId", ["campaignId"])
    .index("by_partner_slug", ["partnerId", "slug"])
    .index("by_partnerId", ["partnerId"]),

  /** Replica of SSO platform_status (singleton). Synced via /internal/platform-status. */
  platform_status: defineTable({
    key: v.literal("global"),
    mode: v.union(
      v.literal("normal"),
      v.literal("pre_notice"),
      v.literal("maintenance")
    ),
    title: v.optional(v.string()),
    message: v.optional(v.string()),
    plannedStartAt: v.optional(v.number()),
    plannedEndAt: v.optional(v.number()),
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
  }).index("by_key", ["key"]),

});
