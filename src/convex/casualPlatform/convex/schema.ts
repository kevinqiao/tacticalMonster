import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  catalogGameType,
  catalogSeedTier,
  rolloutDistributionMetrics,
  rolloutTerminalReason,
} from "./service/seedPool/seedPoolValidators";

/** 活动作用域：`type` 与各分支字段绑定，避免 kind + scope 无效组合 */
const casualActivityTarget = v.union(
  v.object({ type: v.literal("global") }),
  v.object({
    type: v.literal("tournament_match"),
    tournamentId: v.optional(v.string()),
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
    gameType: v.string(),
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
    /** 结算后待用户在历史页领取的金币/钻/赛季券等奖励（异步 run 路径） */
    pendingRunRewards: v.optional(
      v.object({
        coins: v.optional(v.number()),
        gems: v.optional(v.number()),
        seasonVoucher: v.optional(v.number()),
      })
    ),
    runRewardsClaimedAt: v.optional(v.number()),
  })
    .index("by_tournament_uid", ["tournamentId", "uid"])
    .index("by_uid_template", ["uid", "templateId"])
    .index("by_uid_updatedAt", ["uid", "updatedAt"])
    /** 统计单场 run 真人报名数（`gameHistory`） */
    .index("by_tournament", ["tournamentId"]),

  casual_run_matches: defineTable({
    tournamentId: v.id("casual_run_tournaments"),
    templateId: v.string(),
    gameType: v.string(),
    completed: v.boolean(),
    /** 首个真人提交后虚拟对手已固定（freeze_once） */
    botsSeeded: v.optional(v.boolean()),
    minPlayers: v.number(),
    maxPlayers: v.number(),
    /** 开局时真人数量（异步虚拟对手数 = maxPlayers - humanPlayerCount） */
    humanPlayerCount: v.optional(v.number()),
    /** @deprecated seed 改存 `casual_run_player_games`；保留字段供旧文档校验 */
    seedBinding: v.optional(
      v.object({
        seedId: v.string(),
        poolVersion: v.string(),
        tier: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
        scoreQuantiles: v.optional(
          v.object({
            p10: v.number(),
            p25: v.number(),
            p30: v.number(),
            p33: v.number(),
            p50: v.number(),
            p66: v.number(),
            p70: v.number(),
            p75: v.number(),
            p90: v.number(),
          })
        ),
      })
    ),
    seedResolveError: v.optional(v.string()),
    openPhase: v.optional(v.union(v.literal("pending_seed"), v.literal("ready"))),
    /** 开桌时各真人 uid 的入场扣费快照；开桌失败回滚时用于退款 */
    joinChargeByUid: v.optional(
      v.record(
        v.string(),
        v.object({
          vouchersCharged: v.optional(v.number()),
          coinsCharged: v.optional(v.number()),
          gemsCharged: v.optional(v.number()),
        })
      )
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    asyncMatchFinalizeScheduledId: v.optional(v.id("_scheduled_functions")),
    asyncMatchFinalizeDueAt: v.optional(v.number()),
  }).index("by_tournament", ["tournamentId"]),

  /** 每局游戏一行：loadGame / ingest 主键；seed 快照在此表 */
  casual_run_player_games: defineTable({
    playerMatchId: v.id("casual_run_player_matches"),
    matchId: v.string(),
    uid: v.string(),
    templateId: v.string(),
    gameIndex: v.number(),
    gameType: v.string(),
    gameId: v.string(),
    seedBinding: v.object({
      seedId: v.string(),
      poolVersion: v.string(),
      tier: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
      scoreQuantiles: v.optional(
        v.object({
          p10: v.number(),
          p25: v.number(),
          p30: v.number(),
          p33: v.number(),
          p50: v.number(),
          p66: v.number(),
          p70: v.number(),
          p75: v.number(),
          p90: v.number(),
        })
      ),
    }),
    score: v.optional(v.number()),
    status: v.union(
      v.literal("locked"),
      v.literal("open"),
      v.literal("finished"),
      v.literal("confirmed"),
      v.literal("settled"),
      v.literal("replaying")
    ),
    finishedAt: v.optional(v.number()),
    replayEpoch: v.optional(v.number()),
    revealAt: v.optional(v.number()),
    duration: v.optional(v.number()),
    rolloutIndex: v.optional(v.number()),
    botRevealed: v.optional(v.boolean()),
    /** 真人交分快照：历史/榜复盘不依赖游戏服库 */
    watchReplaySeedId: v.optional(v.string()),
    watchReplayStepsJson: v.optional(v.string()),
    openSettleCheckScheduledId: v.optional(v.id("_scheduled_functions")),
    openSettleCheckDueAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_gameId", ["gameId"])
    .index("by_playerMatch_gameIndex", ["playerMatchId", "gameIndex"])
    .index("by_match_uid", ["matchId", "uid"])
    .index("by_uid", ["uid"])
    .index("by_matchId", ["matchId"]),

  /** 玩家在各异步模板下的终局名次累计（1–4 档；实际名次 >3 归入第 4 档，用于 rankRates 平衡抽样） */
  casual_player_tournament_rank_stats: defineTable({
    uid: v.string(),
    templateId: v.string(),
    /** 键 "1".."4"；历史 "5+" 读取时会合并入 "4" */
    rankCounts: v.record(v.string(), v.number()),
    updatedAt: v.number(),
  }).index("by_uid_template", ["uid", "templateId"]),

  /**
   * 异步锦标匹配队列：`joinTournament`（非赛季专场）先入队，由 `tryCasualMatchmakingForTemplate` 凑齐人后建局。
   */
  casual_match_queue: defineTable({
    uid: v.string(),
    /** 配表 tournamentId */
    templateId: v.string(),
    /** join 时规则引擎写入；process 唯一依据（读时 effectiveHumans ?? effectiveMinHumans ?? default） */
    effectiveHumans: v.optional(v.number()),
    /** @deprecated 迁移前字段；新写入仅用 effectiveHumans */
    effectiveMinHumans: v.optional(v.number()),
    matchedRuleId: v.optional(v.string()),
    /** eff>1 超时：`solo` 开单人桌；`exit` 移出队列 */
    queueExpireAction: v.optional(v.union(v.literal("solo"), v.literal("exit"))),
    /** 仅 effectiveHumans > 1 */
    expiresAt: v.optional(v.number()),
    skipEntryCharge: v.optional(v.boolean()),
    /** `claiming`：已被某次匹配事务预留，防止并发 join 对同一行双重扣费 */
    status: v.union(v.literal("waiting"), v.literal("claiming"), v.literal("matched")),
    matchedRunTournamentId: v.optional(v.id("casual_run_tournaments")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_template_status", ["templateId", "status"])
    .index("by_template_status_effective", ["templateId", "status", "effectiveHumans"])
    .index("by_uid", ["uid"])
    .index("by_uid_template_status", ["uid", "templateId", "status"]),

  casual_run_player_matches: defineTable({
    matchId: v.string(),
    tournamentId: v.string(),
    templateId: v.string(),
    uid: v.string(),
    sessionKind: v.union(v.literal("single"), v.literal("triathlon")),
    /** 冗余当前 open 的 `player_games.gameId` */
    gameId: v.optional(v.string()),
    gameType: v.string(),
    score: v.optional(v.number()),
    rank: v.optional(v.number()),
    status: v.union(
      v.literal("open"),
      v.literal("finished"),
      v.literal("confirmed"),
      v.literal("settled"),
      v.literal("replaying")
    ),
    finishedAt: v.optional(v.number()),
    replayEpoch: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_gameId", ["gameId"])
    .index("by_matchId", ["matchId"])
    .index("by_match_uid", ["matchId", "uid"])
    .index("by_uid_template", ["uid", "templateId"])
    .index("by_uid", ["uid"])
    .index("by_templateId", ["templateId"])
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

  /** 单赛季档案：Pass 进度 + 当季券（按 seasonId 隔离） */
  casual_pass_progress: defineTable({
    uid: v.string(),
    seasonId: v.string(),
    level: v.number(),
    xp: v.number(),
    seasonVouchers: v.optional(v.number()),
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

  /** 多游戏 Pass 任务：按 `(taskId, periodKey, platformGameType)` 累计局数 */
  casual_task_game_progress: defineTable({
    uid: v.string(),
    taskId: v.string(),
    periodKey: v.string(),
    platformGameType: v.string(),
    count: v.number(),
    updatedAt: v.number(),
  }).index("by_uid_task_period_game", ["uid", "taskId", "periodKey", "platformGameType"])
    .index("by_uid_task_period", ["uid", "taskId", "periodKey"]),

  /** 每日签到连签状态（P3） */
  casual_checkin_streaks: defineTable({
    uid: v.string(),
    streakCount: v.number(),
    lastClaimPeriodKey: v.string(),
    updatedAt: v.number(),
  }).index("by_uid", ["uid"]),

  /** 当日 XP 递减与 p75 金币软顶计数（`async` / `season_challenge` / `solo_p75`） */
  casual_payout_daily_counters: defineTable({
    uid: v.string(),
    periodKey: v.string(),
    bucket: v.string(),
    settledCount: v.number(),
    coinsGrantedToday: v.number(),
    updatedAt: v.number(),
  }).index("by_uid_period_bucket", ["uid", "periodKey", "bucket"]),

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

  /** 周联赛 cohort：同 `weekKey` + `leagueTierId` 下按 `cohortIndex` 分组 */
  casual_weekly_league_cohorts: defineTable({
    weekKey: v.string(),
    leagueTierId: v.string(),
    cohortIndex: v.number(),
    memberCount: v.number(),
    /** 真人数量（≤15） */
    humanCount: v.optional(v.number()),
    /** 本 cohort 第一个真人入组时刻；用于 bot reveal 锚点 */
    humanAnchorAt: v.optional(v.number()),
    status: v.union(v.literal("open"), v.literal("closed")),
    startsAt: v.number(),
    endsAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_week_tier_status", ["weekKey", "leagueTierId", "status"])
    .index("by_week_tier_cohortIndex", ["weekKey", "leagueTierId", "cohortIndex"]),

  /** 周联赛成员：当周 cohort 内 League XP 与周尾结果 */
  casual_weekly_league_members: defineTable({
    weekKey: v.string(),
    uid: v.string(),
    cohortId: v.id("casual_weekly_league_cohorts"),
    leagueTierId: v.string(),
    weeklyLeagueXp: v.number(),
    isBot: v.boolean(),
    /** bot 上榜时刻（ms）；未到期在 UI 显示「匹配中」 */
    revealAt: v.optional(v.number()),
    finalRank: v.optional(v.number()),
    outcome: v.optional(
      v.union(v.literal("promote"), v.literal("safe"), v.literal("demote"))
    ),
    pendingRewards: v.optional(
      v.object({
        coins: v.optional(v.number()),
        gems: v.optional(v.number()),
        seasonVoucher: v.optional(v.number()),
      })
    ),
    rewardsClaimedAt: v.optional(v.number()),
    unreadClose: v.optional(v.boolean()),
    /** 运营日 League XP 累计（单人软上限） */
    dailyLeagueXpByPeriodKey: v.optional(v.record(v.string(), v.number())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_week_uid", ["weekKey", "uid"])
    .index("by_cohort", ["cohortId"])
    .index("by_week_cohort_xp", ["weekKey", "cohortId", "weeklyLeagueXp"]),

  /** 周联赛档案：跨周持久段位与历史峰值 */
  casual_weekly_league_profile: defineTable({
    uid: v.string(),
    weeklyLeagueTier: v.string(),
    peakLeagueTier: v.string(),
    seasonPeakLeagueTier: v.optional(v.string()),
    /** 累计周赛晋级次数（成就） */
    totalWeeklyPromotions: v.optional(v.number()),
    /** 异步多人第一名累计（成就） */
    totalMultiplayerWins: v.optional(v.number()),
    /** 有效结算胜场累计（成就） */
    totalMatchWins: v.optional(v.number()),
    /** 三合一完成累计（成就） */
    totalTriathlonCompletes: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_uid", ["uid"]),

  /** 玩家成就解锁记录 */
  casual_player_achievements: defineTable({
    uid: v.string(),
    achievementId: v.string(),
    unlockedAt: v.number(),
    metadataJson: v.optional(v.string()),
  })
    .index("by_uid", ["uid"])
    .index("by_uid_achievement", ["uid", "achievementId"]),

  casual_shop_skus: defineTable({
    skuId: v.string(),
    title: v.string(),
    /** `iap`：仅展示法币价；到账须走支付/SDK，`purchaseSku` 会直接拒绝 */
    skuKind: v.optional(v.union(v.literal("virtual"), v.literal("iap"), v.literal("skin"))),
    grantSkinId: v.optional(v.string()),
    /** 法币展示价（例 ¥6），由运营配置；不参与虚拟货币结算 */
    iapPriceLabel: v.optional(v.string()),
    priceCoins: v.optional(v.number()),
    priceGems: v.optional(v.number()),
    grantCoins: v.optional(v.number()),
    grantGems: v.optional(v.number()),
    grantReplayTokenCount: v.optional(v.number()),
    active: v.boolean(),
  }).index("by_skuId", ["skuId"]),

  /** 商店 discretionary SKU 周购买计数（配表 `weeklyPurchaseLimit` 对齐） */
  casual_shop_weekly_purchase_counters: defineTable({
    uid: v.string(),
    periodKey: v.string(),
    skuId: v.string(),
    purchaseCount: v.number(),
    updatedAt: v.number(),
  }).index("by_uid_period_sku", ["uid", "periodKey", "skuId"]),

  casual_season_snapshots: defineTable({
    seasonId: v.string(),
    kind: v.string(),
    createdAt: v.number(),
    payloadJson: v.string(),
  }).index("by_season_kind", ["seasonId", "kind"]),

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
    coinsGranted: v.optional(v.number()),
    activityIdsJson: v.optional(v.string()),
    fulfilledAt: v.number(),
  }).index("by_paymentRef", ["paymentRef"]),

  /** 玩家已拥有皮肤（幂等发放） */
  casual_player_skins: defineTable({
    uid: v.string(),
    skinId: v.string(),
    grantedAt: v.number(),
    source: v.union(
      v.literal("pass"),
      v.literal("shop"),
      v.literal("achievement"),
      v.literal("season_auto")
    ),
    seasonId: v.optional(v.string()),
  })
    .index("by_uid", ["uid"])
    .index("by_uid_skinId", ["uid", "skinId"]),

  /** 玩家当前装备槽 */
  casual_player_skin_equip: defineTable({
    uid: v.string(),
    slot: v.string(),
    skinId: v.string(),
    updatedAt: v.number(),
  }).index("by_uid_slot", ["uid", "slot"]),

  /** Town 布局（v1 默认布局 + 可选编辑） */
  casual_player_town_state: defineTable({
    uid: v.string(),
    layoutJson: v.string(),
    updatedAt: v.number(),
  }).index("by_uid", ["uid"]),

  /** 再战令：消耗后 `startCasualRunReplay` 在同一 match/gameId 上重玩并重传分数（seasonVouchers 场不可用） */
  casual_replay_tokens: defineTable({
    uid: v.string(),
    createdAt: v.number(),
    usedAt: v.optional(v.number()),
    usedForTournamentId: v.optional(v.string()),
  }).index("by_uid", ["uid"]),

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

  /** Seed catalog（原 casualSeedCatalog，已并入 platform） */
  seed_pool_meta: defineTable({
    gameType: catalogGameType,
    poolVersion: v.string(),
    rolloutCount: v.number(),
    matchTimeLimitSec: v.number(),
    generatedAt: v.string(),
    entryCount: v.number(),
    isActive: v.boolean(),
    importStatus: v.optional(v.union(v.literal("importing"), v.literal("ready"))),
    importedAt: v.number(),
  })
    .index("by_gameType_and_poolVersion", ["gameType", "poolVersion"])
    .index("by_gameType_and_isActive", ["gameType", "isActive"]),

  seed_pool_entries: defineTable({
    gameType: catalogGameType,
    poolVersion: v.string(),
    seedId: v.string(),
    tier: catalogSeedTier,
    difficultyScore: v.number(),
    metrics: rolloutDistributionMetrics,
  })
    .index("by_gameType_and_poolVersion", ["gameType", "poolVersion"])
    .index("by_gameType_poolVersion_seedId", ["gameType", "poolVersion", "seedId"])
    .index("by_gameType_poolVersion_tier", ["gameType", "poolVersion", "tier"]),

  seed_pool_rollout_summaries: defineTable({
    gameType: catalogGameType,
    poolVersion: v.string(),
    seedId: v.string(),
    rolloutIndex: v.number(),
    finalScore: v.number(),
    moves: v.number(),
    completed: v.boolean(),
    terminalReason: rolloutTerminalReason,
    elapsedSimSeconds: v.number(),
    opCount: v.number(),
  })
    .index("by_gameType_and_poolVersion", ["gameType", "poolVersion"])
    .index("by_gameType_poolVersion_seedId", ["gameType", "poolVersion", "seedId"])
    .index("by_gameType_poolVersion_seedId_rolloutIndex", [
      "gameType",
      "poolVersion",
      "seedId",
      "rolloutIndex",
    ]),

  match_seed_picks: defineTable({
    gameType: catalogGameType,
    matchId: v.string(),
    seedId: v.string(),
    poolVersion: v.string(),
    uids: v.array(v.string()),
    sessionKey: v.string(),
    pickedAt: v.number(),
  }).index("by_gameType_and_matchId", ["gameType", "matchId"]),

  player_seeds: defineTable({
    gameType: catalogGameType,
    uid: v.string(),
    seedId: v.string(),
    poolVersion: v.string(),
    matchId: v.optional(v.string()),
    usedAt: v.number(),
  })
    .index("by_gameType_uid_poolVersion", ["gameType", "uid", "poolVersion"])
    .index("by_gameType_uid_poolVersion_seedId", [
      "gameType",
      "uid",
      "poolVersion",
      "seedId",
    ])
    .index("by_matchId", ["matchId"]),
});
