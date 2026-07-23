import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  campaignExperienceTypeValidator,
  campaignModeValidator,
  campaignRewardModelValidator,
  campaignSettlementStatusValidator,
  campaignStatusValidator,
  couponRewardDefValidator,
  couponSourceValidator,
  couponStatusValidator,
  couponDefStatusValidator,
  displayConfigValidator,
  rewardRuleValidator,
  themeJsonValidator,
} from "./service/merchant/validators";

export default defineSchema({
  /**
   * Campaign 应用侧玩家档案（与 Portal `portal_players` / SSO 身份解耦）。
   * 昵称 / 联系方式供活动账户与后续履约使用；身份仍以 platform JWT `uid` 为准。
   */
  campaign_players: defineTable({
    uid: v.string(),
    /** 活动内公开昵称；未设置时前端用 resolvePlayerDisplayName 回退 */
    displayName: v.optional(v.string()),
    displayNameNormalized: v.optional(v.string()),
    displayNameUpdatedAt: v.optional(v.number()),
    verifiedEmail: v.optional(v.string()),
    verifiedPhone: v.optional(v.string()),
    contactVerifiedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_uid", ["uid"])
    .index("by_displayNameNormalized", ["displayNameNormalized"]),

  /**
   * Partner brand + public campaign URL namespace (`/campaign/{slug}/...`).
   * Created when campaignOps is enabled for a partner.
   */
  partner_brands: defineTable({
    partnerId: v.number(),
    slug: v.string(),
    brandSourceUrl: v.optional(v.string()),
    themeJson: v.optional(themeJsonValidator),
    themeVersion: v.optional(v.number()),
    logoStorageId: v.optional(v.id("_storage")),
    updatedAt: v.number(),
  })
    .index("by_partnerId", ["partnerId"])
    .index("by_slug", ["slug"]),

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

  /** 券定义（模板）：活动发券时引用；实例见 coupons。 */
  coupon_defs: defineTable({
    couponDefId: v.string(),
    partnerId: v.number(),
    name: v.string(),
    reward: couponRewardDefValidator,
    status: couponDefStatusValidator,
    /** 使用规则文案（可空）；展示给玩家/店员。 */
    usageRules: v.optional(v.string()),
    /**
     * 领取后有效时长（发券时从 activatesAt 起算，快照到 coupons.expiresAt）。
     * 缺省按 72h（legacy）。
     */
    validity: v.optional(
      v.object({
        kind: v.literal("duration_hours"),
        hours: v.number(),
      })
    ),
    /**
     * 生效策略（发券时快照到 coupons.activatesAt）。
     * 缺省立即生效。
     */
    activation: v.optional(
      v.union(
        v.object({ kind: v.literal("immediate") }),
        v.object({ kind: v.literal("delay_hours"), hours: v.number() }),
        v.object({ kind: v.literal("fixed_at"), atMs: v.number() })
      )
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_couponDefId", ["couponDefId"])
    .index("by_partnerId", ["partnerId"])
    .index("by_partner_status", ["partnerId", "status"]),

  coupons: defineTable({
    couponId: v.string(),
    code: v.string(),
    partnerId: v.number(),
    campaignId: v.string(),
    uid: v.string(),
    /** pass_run | campaign_settle */
    source: couponSourceValidator,
    /**
     * 幂等键（含 uid）：
     * - pass_run: `pr:{campaignId}:{uid}:{runTournamentId}:{ruleId}`
     * - campaign_settle: `cs:{campaignId}:{uid}:{settlementId}:{ruleId}`
     */
    issueKey: v.string(),
    /** pass_run：Portal run id（与历史 runTournamentId 对齐） */
    runTournamentId: v.optional(v.string()),
    /** pass_run 可选：对局排障 */
    matchId: v.optional(v.string()),
    /** campaign_settle：campaign_leaderboard_settlements 文档 id */
    settlementId: v.optional(v.string()),
    ruleId: v.string(),
    couponDefId: v.optional(v.string()),
    rewardSnapshot: couponRewardDefValidator,
    /** Frozen from coupon_defs.usageRules at issue time (Apple Wallet back field). */
    usageRulesSnapshot: v.optional(v.string()),
    status: couponStatusValidator,
    issuedAt: v.number(),
    /** 可核销起始；缺省等同 issuedAt（legacy） */
    activatesAt: v.optional(v.number()),
    expiresAt: v.number(),
    redeemedAt: v.optional(v.number()),
    redeemedAtStoreId: v.optional(v.string()),
    redeemedByStaffUid: v.optional(v.string()),
    staffNote: v.optional(v.string()),
    /** Apple Wallet pass authenticationToken (shared secret with device). */
    passAuthToken: v.optional(v.string()),
    /** Bumped when pass content changes (redeem / void / expire) for web service. */
    passUpdatedAt: v.optional(v.number()),
  })
    .index("by_couponId", ["couponId"])
    .index("by_code", ["code"])
    .index("by_issueKey", ["issueKey"])
    .index("by_campaign_uid", ["campaignId", "uid"])
    .index("by_partner_status", ["partnerId", "status"])
    .index("by_campaignId", ["campaignId"]),

  /**
   * Apple Wallet device registrations for pass updates (PassKit web service).
   * serialNumber === coupons.couponId
   */
  wallet_pass_devices: defineTable({
    deviceLibraryIdentifier: v.string(),
    pushToken: v.string(),
    passTypeIdentifier: v.string(),
    serialNumber: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_serial", ["serialNumber"])
    .index("by_device_passType", ["deviceLibraryIdentifier", "passTypeIdentifier"])
    .index("by_serial_device", ["serialNumber", "deviceLibraryIdentifier"]),

  campaign_leaderboard_settlements: defineTable({
    campaignId: v.string(),
    partnerId: v.number(),
    status: campaignSettlementStatusValidator,
    winnerCount: v.optional(v.number()),
    couponsIssued: v.optional(v.number()),
    error: v.optional(v.string()),
    settledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_campaignId", ["campaignId"]),

  theme_sync_jobs: defineTable({
    partnerId: v.number(),
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
  }).index("by_partner", ["partnerId"]),
});
