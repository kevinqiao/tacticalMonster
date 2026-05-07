import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** 活动作用域：`type` 与各分支字段绑定，避免 kind + scope 无效组合 */
const casualActivityTarget = v.union(
  v.object({ type: v.literal("global") }),
  v.object({
    type: v.literal("tournament_match"),
    tournamentId: v.optional(v.string()),
  }),
  v.object({
    type: v.literal("season_shelf_sku"),
    shelfSkuId: v.optional(v.string()),
  }),
  v.object({
    type: v.literal("casual_shop_sku"),
    shopSkuId: v.optional(v.string()),
  })
);

export default defineSchema({
  casual_players: defineTable({
    uid: v.string(),
    token: v.optional(v.string()),
    coins: v.optional(v.number()),
    gems: v.optional(v.number()),
    seasonXp: v.optional(v.number()),
    seasonVouchers: v.optional(v.number()),
    /** 赛季挑战产出；用于专场货架解锁/直购（赛季末可清零，见产品公示） */
    seasonChallengePoints: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_uid", ["uid"]),

  casual_tournaments: defineTable({
    tournamentId: v.string(),
    title: v.string(),
    gameId: v.string(),
    matchType: v.string(),
    status: v.string(),
    endsAt: v.optional(v.number()),
  }).index("by_tournamentId", ["tournamentId"]),

  casual_entries: defineTable({
    uid: v.string(),
    tournamentId: v.string(),
    score: v.optional(v.number()),
    submittedAt: v.optional(v.number()),
    externalGameId: v.optional(v.string()),
    entryStatus: v.optional(
      v.union(v.literal("joined"), v.literal("submitted"))
    ),
  })
    .index("by_uid_tournament", ["uid", "tournamentId"])
    .index("by_tournament_score", ["tournamentId", "score"]),

  casual_seasons: defineTable({
    seasonId: v.string(),
    name: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    active: v.boolean(),
  }).index("by_seasonId", ["seasonId"]),

  casual_pass_progress: defineTable({
    uid: v.string(),
    seasonId: v.string(),
    level: v.number(),
    xp: v.number(),
    tracksPurchased: v.optional(
      v.object({
        standard: v.optional(v.boolean()),
        deluxe: v.optional(v.boolean()),
      })
    ),
    updatedAt: v.number(),
  }).index("by_uid_season", ["uid", "seasonId"]),

  casual_tasks: defineTable({
    uid: v.string(),
    taskId: v.string(),
    /** 与 `casualMissionTemplates` tier 对应：`d:YYYY-MM-DD` / `w:YYYY-MM-DD`(运营周一) / `s:seasonId` */
    periodKey: v.string(),
    progress: v.number(),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_uid_task_period", ["uid", "taskId", "periodKey"]),

  casual_task_claims: defineTable({
    uid: v.string(),
    taskId: v.string(),
    periodKey: v.string(),
    claimedAt: v.number(),
  }).index("by_uid_claim_task_period", ["uid", "taskId", "periodKey"]),

  /** 每日签到连签状态（P3） */
  casual_checkin_streaks: defineTable({
    uid: v.string(),
    streakCount: v.number(),
    lastClaimPeriodKey: v.string(),
    updatedAt: v.number(),
  }).index("by_uid", ["uid"]),

  /** 任务生命周期埋点（progress/completed/claimed/claim_failed） */
  casual_task_events: defineTable({
    uid: v.string(),
    taskId: v.string(),
    tier: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("season"))),
    periodKey: v.optional(v.string()),
    eventType: v.union(
      v.literal("task_progressed"),
      v.literal("task_completed"),
      v.literal("task_claimed"),
      v.literal("task_claim_failed")
    ),
    objectiveKind: v.optional(v.string()),
    delta: v.optional(v.number()),
    progress: v.optional(v.number()),
    target: v.optional(v.number()),
    matchType: v.optional(v.string()),
    challengePointsEarned: v.optional(v.number()),
    errorCode: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_uid_createdAt", ["uid", "createdAt"])
    .index("by_task_event_createdAt", ["taskId", "eventType", "createdAt"]),

  casual_pass_claims: defineTable({
    uid: v.string(),
    seasonId: v.string(),
    track: v.union(
      v.literal("free"),
      v.literal("standard"),
      v.literal("deluxe")
    ),
    level: v.number(),
    claimedAt: v.number(),
  }).index("by_uid_season_track_level", ["uid", "seasonId", "track", "level"]),

  casual_player_season_stats: defineTable({
    uid: v.string(),
    seasonId: v.string(),
    mainSeasonPoints: v.number(),
    cArenaPoints: v.number(),
    updatedAt: v.number(),
  }).index("by_season_uid", ["seasonId", "uid"]),

  casual_shop_skus: defineTable({
    skuId: v.string(),
    title: v.string(),
    /** `iap`：仅展示法币价；到账须走支付/SDK，`purchaseSku` 会直接拒绝 */
    skuKind: v.optional(v.union(v.literal("virtual"), v.literal("iap"))),
    /** 法币展示价（例 ¥6），由运营配置；不参与虚拟货币结算 */
    iapPriceLabel: v.optional(v.string()),
    priceCoins: v.optional(v.number()),
    priceGems: v.optional(v.number()),
    grantCoins: v.optional(v.number()),
    grantGems: v.optional(v.number()),
    active: v.boolean(),
  }).index("by_skuId", ["skuId"]),

  casual_season_snapshots: defineTable({
    seasonId: v.string(),
    kind: v.string(),
    createdAt: v.number(),
    payloadJson: v.string(),
  }).index("by_season_kind", ["seasonId", "kind"]),

  casual_season_shelf_redemptions: defineTable({
    uid: v.string(),
    skuId: v.string(),
    redeemedAt: v.number(),
  }).index("by_uid_sku", ["uid", "skuId"]),

  casual_fixed_chest_opens: defineTable({
    uid: v.string(),
    chestId: v.string(),
    openedAt: v.number(),
  }).index("by_uid_chest", ["uid", "chestId"]),

  /** 法币 IAP 到账幂等：paymentRef 须为支付渠道唯一交易号 */
  casual_shop_iap_fulfillments: defineTable({
    paymentRef: v.string(),
    uid: v.string(),
    skuId: v.string(),
    gemsGranted: v.number(),
    activityIdsJson: v.optional(v.string()),
    fulfilledAt: v.number(),
  }).index("by_paymentRef", ["paymentRef"]),

  casual_activities: defineTable({
    activityId: v.string(),
    title: v.string(),
    target: casualActivityTarget,
    seasonId: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.number(),
    active: v.boolean(),
    effects: v.object({
      voucherCostMultiplier: v.optional(v.number()),
      voucherCostDelta: v.optional(v.number()),
      passXpMultiplier: v.optional(v.number()),
      passXpDelta: v.optional(v.number()),
      coinsCostMultiplier: v.optional(v.number()),
      coinsCostDelta: v.optional(v.number()),
      gemsCostMultiplier: v.optional(v.number()),
      gemsCostDelta: v.optional(v.number()),
      /** 法币→钻 IAP 到账基数：floor(grantGems × mult + delta)，与 `fulfillIapShopPurchase` 一致 */
      iapGrantGemsMultiplier: v.optional(v.number()),
      iapGrantGemsDelta: v.optional(v.number()),
    }),
    updatedAt: v.number(),
  })
    .index("by_activityId", ["activityId"])
    .index("by_active_startsAt", ["active", "startsAt"]),
});
