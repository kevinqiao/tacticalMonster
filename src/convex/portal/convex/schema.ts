import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  catalogGameType,
  catalogSeedTier,
  rolloutDistributionMetrics,
  rolloutTerminalReason,
} from "./service/seedPool/seedPoolValidators";

export default defineSchema({
  portal_players: defineTable({
    uid: v.string(),
    coins: v.optional(v.number()),
    gems: v.optional(v.number()),
    /** Replay-ticket currency. */
    tickets: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    /** In-game nickname (authoritative for boards); optional until user renames. */
    displayName: v.optional(v.string()),
    displayNameNormalized: v.optional(v.string()),
    displayNameUpdatedAt: v.optional(v.number()),
    /** 礼品卡兑换锁定地区（US / CA / GB / EU …） */
    redemptionRegion: v.optional(v.string()),
    redemptionRegionLockedAt: v.optional(v.number()),
    verifiedEmail: v.optional(v.string()),
    verifiedPhone: v.optional(v.string()),
    contactVerifiedAt: v.optional(v.number()),
    redemptionProfileSyncedAt: v.optional(v.number()),
    /** @deprecated legacy session token; do not write */
    token: v.optional(v.string()),
  })
    .index("by_uid", ["uid"])
    .index("by_displayNameNormalized", ["displayNameNormalized"]),

  /** 金币/钻/门票流水（周联赛领奖、商店、再战等） */
  portal_coin_ledger: defineTable({
    uid: v.string(),
    kind: v.union(v.literal("coins"), v.literal("gems"), v.literal("tickets")),
    delta: v.number(),
    balanceAfter: v.number(),
    reason: v.string(),
    gameType: v.optional(v.string()),
    sourceWeekKey: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_uid_created", ["uid", "createdAt"]),

  /** Portal 兑换商店 SKU（静态配表同步；独立于 casualPlatform） */
  portal_shop_skus: defineTable({
    skuId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    priceCoins: v.number(),
    grantReplayTokenCount: v.optional(v.number()),
    weeklyPurchaseLimit: v.optional(v.number()),
    active: v.boolean(),
    sortOrder: v.number(),
    skuKind: v.optional(
      v.union(v.literal("virtual"), v.literal("giftcard"), v.literal("voucher"))
    ),
    region: v.optional(v.string()),
    faceValueUsd: v.optional(v.number()),
    faceValueLocal: v.optional(v.number()),
    faceValueCurrency: v.optional(v.string()),
    tangoUtid: v.optional(v.string()),
    brandName: v.optional(v.string()),
    brandLogoUrl: v.optional(v.string()),
    scarcityMultiplier: v.optional(v.number()),
    minAccountAgeDays: v.optional(v.number()),
    requiresVerifiedContact: v.optional(v.boolean()),
    shopSection: v.optional(v.string()),
    partnerIds: v.optional(v.array(v.number())),
    /** Voucher fulfillment copy; voucher SKUs without this are still valid. */
    voucherRewardText: v.optional(v.string()),
    voucherValidityDays: v.optional(v.number()),
    /** Voucher listings can be hidden while remaining valid campaign rewards. */
    listInShop: v.optional(v.boolean()),
  }).index("by_skuId", ["skuId"]),

  /** Portal-owned Partner shop assortment and effective catalog overrides. */
  portal_partner_shop_settings: defineTable({
    partnerId: v.number(),
    enabled: v.boolean(),
    giftCardsEnabled: v.boolean(),
    virtualEnabled: v.boolean(),
    /** Optional for legacy rows written before voucher switch existed. */
    vouchersEnabled: v.optional(v.boolean()),
    /** Optional for legacy rows written before ad-coin switch existed. */
    adCoinEnabled: v.optional(v.boolean()),
    assortmentMode: v.union(v.literal("all_shared"), v.literal("allowlist")),
    skuIds: v.optional(v.array(v.string())),
    excludeSkuIds: v.optional(v.array(v.string())),
    overrides: v.optional(
      v.record(
        v.string(),
        v.object({
          priceCoins: v.optional(v.number()),
          title: v.optional(v.string()),
          weeklyPurchaseLimit: v.optional(v.union(v.number(), v.null())),
          sortOrder: v.optional(v.number()),
          active: v.optional(v.boolean()),
          tangoUtid: v.optional(v.string()),
        })
      )
    ),
    updatedAt: v.number(),
  }).index("by_partnerId", ["partnerId"]),

  /** Player-owned vouchers fulfilled by Portal shop and campaign rewards. */
  portal_backpack_items: defineTable({
    uid: v.string(),
    skuId: v.string(),
    title: v.string(),
    rewardText: v.optional(v.string()),
    code: v.string(),
    status: v.union(
      v.literal("owned"),
      v.literal("pending_use"),
      v.literal("redeemed"),
      v.literal("expired"),
      v.literal("void")
    ),
    partnerId: v.optional(v.number()),
    campaignId: v.optional(v.string()),
    source: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    useRequestedAt: v.optional(v.number()),
    redeemedAt: v.optional(v.number()),
    /** Campaign store-staff audit fields for mirrored campaign vouchers. */
    redeemedAtStoreId: v.optional(v.string()),
    redeemedByStaffUid: v.optional(v.string()),
    staffNote: v.optional(v.string()),
    redeemChannel: v.optional(
      v.union(
        v.literal("partner_admin"),
        v.literal("player_request"),
        v.literal("store_staff")
      )
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_uid", ["uid"])
    .index("by_uid_createdAt", ["uid", "createdAt"])
    .index("by_code", ["code"])
    .index("by_partner_status", ["partnerId", "status"])
    .index("by_campaignId_uid", ["campaignId", "uid"]),

  /** Tango 礼品卡兑换订单（金币扣减后异步履约） */
  portal_giftcard_orders: defineTable({
    orderId: v.string(),
    uid: v.string(),
    skuId: v.string(),
    region: v.string(),
    priceCoins: v.number(),
    faceValueUsd: v.number(),
    faceValueLocal: v.number(),
    faceValueCurrency: v.string(),
    tangoUtid: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("fulfilled"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    tangoReferenceOrderId: v.optional(v.string()),
    tangoOrderId: v.optional(v.string()),
    rewardLink: v.optional(v.string()),
    rewardLinkExpiresAt: v.optional(v.number()),
    deliveryEmail: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    attemptCount: v.number(),
    lastAttemptAt: v.optional(v.number()),
    createdAt: v.number(),
    fulfilledAt: v.optional(v.number()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_uid_created", ["uid", "createdAt"])
    .index("by_status", ["status"])
    .index("by_uid_status", ["uid", "status"]),

  portal_shop_weekly_purchase_counters: defineTable({
    uid: v.string(),
    skuId: v.string(),
    weekKey: v.string(),
    count: v.number(),
    updatedAt: v.number(),
  })
    .index("by_uid_sku_week", ["uid", "skuId", "weekKey"])
    .index("by_uid_week", ["uid", "weekKey"]),

  portal_run_tournaments: defineTable({
    templateId: v.string(),
    gameType: v.string(),
    status: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    /** 周期型：指向当前开放桶；`single_match` 省略 */
    instanceId: v.optional(v.id("portal_tournament_instances")),
    campaignId: v.optional(v.string()),
    partnerId: v.optional(v.number()),
    /** Join authorize snapshot: pass_per_run | competitive_leaderboard */
    campaignRewardMode: v.optional(
      v.union(v.literal("pass_per_run"), v.literal("competitive_leaderboard"))
    ),
    /** 0 for pass_per_run; campaign.endsAt for competitive_leaderboard */
    campaignDueTime: v.optional(v.number()),
    /** Join authorize sparse snapshot; overlays partner replay settings at settle. */
    campaignReplaySettings: v.optional(
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
  })
    .index("by_templateId", ["templateId"])
    .index("by_instanceId", ["instanceId"])
    .index("by_campaignId_createdAt", ["campaignId", "createdAt"]),

  portal_run_player_tournaments: defineTable({
    uid: v.string(),
    tournamentId: v.id("portal_run_tournaments"),
    templateId: v.string(),
    score: v.optional(v.number()),
    status: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    pointDelta: v.optional(v.number()),
    weeklyPointsAfter: v.optional(v.number()),
    /** Legacy fields (prod rows); SSOT is portal_run_player_matches. */
    seedScoreThreshold: v.optional(v.number()),
    challengeSuccess: v.optional(v.boolean()),
  })
    .index("by_tournament_uid", ["tournamentId", "uid"])
    .index("by_uid_template", ["uid", "templateId"])
    .index("by_uid_updatedAt", ["uid", "updatedAt"])
    .index("by_tournament", ["tournamentId"]),

  /**
   * 周期场分档预发奖：每档一条文档，领取前钱包不落账；`gameHistory` 将同一局同批多档合并为一行展示。
   * `matchGameId` = `portal_run_player_matches.gameId`（`game_${matchId}_${uid}`）。
   */
  portal_score_tier_pending: defineTable({
    uid: v.string(),
    instanceId: v.id("portal_tournament_instances"),
    runTournamentId: v.id("portal_run_tournaments"),
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

  /** 周期型锦标时间桶（日/周/季）：同一 `templateId` + `instanceKey` 唯一；`single_match` 不写此表。 */
  portal_tournament_instances: defineTable({
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

  /** 玩家在某一周期实例内的聚合分与周期结束待领奖励 */
  portal_instance_player_state: defineTable({
    instanceId: v.id("portal_tournament_instances"),
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

  portal_run_matches: defineTable({
    tournamentId: v.id("portal_run_tournaments"),
    templateId: v.string(),
    gameType: v.string(),
    completed: v.boolean(),
    botsSeeded: v.optional(v.boolean()),
    minPlayers: v.number(),
    maxPlayers: v.number(),
    humanPlayerCount: v.optional(v.number()),
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

  portal_run_player_games: defineTable({
    playerMatchId: v.id("portal_run_player_matches"),
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
    watchReplaySeedId: v.optional(v.string()),
    watchReplayStepsJson: v.optional(v.string()),
    /** scheduler：open 创建后 5 分钟核查是否仍未结算 */
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

  portal_player_tournament_rank_stats: defineTable({
    uid: v.string(),
    templateId: v.string(),
    rankCounts: v.record(v.string(), v.number()),
    updatedAt: v.number(),
  }).index("by_uid_template", ["uid", "templateId"]),

  portal_match_queue: defineTable({
    uid: v.string(),
    templateId: v.string(),
    effectiveHumans: v.optional(v.number()),
    effectiveMinHumans: v.optional(v.number()),
    matchedRuleId: v.optional(v.string()),
    queueExpireAction: v.optional(v.union(v.literal("solo"), v.literal("exit"))),
    expiresAt: v.optional(v.number()),
    skipEntryCharge: v.optional(v.boolean()),
    /** Entry method is validated before enqueue and consumed at open. */
    ticketEntry: v.optional(v.boolean()),
    status: v.union(v.literal("waiting"), v.literal("claiming"), v.literal("matched")),
    matchedRunTournamentId: v.optional(v.id("portal_run_tournaments")),
    campaignId: v.optional(v.string()),
    partnerId: v.optional(v.number()),
    campaignRewardMode: v.optional(
      v.union(v.literal("pass_per_run"), v.literal("competitive_leaderboard"))
    ),
    campaignDueTime: v.optional(v.number()),
    campaignReplaySettings: v.optional(
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
    maxPlaysPerDay: v.optional(v.number()),
    dayTimezone: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_template_status", ["templateId", "status"])
    .index("by_template_status_effective", ["templateId", "status", "effectiveHumans"])
    .index("by_uid", ["uid"])
    .index("by_uid_template_status", ["uid", "templateId", "status"]),

  /** Partner overrides for the free → ad → ticket → coin entry ladder. */
  portal_partner_play_entry_settings: defineTable({
    partnerId: v.number(),
    freePlaySoloDailyCap: v.optional(v.number()),
    freePlayMultiDailyCap: v.optional(v.number()),
    ticketEntryEnabled: v.optional(v.boolean()),
    ticketEntrySoloPriceTickets: v.optional(v.number()),
    ticketEntrySoloDailyCap: v.optional(v.number()),
    ticketEntryMultiPriceTickets: v.optional(v.number()),
    ticketEntryMultiDailyCap: v.optional(v.number()),
    adEntryEnabled: v.optional(v.boolean()),
    adEntrySoloDailyCap: v.optional(v.number()),
    adEntryMultiDailyCap: v.optional(v.number()),
    /** Reserved: coin entry (not wired yet). */
    coinEntryEnabled: v.optional(v.boolean()),
    coinEntrySoloPriceCoins: v.optional(v.number()),
    coinEntrySoloDailyCap: v.optional(v.number()),
    coinEntryMultiPriceCoins: v.optional(v.number()),
    coinEntryMultiDailyCap: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_partnerId", ["partnerId"]),

  /** One ticket-entry count per player/mode/operations day. */
  portal_ticket_entry_daily_usage: defineTable({
    uid: v.string(),
    dayKey: v.string(),
    mode: v.union(v.literal("solo"), v.literal("multi")),
    usedCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_uid_dayKey_mode", ["uid", "dayKey", "mode"]),

  /** Ad-entry session (begin → watch → complete grant). */
  portal_ad_entry_sessions: defineTable({
    sessionId: v.string(),
    uid: v.string(),
    mode: v.union(v.literal("solo"), v.literal("multi")),
    channel: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
    expiresAt: v.number(),
    completedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    clientProof: v.optional(v.string()),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_uid_mode_status", ["uid", "mode", "status"]),

  /**
   * Short-lived grant after a successful ad watch; join with adEntry consumes it
   * and bumps daily usage.
   */
  portal_ad_entry_grants: defineTable({
    grantId: v.string(),
    uid: v.string(),
    mode: v.union(v.literal("solo"), v.literal("multi")),
    sessionId: v.string(),
    dayKey: v.string(),
    status: v.union(
      v.literal("ready"),
      v.literal("consumed"),
      v.literal("expired")
    ),
    createdAt: v.number(),
    expiresAt: v.number(),
    consumedAt: v.optional(v.number()),
  })
    .index("by_grantId", ["grantId"])
    .index("by_uid_mode_status", ["uid", "mode", "status"]),

  /** Ad-entry daily usage (bumped when a grant is consumed at join). */
  portal_ad_entry_daily_usage: defineTable({
    uid: v.string(),
    dayKey: v.string(),
    mode: v.union(v.literal("solo"), v.literal("multi")),
    usedCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_uid_dayKey_mode", ["uid", "dayKey", "mode"]),

  /** Watch-ad-for-coins session (begin → watch → complete grant; shop entry). */
  portal_ad_coin_sessions: defineTable({
    sessionId: v.string(),
    uid: v.string(),
    channel: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
    expiresAt: v.number(),
    completedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    clientProof: v.optional(v.string()),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_uid", ["uid"])
    .index("by_uid_status", ["uid", "status"]),

  /** Watch-ad-for-coins audit (one row per granted claim). */
  portal_ad_coin_claims: defineTable({
    uid: v.string(),
    sessionId: v.string(),
    channel: v.string(),
    dayKey: v.string(),
    coinsGranted: v.number(),
    clientProof: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_uid_dayKey", ["uid", "dayKey"]),

  /** Watch-ad-for-coins daily usage (bumped when coins are granted). */
  portal_ad_coin_daily_usage: defineTable({
    uid: v.string(),
    dayKey: v.string(),
    usedCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_uid_dayKey", ["uid", "dayKey"]),

  portal_bot_personas: defineTable({
    botPersonaId: v.string(),
    poolIndex: v.number(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_personaId", ["botPersonaId"])
    .index("by_poolIndex", ["poolIndex"]),

  portal_run_player_matches: defineTable({
    matchId: v.string(),
    tournamentId: v.string(),
    templateId: v.string(),
    uid: v.string(),
    botPersonaId: v.optional(v.string()),
    sessionKind: v.union(v.literal("single"), v.literal("triathlon")),
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
    /**
     * 再战授权时写入的开局前成绩；交分时与新分取 max，较差再战分丢弃。
     * 结算后清除。
     */
    replayBaselineScore: v.optional(v.number()),
    /** 单人挑战：目标分（P75）；与本局 score/settled 同文档 */
    seedScoreThreshold: v.optional(v.number()),
    /** 单人挑战：是否达标 */
    challengeSuccess: v.optional(v.boolean()),
    /**
     * Campaign pass_run 发奖展示快照（HTTP 成功后回写；与券生命周期解耦）。
     * none=已确认未发券；pending=重试中；synced=历史可展示；failed=重试耗尽。
     */
    campaignRewardSyncStatus: v.optional(
      v.union(
        v.literal("none"),
        v.literal("pending"),
        v.literal("synced"),
        v.literal("failed")
      )
    ),
    campaignRewardLabel: v.optional(v.string()),
    campaignRewardCouponId: v.optional(v.string()),
    campaignRewardSyncedAt: v.optional(v.number()),
    campaignRewardSyncAttempts: v.optional(v.number()),
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
    .index("by_run_tournament", ["tournamentId"]),

  /** 周联赛档案：按 gameType 持久段位 */
  portal_weekly_league_profile: defineTable({
    uid: v.string(),
    gameType: v.string(),
    weeklyLeagueTier: v.string(),
    peakLeagueTier: v.string(),
    updatedAt: v.number(),
  }).index("by_uid_game", ["uid", "gameType"]),

  /** 周联赛 cohort：同 week + gameType + 段位 下分组 */
  portal_weekly_league_cohorts: defineTable({
    weekKey: v.string(),
    gameType: v.string(),
    leagueTierId: v.string(),
    cohortIndex: v.number(),
    /** 用户可见 8 位字母数字组号 */
    displayCode: v.optional(v.string()),
    humanCount: v.number(),
    /** Bot 池人数（创建时 15；匹配结束可能再补） */
    botPoolSize: v.optional(v.number()),
    memberCount: v.optional(v.number()),
    humanAnchorAt: v.optional(v.number()),
    /** 分组创建后匹配截止时间（默认 +5h；亦为延迟 Bot 可见窗口） */
    matchingEndsAt: v.optional(v.number()),
    /** 匹配已结束（满员或超时）；真人不足时再补 Bot 至 30 */
    matchingClosedAt: v.optional(v.number()),
    status: v.union(v.literal("open"), v.literal("closed")),
    startsAt: v.number(),
    endsAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_week_game_tier_status", ["weekKey", "gameType", "leagueTierId", "status"])
    .index("by_week_game_tier_index", ["weekKey", "gameType", "leagueTierId", "cohortIndex"])
    .index("by_status_matching_ends", ["status", "matchingEndsAt"]),

  /** 周联赛成员：组内按 weeklyPoints 排名（结算直接累加） */
  portal_weekly_league_members: defineTable({
    weekKey: v.string(),
    uid: v.string(),
    gameType: v.string(),
    cohortId: v.id("portal_weekly_league_cohorts"),
    leagueTierId: v.string(),
    weeklyPoints: v.number(),
    isBot: v.boolean(),
    revealAt: v.optional(v.number()),
    /** Bot 可见起始分（2–20） */
    botStartPoints: v.optional(v.number()),
    botWeekEndPoints: v.optional(v.number()),
    finalRank: v.optional(v.number()),
    outcome: v.optional(
      v.union(v.literal("promote"), v.literal("safe"), v.literal("demote"))
    ),
    pendingRewards: v.optional(
      v.object({
        coins: v.optional(v.number()),
      })
    ),
    rewardsClaimedAt: v.optional(v.number()),
    unreadClose: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_week_game_uid", ["weekKey", "gameType", "uid"])
    .index("by_uid_game", ["uid", "gameType"])
    .index("by_cohort", ["cohortId"])
    .index("by_week_cohort_points", ["weekKey", "cohortId", "weeklyPoints"]),

  portal_point_ledger: defineTable({
    uid: v.string(),
    runTournamentId: v.id("portal_run_tournaments"),
    gameType: v.string(),
    mode: v.union(v.literal("solo"), v.literal("multi")),
    weekKey: v.string(),
    delta: v.number(),
    reason: v.string(),
    rank: v.optional(v.number()),
    p75Success: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_uid", ["uid"]),

  /** 广告再战会话（begin → complete，短生命周期） */
  portal_ad_replay_sessions: defineTable({
    sessionId: v.string(),
    uid: v.string(),
    matchGameId: v.string(),
    matchId: v.string(),
    channel: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
    expiresAt: v.number(),
    completedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    clientProof: v.optional(v.string()),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_uid", ["uid"])
    .index("by_uid_matchGameId", ["uid", "matchGameId"]),

  /** 广告再战审计（每日上限见 portal_partner_replay_settings / 默认无限；同一 gameId 每 replayEpoch 一次） */
  portal_ad_replay_claims: defineTable({
    uid: v.string(),
    matchGameId: v.string(),
    sessionId: v.string(),
    channel: v.string(),
    weekKey: v.string(),
    dayKey: v.string(),
    /** authorize 前的 replayEpoch；同一 epoch 仅允许一次广告再战 */
    replayEpoch: v.optional(v.number()),
    clientProof: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_uid_matchGameId", ["uid", "matchGameId"])
    .index("by_uid_matchGameId_replayEpoch", ["uid", "matchGameId", "replayEpoch"])
    .index("by_uid_dayKey", ["uid", "dayKey"]),

  /** 广告再战每日用量（原子计数；cap 以本表为准，claims 作审计） */
  portal_ad_replay_daily_usage: defineTable({
    uid: v.string(),
    dayKey: v.string(),
    usedCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_uid_dayKey", ["uid", "dayKey"]),

  /**
   * Per-partner replay ladder cache (SoT on SSO partner.data.replay / legacy flat keys).
   * Replaces portal_partner_ad_settings (adReplayDailyCap-only).
   */
  portal_partner_replay_settings: defineTable({
    partnerId: v.number(),
    maxReplaysPerMatch: v.optional(v.number()),
    adReplayEnabled: v.optional(v.boolean()),
    adReplayDailyCap: v.number(),
    ticketReplayEnabled: v.optional(v.boolean()),
    ticketReplayPriceTickets: v.optional(v.number()),
    coinReplayEnabled: v.optional(v.boolean()),
    coinReplayPriceCoins: v.optional(v.number()),
    coinReplayDailyCap: v.optional(v.union(v.number(), v.null())),
    updatedAt: v.number(),
  }).index("by_partnerId", ["partnerId"]),

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
    solvable: v.optional(
      v.union(v.literal("solvable"), v.literal("unsolvable"), v.literal("unknown"))
    ),
    solvableSource: v.optional(
      v.union(v.literal("empirical_completed"), v.literal("search"))
    ),
    solvableReason: v.optional(v.union(v.string(), v.null())),
  })
    .index("by_gameType_and_poolVersion", ["gameType", "poolVersion"])
    .index("by_gameType_poolVersion_seedId", ["gameType", "poolVersion", "seedId"])
    .index("by_gameType_poolVersion_tier", ["gameType", "poolVersion", "tier"])
    .index("by_gameType_poolVersion_solvable", ["gameType", "poolVersion", "solvable"]),

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
    .index("by_gameType_uid_poolVersion_seedId", ["gameType", "uid", "poolVersion", "seedId"])
    .index("by_matchId", ["matchId"]),

  /** Merchant campaign competitive leaderboard (Portal SSOT). */
  campaign_league_boards: defineTable({
    campaignId: v.string(),
    partnerId: v.number(),
    mode: v.union(v.literal("solo"), v.literal("multi")),
    startsAt: v.number(),
    dueTime: v.number(),
    humanAnchorAt: v.number(),
    status: v.union(v.literal("open"), v.literal("closed")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_campaignId", ["campaignId"]),

  campaign_league_entries: defineTable({
    campaignId: v.string(),
    uid: v.string(),
    isBot: v.boolean(),
    bestScore: v.optional(v.number()),
    rankPoints: v.optional(v.number()),
    plays: v.number(),
    lastSubmittedAt: v.optional(v.number()),
    revealAt: v.optional(v.number()),
    botPeriodEndValue: v.optional(v.number()),
    botPersonaId: v.optional(v.string()),
    slot: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_campaign_uid", ["campaignId", "uid"])
    .index("by_campaign_score", ["campaignId", "bestScore"])
    .index("by_campaign_rankPoints", ["campaignId", "rankPoints"])
    .index("by_campaign_bots", ["campaignId", "isBot"]),

  /**
   * Agent / MCP short-lived play credentials.
   * Issued for an SSO `uid`; redeemed once by web/Mini App `/embed/play?launch=…`.
   */
  portal_launch_tokens: defineTable({
    token: v.string(),
    uid: v.string(),
    partnerId: v.optional(v.number()),
    templateId: v.string(),
    surface: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("used"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    gameId: v.optional(v.string()),
    matchId: v.optional(v.string()),
    runTournamentId: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_uid", ["uid"])
    .index("by_uid_status", ["uid", "status"]),

  /** Play outcome reported back to Agent/MCP after a launched run. */
  portal_agent_play_results: defineTable({
    token: v.string(),
    uid: v.string(),
    templateId: v.string(),
    gameId: v.optional(v.string()),
    matchId: v.optional(v.string()),
    score: v.optional(v.number()),
    result: v.optional(v.string()),
    durationSec: v.optional(v.number()),
    payload: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_uid", ["uid"]),
});
