import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  campaignExperienceTypeValidator,
  campaignModeValidator,
  campaignRewardModelValidator,
  campaignSettlementStatusValidator,
  campaignStatusValidator,
  couponRewardDefValidator,
  couponStatusValidator,
  couponDefStatusValidator,
  displayConfigValidator,
  merchantStaffRoleValidator,
  rewardRuleValidator,
  themeJsonValidator,
} from "./service/merchant/validators";

export default defineSchema({
  merchants: defineTable({
    merchantId: v.string(),
    slug: v.string(),
    name: v.string(),
    /** SSO partner pid — resolved from merchant slug for embed auth (not URL ?pid). */
    partnerId: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("suspended")),
    brandSourceUrl: v.optional(v.string()),
    themeJson: v.optional(themeJsonValidator),
    themeVersion: v.optional(v.number()),
    logoStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_merchantId", ["merchantId"])
    .index("by_slug", ["slug"]),

  merchant_staff: defineTable({
    merchantId: v.string(),
    uid: v.string(),
    role: merchantStaffRoleValidator,
    createdAt: v.number(),
  })
    .index("by_merchant", ["merchantId"])
    .index("by_merchant_uid", ["merchantId", "uid"])
    .index("by_uid", ["uid"]),

  merchant_campaigns: defineTable({
    campaignId: v.string(),
    merchantId: v.string(),
    slug: v.string(),
    status: campaignStatusValidator,
    title: v.string(),
    rulesText: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.number(),
    experienceType: v.optional(campaignExperienceTypeValidator),
    displayConfig: v.optional(displayConfigValidator),
    gameType: v.string(),
    mode: campaignModeValidator,
    rewardModel: v.optional(campaignRewardModelValidator),
    posterStorageId: v.optional(v.id("_storage")),
    posterPortraitStorageId: v.optional(v.id("_storage")),
    posterLandscapeStorageId: v.optional(v.id("_storage")),
    playLimits: v.object({
      maxCouponsPerPlayer: v.number(),
      maxPlaysPerDay: v.optional(v.number()),
      dayTimezone: v.optional(v.string()),
    }),
    rewardRules: v.array(rewardRuleValidator),
    themeOverride: v.optional(themeJsonValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_campaignId", ["campaignId"])
    .index("by_merchant_slug", ["merchantId", "slug"])
    .index("by_merchantId", ["merchantId"]),

  /** 券定义（模板）：活动发券时引用；实例见 merchant_coupons。 */
  merchant_coupon_defs: defineTable({
    couponDefId: v.string(),
    merchantId: v.string(),
    name: v.string(),
    reward: couponRewardDefValidator,
    status: couponDefStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_couponDefId", ["couponDefId"])
    .index("by_merchantId", ["merchantId"])
    .index("by_merchant_status", ["merchantId", "status"]),

  merchant_coupons: defineTable({
    couponId: v.string(),
    code: v.string(),
    merchantId: v.string(),
    campaignId: v.string(),
    uid: v.string(),
    matchId: v.string(),
    ruleId: v.string(),
    couponDefId: v.optional(v.string()),
    rewardSnapshot: couponRewardDefValidator,
    status: couponStatusValidator,
    issuedAt: v.number(),
    expiresAt: v.number(),
    redeemedAt: v.optional(v.number()),
    redeemedByStaffUid: v.optional(v.string()),
    staffNote: v.optional(v.string()),
  })
    .index("by_couponId", ["couponId"])
    .index("by_code", ["code"])
    .index("by_match_rule", ["matchId", "ruleId"])
    .index("by_campaign_uid", ["campaignId", "uid"])
    .index("by_merchant_status", ["merchantId", "status"])
    .index("by_campaignId", ["campaignId"]),

  campaign_leaderboard_settlements: defineTable({
    campaignId: v.string(),
    merchantId: v.string(),
    status: campaignSettlementStatusValidator,
    winnerCount: v.optional(v.number()),
    couponsIssued: v.optional(v.number()),
    error: v.optional(v.string()),
    settledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_campaignId", ["campaignId"]),

  campaign_leaderboard_entries: defineTable({
    campaignId: v.string(),
    uid: v.string(),
    bestScore: v.optional(v.number()),
    rankPoints: v.optional(v.number()),
    plays: v.number(),
    lastSubmittedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_campaign_score", ["campaignId", "bestScore"])
    .index("by_campaign_rankPoints", ["campaignId", "rankPoints"])
    .index("by_campaign_uid", ["campaignId", "uid"]),

  /** 活动累计榜 Bot cohort（首真人 settle 后 seed，与 Portal 周榜 Bot 同思路） */
  campaign_board_cohorts: defineTable({
    campaignId: v.string(),
    merchantId: v.string(),
    mode: campaignModeValidator,
    startsAt: v.number(),
    endsAt: v.number(),
    humanAnchorAt: v.number(),
    status: v.union(v.literal("open"), v.literal("closed")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_campaignId", ["campaignId"]),

  campaign_board_bot_members: defineTable({
    cohortId: v.id("campaign_board_cohorts"),
    campaignId: v.string(),
    slot: v.number(),
    botPersonaId: v.string(),
    revealAt: v.number(),
    periodEndValue: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_cohort", ["cohortId"])
    .index("by_cohort_slot", ["cohortId", "slot"]),

  merchant_theme_sync_jobs: defineTable({
    merchantId: v.string(),
    sourceUrl: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("needs_review"),
      v.literal("live"),
      v.literal("failed")
    ),
    rawExtract: v.optional(v.string()),
    themeDraft: v.optional(themeJsonValidator),
    error: v.optional(v.string()),
    syncedAt: v.number(),
  }).index("by_merchant", ["merchantId"]),
});
