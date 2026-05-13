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
    /** 遗留字段：赛季资源已迁至 `casual_pass_progress`，勿在新代码写入；保留仅为旧文档通过校验 */
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

  /**
   * 周期型锦标时间桶（日/周/季）：同一 `templateId` + `instanceKey` 唯一；`single_match` 不写此表。
   */
  casual_tournament_instances: defineTable({
    templateId: v.string(),
    instanceKey: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    status: v.union(v.literal("open"), v.literal("closed")),
    /** 建桶时固化，收尾排行用 */
    scoreAggregation: v.union(
      v.literal("single_match"),
      v.literal("best_score"),
      v.literal("sum_scores")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_template_instanceKey", ["templateId", "instanceKey"])
    .index("by_template_status_endsAt", ["templateId", "status", "endsAt"]),

  /**
   * 单场异步 run：与 tournament 模块「tournaments + matches + player_matches」同构。
   * `templateId` = 配表 id（如 casual_async_a_solitaire）；每局一条新 tournament / match。
   * 周期型：`instanceId` 指向当前开放桶；`single_match` 省略。
   */
  casual_run_tournaments: defineTable({
    templateId: v.string(),
    gameType: v.string(),
    status: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    instanceId: v.optional(v.id("casual_tournament_instances")),
  })
    .index("by_templateId", ["templateId"])
    .index("by_instanceId", ["instanceId"]),

  /** 玩家在某一周期实例内的聚合分与周期结束待领奖励 */
  casual_instance_player_state: defineTable({
    instanceId: v.id("casual_tournament_instances"),
    uid: v.string(),
    /** `per_instance` 时仅首局扣入场 */
    entryFeeCharged: v.boolean(),
    bestScore: v.optional(v.number()),
    sumScore: v.optional(v.number()),
    matchCount: v.number(),
    /** 实例收尾后写入，供历史页领取 */
    pendingInstanceRewards: v.optional(
      v.object({
        coins: v.optional(v.number()),
        gems: v.optional(v.number()),
        seasonChallengePoints: v.optional(v.number()),
        seasonVoucher: v.optional(v.number()),
      })
    ),
    instanceRewardsClaimedAt: v.optional(v.number()),
    /** 收尾时写入（展示） */
    finalRank: v.optional(v.number()),
    aggregatedScore: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_instance_uid", ["instanceId", "uid"])
    .index("by_uid", ["uid"]),

  /**
   * 周期场分档预发奖：每档一条文档，领取前钱包不落账；`gameHistory` 将同一局同批多档合并为一行展示。
   * `matchGameId` = `casual_run_player_matches.gameId`（`game_${matchId}_${uid}`）。
   */
  casual_score_tier_pending: defineTable({
    uid: v.string(),
    instanceId: v.id("casual_tournament_instances"),
    runTournamentId: v.id("casual_run_tournaments"),
    templateId: v.string(),
    minScore: v.number(),
    matchGameId: v.string(),
    gameType: v.string(),
    coins: v.number(),
    gems: v.number(),
    status: v.union(v.literal("pending"), v.literal("claimed")),
    createdAt: v.number(),
    claimedAt: v.optional(v.number()),
  })
    .index("by_uid", ["uid"])
    .index("by_instance_uid", ["instanceId", "uid"]),

  casual_run_player_tournaments: defineTable({
    uid: v.string(),
    tournamentId: v.id("casual_run_tournaments"),
    templateId: v.string(),
    score: v.optional(v.number()),
    status: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    /** 结算后待用户在历史页领取的金币/钻/赛季挑战类奖励（异步 run 路径） */
    pendingRunRewards: v.optional(
      v.object({
        coins: v.optional(v.number()),
        gems: v.optional(v.number()),
        seasonChallengePoints: v.optional(v.number()),
        seasonVoucher: v.optional(v.number()),
      })
    ),
    runRewardsClaimedAt: v.optional(v.number()),
  })
    .index("by_tournament_uid", ["tournamentId", "uid"])
    .index("by_uid_template", ["uid", "templateId"])
    /** 统计单场 run 真人报名数（`gameHistory`） */
    .index("by_tournament", ["tournamentId"]),

  casual_run_matches: defineTable({
    tournamentId: v.id("casual_run_tournaments"),
    templateId: v.string(),
    gameType: v.string(),
    completed: v.boolean(),
    minPlayers: v.number(),
    maxPlayers: v.number(),
    /** 开局时真人数量（用于 Solitaire 虚拟对手数 = maxPlayers - humanPlayerCount） */
    humanPlayerCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_tournament", ["tournamentId"]),

  /**
   * 异步锦标匹配队列：`joinTournament`（非赛季专场）先入队，由 `tryCasualMatchmakingForTemplate` 凑齐人后建局。
   */
  casual_match_queue: defineTable({
    uid: v.string(),
    /** 配表 tournamentId */
    templateId: v.string(),
    /** `claiming`：已被某次匹配事务预留，防止并发 join 对同一行双重扣费 */
    status: v.union(v.literal("waiting"), v.literal("claiming"), v.literal("matched")),
    matchedRunTournamentId: v.optional(v.id("casual_run_tournaments")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_template_status", ["templateId", "status"])
    .index("by_uid_template_status", ["uid", "templateId", "status"]),

  casual_run_player_matches: defineTable({
    matchId: v.string(),
    tournamentId: v.string(),
    templateId: v.string(),
    uid: v.string(),
    /** TM 对齐：`game_${matchId}_${uid}`，用于结算查找 */
    gameId: v.string(),
    gameType: v.string(),
    externalGameId: v.optional(v.string()),
    score: v.optional(v.number()),
    rank: v.optional(v.number()),
    status: v.union(
      v.literal("open"),
      v.literal("finished"),
      v.literal("settled")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_gameId", ["gameId"])
    .index("by_match_uid", ["matchId", "uid"])
    .index("by_uid_template", ["uid", "templateId"])
    .index("by_uid", ["uid"])
    .index("by_templateId", ["templateId"])
    .index("by_template_external", ["templateId", "externalGameId"])
    .index("by_run_uid", ["tournamentId", "uid"])
    /** `gameHistory` 本场总人数（真人 + 机器人） */
    .index("by_run_tournament", ["tournamentId"]),

  casual_seasons: defineTable({
    seasonId: v.string(),
    name: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    active: v.boolean(),
  }).index("by_seasonId", ["seasonId"]),

  /** 单赛季档案：Pass 进度 + 当季券/挑战点（均按 seasonId 隔离） */
  casual_pass_progress: defineTable({
    uid: v.string(),
    seasonId: v.string(),
    level: v.number(),
    xp: v.number(),
    seasonVouchers: v.optional(v.number()),
    seasonChallengePoints: v.optional(v.number()),
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
