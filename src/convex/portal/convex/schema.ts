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

  /**
   * Scoped wallets (SoT for balances). scopeKey = "shared" | `lobby:${lobbyId}`.
   * portal_players keeps identity/profile; legacy coins/gems/tickets migrate to shared.
   */
  portal_player_wallets: defineTable({
    uid: v.string(),
    scopeKey: v.string(),
    coins: v.optional(v.number()),
    gems: v.optional(v.number()),
    tickets: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_uid_scopeKey", ["uid", "scopeKey"]),

  /** 金币/钻/门票流水（周联赛领奖、商店、再战等） */
  portal_coin_ledger: defineTable({
    uid: v.string(),
    kind: v.union(v.literal("coins"), v.literal("gems"), v.literal("tickets")),
    delta: v.number(),
    balanceAfter: v.number(),
    reason: v.string(),
    gameType: v.optional(v.string()),
    sourceWeekKey: v.optional(v.string()),
    /** Economy partition; omit on legacy rows (= shared). */
    scopeKey: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
    createdAt: v.number(),
  })
    .index("by_uid_created", ["uid", "createdAt"])
    .index("by_uid_scopeKey_created", ["uid", "scopeKey", "createdAt"]),

  /** Portal 兑换商店 SKU（静态配表同步；独立于 casualPlatform） */
  portal_shop_skus: defineTable({
    skuId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    priceCoins: v.number(),
    /** Tickets granted (entry + replay). Prefer over grantReplayTokenCount. */
    grantTicketCount: v.optional(v.number()),
    /** @deprecated Legacy alias; readers use grantTicketCount ?? grantReplayTokenCount. */
    grantReplayTokenCount: v.optional(v.number()),
    grantCoinCount: v.optional(v.number()),
    weeklyPurchaseLimit: v.optional(v.number()),
    active: v.boolean(),
    sortOrder: v.number(),
    skuKind: v.optional(
      v.union(
        v.literal("virtual"),
        v.literal("giftcard"),
        v.literal("voucher"),
        v.literal("iap")
      )
    ),
    stripePriceId: v.optional(v.string()),
    priceCents: v.optional(v.number()),
    currency: v.optional(v.string()),
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

  /**
   * Fiat (Stripe) shop orders — keyed by Checkout Session id (paymentRef).
   * pending: Checkout created (intent); fulfilled: paid + grants applied.
   * Legacy rows may omit status/createdAt (treat as fulfilled).
   */
  portal_shop_iap_fulfillments: defineTable({
    paymentRef: v.string(),
    uid: v.string(),
    skuId: v.string(),
    scopeKey: v.string(),
    lobbyId: v.optional(v.id("portal_lobbies")),
    /** Expected (pending) or applied (fulfilled) grant amounts. */
    ticketsGranted: v.number(),
    coinsGranted: v.number(),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("fulfilled"), v.literal("expired"))
    ),
    createdAt: v.optional(v.number()),
    fulfilledAt: v.optional(v.number()),
  })
    .index("by_paymentRef", ["paymentRef"])
    .index("by_uid_fulfilledAt", ["uid", "fulfilledAt"])
    .index("by_uid_createdAt", ["uid", "createdAt"])
    .index("by_uid_status", ["uid", "status"]),

  /** Portal-owned Partner shop assortment and effective catalog overrides. */
  portal_partner_shop_settings: defineTable({
    partnerId: v.number(),
    /** Omit = partner base; set = lobby overlay when lobbyOpsMode=isolated. */
    lobbyId: v.optional(v.id("portal_lobbies")),
    enabled: v.boolean(),
    giftCardsEnabled: v.boolean(),
    virtualEnabled: v.boolean(),
    /** Optional for legacy rows written before voucher switch existed. */
    vouchersEnabled: v.optional(v.boolean()),
    /** Optional for legacy rows written before ad-coin switch existed. */
    adCoinEnabled: v.optional(v.boolean()),
    /** Stripe/fiat iap SKUs; omit = enabled (default true). */
    iapEnabled: v.optional(v.boolean()),
    /** Daily check-in in shop; omit = enabled (default true). */
    checkinEnabled: v.optional(v.boolean()),
    /** Daily check-in reward currency; omit = tickets. */
    checkinRewardKind: v.optional(
      v.union(v.literal("tickets"), v.literal("coins"), v.literal("both"))
    ),
    /** Optional amount overrides (inherit portal-economy when omitted). */
    checkinRewards: v.optional(
      v.object({
        baseTickets: v.optional(v.number()),
        streakBonusTickets: v.optional(v.array(v.number())),
        baseCoins: v.optional(v.number()),
        streakBonusCoins: v.optional(v.array(v.number())),
      })
    ),
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
  })
    .index("by_partnerId", ["partnerId"])
    .index("by_partnerId_lobbyId", ["partnerId", "lobbyId"]),

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
    .index("by_campaignId_uid", ["campaignId", "uid"])
    .index("by_source", ["source"]),

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
    /** Economy partition used at purchase (for refunds). */
    scopeKey: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
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
    /** Economy partition; omit on legacy rows (= shared). */
    scopeKey: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
  })
    .index("by_uid_sku_week", ["uid", "skuId", "weekKey"])
    .index("by_uid_week", ["uid", "weekKey"])
    .index("by_uid_scopeKey_sku_week", ["uid", "scopeKey", "skuId", "weekKey"]),

  portal_run_tournaments: defineTable({
    templateId: v.string(),
    gameType: v.string(),
    status: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    /** Portal lobby that opened this run; weekly league points settle into this lobby. */
    lobbyId: v.optional(v.id("portal_lobbies")),
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
    /** Coin payout written at settle (coin multi / solo coin tables). */
    coinsGranted: v.optional(v.number()),
    /** Season honor XP granted at settle (after daily caps). */
    xpGranted: v.optional(v.number()),
    /** Legacy fields (prod rows); SSOT is portal_run_player_matches. */
    seedScoreThreshold: v.optional(v.number()),
    challengeSuccess: v.optional(v.boolean()),
    /** Lobby the player joined from (per-player; may differ from run.lobbyId). */
    joinLobbyId: v.optional(v.id("portal_lobbies")),
    /** Snapshot of lobby offering rewardsOverride at join/open. */
    rewardsOverrideSnapshot: v.optional(
      v.object({
        soloPoints: v.optional(
          v.union(
            v.object({
              success: v.number(),
              fail: v.number(),
              clearBonus: v.optional(v.number()),
            }),
            v.object({
              fail: v.number(),
              ritual_a: v.object({
                clear: v.number(),
                bonus: v.number(),
              }),
              transition_b: v.object({
                clear: v.number(),
                bonus: v.number(),
              }),
              merged_c: v.object({
                p75: v.number(),
                p90: v.number(),
              }),
            })
          )
        ),
        rankPoints: v.optional(v.record(v.string(), v.number())),
        coins: v.optional(
          v.object({
            soloSuccess: v.optional(v.number()),
            soloFail: v.optional(v.number()),
            rankCoins: v.optional(v.record(v.string(), v.number())),
          })
        ),
      })
    ),
    /** Snapshot of entry cost at join (for per-player charge / audit). */
    entrySnapshot: v.optional(
      v.object({
        kind: v.union(v.literal("none"), v.literal("coins"), v.literal("gems")),
        amount: v.optional(v.number()),
      })
    ),
  })
    .index("by_tournament_uid", ["tournamentId", "uid"])
    .index("by_uid_template", ["uid", "templateId"])
    .index("by_uid_updatedAt", ["uid", "updatedAt"])
    .index("by_tournament", ["tournamentId"]),

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
    /** Actual humans seated (increments on async join). Bot fill uses this as planned. */
    humanPlayerCount: v.optional(v.number()),
    /**
     * Async multi: profile effectiveHumans at create.
     * 1 → private bot table (joinOpen false); >1 → may accept later humans.
     * Join capacity is still maxPlayers, not this field.
     */
    effectiveHumans: v.optional(v.number()),
    /** Partner+template partition for async join-or-create. */
    matchPartitionKey: v.optional(v.string()),
    /**
     * Async multi only: true while new humans may join (created with eff>1).
     * Cleared when full (humanPlayerCount >= maxPlayers) or any human submits/finishes.
     */
    joinOpen: v.optional(v.boolean()),
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
        successQuantile: v.optional(
          v.union(
            v.literal("p25"),
            v.literal("p50"),
            v.literal("p75"),
            v.literal("p90")
          )
        ),
        ritualOneLineClear: v.optional(v.boolean()),
        segment: v.optional(
          v.union(
            v.literal("ritual_a"),
            v.literal("transition_b"),
            v.literal("merged_c")
          )
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
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_partition_joinOpen", ["matchPartitionKey", "joinOpen"])
    .index("by_template_joinOpen", ["templateId", "joinOpen"]),

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
      successQuantile: v.optional(
        v.union(
          v.literal("p25"),
          v.literal("p50"),
          v.literal("p75"),
          v.literal("p90")
        )
      ),
      ritualOneLineClear: v.optional(v.boolean()),
      segment: v.optional(
          v.union(
            v.literal("ritual_a"),
            v.literal("transition_b"),
            v.literal("merged_c")
          )
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
    /**
     * Partner-scoped match pool: `p:${partnerId}|t:${templateId}`.
     * Lobbies share within a partner; never cross partners.
     */
    matchPartitionKey: v.optional(v.string()),
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
    /**
     * Set when join already consumed an ad/ticket grant. Open-table daily-limit
     * rechecks must use this lane (not free). Cleared on match or refunded on
     * abandon (leave queue / expire without open).
     */
    playEntryLane: v.optional(
      v.union(v.literal("ad"), v.literal("ticket"))
    ),
    /** Ticket price charged at enqueue; used to refund if queue is abandoned. */
    ticketEntryPriceTickets: v.optional(v.number()),
    /** Player join lobby; copied to portal_run_player_tournaments.joinLobbyId. */
    lobbyId: v.optional(v.id("portal_lobbies")),
    /** Snapshot of lobby offering rewardsOverride at enqueue. */
    rewardsOverrideSnapshot: v.optional(
      v.object({
        soloPoints: v.optional(
          v.union(
            v.object({
              success: v.number(),
              fail: v.number(),
              clearBonus: v.optional(v.number()),
            }),
            v.object({
              fail: v.number(),
              ritual_a: v.object({
                clear: v.number(),
                bonus: v.number(),
              }),
              transition_b: v.object({
                clear: v.number(),
                bonus: v.number(),
              }),
              merged_c: v.object({
                p75: v.number(),
                p90: v.number(),
              }),
            })
          )
        ),
        rankPoints: v.optional(v.record(v.string(), v.number())),
        coins: v.optional(
          v.object({
            soloSuccess: v.optional(v.number()),
            soloFail: v.optional(v.number()),
            rankCoins: v.optional(v.record(v.string(), v.number())),
          })
        ),
      })
    ),
    entrySnapshot: v.optional(
      v.object({
        kind: v.union(v.literal("none"), v.literal("coins"), v.literal("gems")),
        amount: v.optional(v.number()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_template_status", ["templateId", "status"])
    .index("by_template_status_effective", ["templateId", "status", "effectiveHumans"])
    .index("by_partition_status", ["matchPartitionKey", "status"])
    .index("by_uid", ["uid"])
    .index("by_uid_template_status", ["uid", "templateId", "status"]),

  /**
   * Named portal lobbies per partner.
   * URL: /gc/{partnerSlug} (default) or /gc/{partnerSlug}/{lobbySlug}.
   */
  portal_lobbies: defineTable({
    partnerId: v.number(),
    /** URL segment; "default" for the partner default lobby. */
    slug: v.string(),
    title: v.string(),
    isDefault: v.boolean(),
    enabled: v.boolean(),
    branding: v.optional(
      v.object({
        logoUrl: v.optional(v.string()),
        backgroundLandscapeUrl: v.optional(v.string()),
        backgroundPortraitUrl: v.optional(v.string()),
      })
    ),
    offerings: v.array(
      v.object({
        tournamentId: v.string(),
        sortOrder: v.number(),
        titleOverride: v.optional(v.string()),
        rewardsOverride: v.optional(
          v.object({
            soloPoints: v.optional(
              v.union(
                v.object({
                  success: v.number(),
                  fail: v.number(),
                  clearBonus: v.optional(v.number()),
                }),
                v.object({
                  fail: v.number(),
                  ritual_a: v.object({
                    clear: v.number(),
                    bonus: v.number(),
                  }),
                  transition_b: v.object({
                    clear: v.number(),
                    bonus: v.number(),
                  }),
                  merged_c: v.object({
                    p75: v.number(),
                    p90: v.number(),
                  }),
                })
              )
            ),
            rankPoints: v.optional(v.record(v.string(), v.number())),
            coins: v.optional(
              v.object({
                soloSuccess: v.optional(v.number()),
                soloFail: v.optional(v.number()),
                rankCoins: v.optional(v.record(v.string(), v.number())),
              })
            ),
          })
        ),
        enabled: v.optional(v.boolean()),
        /** Season honor level gate; permanent once unlocked for the player. */
        unlockSeasonLevel: v.optional(v.number()),
      })
    ),
    /**
     * 赛季荣誉参与：join_now（默认，中途入当前季）|
     * next_season（等到 partner 日历下一季 W1 再开轨）。
     */
    seasonHonorMode: v.optional(
      v.union(v.literal("join_now"), v.literal("next_season"))
    ),
    /** next_season 时生效的起始 weekKey（w:YYYY-MM-DD） */
    seasonHonorStartsWeekKey: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_partnerId", ["partnerId"])
    .index("by_partnerId_slug", ["partnerId", "slug"])
    .index("by_partnerId_default", ["partnerId", "isDefault"]),

  /**
   * Partner entry ladder SoT: partner base (no lobbyId) ⊕ lobby ⊕ tournament overlays.
   * Field-level overlay; more specific rows override set fields only.
   */
  portal_partner_play_entry_settings: defineTable({
    partnerId: v.number(),
    /** Omit = partner base config. */
    lobbyId: v.optional(v.id("portal_lobbies")),
    /** Requires lobbyId; omit = lobby-level (or partner-level) row. */
    tournamentId: v.optional(v.string()),
    /**
     * Free/ad/ticket pool sharing:
     * mode | lobby | tournament (see portalQuotaScope.ts). Default mode.
     */
    quotaScope: v.optional(
      v.union(v.literal("mode"), v.literal("lobby"), v.literal("tournament"))
    ),
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
    coinEntryEnabled: v.optional(v.boolean()),
    coinEntrySoloPriceCoins: v.optional(v.number()),
    coinEntrySoloDailyCap: v.optional(v.number()),
    coinEntryMultiPriceCoins: v.optional(v.number()),
    coinEntryMultiDailyCap: v.optional(v.number()),
    /** Solo rewarded-success daily cap (partner → lobby → tournament overlay). */
    soloSuccessDailyEnabled: v.optional(v.boolean()),
    soloSuccessDailyCap: v.optional(v.number()),
    soloSuccessAfterCapMode: v.optional(v.literal("zero_all")),
    soloSuccessAllowPlayAfterCap: v.optional(v.boolean()),
    updatedAt: v.number(),
  })
    .index("by_partnerId", ["partnerId"])
    .index("by_partner_lobby", ["partnerId", "lobbyId"])
    .index("by_partner_lobby_tournament", ["partnerId", "lobbyId", "tournamentId"]),

  /**
   * Count of solo successes that consumed the daily reward quota
   * (scoped by lobby/tournament when quotaScope requires it).
   */
  portal_solo_success_daily_usage: defineTable({
    uid: v.string(),
    dayKey: v.string(),
    /** Always "solo" today; kept for index symmetry with ad/ticket usage. */
    mode: v.literal("solo"),
    lobbyId: v.optional(v.id("portal_lobbies")),
    tournamentId: v.optional(v.string()),
    usedCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_uid_dayKey_mode", ["uid", "dayKey", "mode"])
    .index("by_uid_dayKey_mode_lobby", ["uid", "dayKey", "mode", "lobbyId"])
    .index("by_uid_dayKey_mode_lobby_tournament", [
      "uid",
      "dayKey",
      "mode",
      "lobbyId",
      "tournamentId",
    ]),

  /** One ticket-entry count per player/mode/operations day (scoped by lobby/tournament when set). */
  portal_ticket_entry_daily_usage: defineTable({
    uid: v.string(),
    dayKey: v.string(),
    mode: v.union(v.literal("solo"), v.literal("multi")),
    lobbyId: v.optional(v.id("portal_lobbies")),
    tournamentId: v.optional(v.string()),
    usedCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_uid_dayKey_mode", ["uid", "dayKey", "mode"])
    .index("by_uid_dayKey_mode_lobby", ["uid", "dayKey", "mode", "lobbyId"])
    .index("by_uid_dayKey_mode_lobby_tournament", [
      "uid",
      "dayKey",
      "mode",
      "lobbyId",
      "tournamentId",
    ]),

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
    lobbyId: v.optional(v.id("portal_lobbies")),
    tournamentId: v.optional(v.string()),
    usedCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_uid_dayKey_mode", ["uid", "dayKey", "mode"])
    .index("by_uid_dayKey_mode_lobby", ["uid", "dayKey", "mode", "lobbyId"])
    .index("by_uid_dayKey_mode_lobby_tournament", [
      "uid",
      "dayKey",
      "mode",
      "lobbyId",
      "tournamentId",
    ]),

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
    /** Economy scope for grant (isolated lobby wallet). */
    scopeKey: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
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
    scopeKey: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
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
    scopeKey: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
  })
    .index("by_uid_dayKey", ["uid", "dayKey"])
    .index("by_uid_scopeKey_dayKey", ["uid", "scopeKey", "dayKey"]),

  /** Portal daily check-in streak; scoped like wallets. */
  portal_checkin_streaks: defineTable({
    uid: v.string(),
    scopeKey: v.string(),
    streakCount: v.number(),
    lastClaimPeriodKey: v.string(),
    /** Tickets granted on last claim (0 when kind=coins). */
    lastClaimTickets: v.optional(v.number()),
    /** Coins granted on last claim (0 when kind=tickets). */
    lastClaimCoins: v.optional(v.number()),
    updatedAt: v.number(),
    lobbyId: v.optional(v.id("portal_lobbies")),
  }).index("by_uid_scopeKey", ["uid", "scopeKey"]),

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
    /** 单人挑战：通关目标分；与本局 score/settled 同文档 */
    seedScoreThreshold: v.optional(v.number()),
    /** 单人挑战：p90 奖励线（展示/审计） */
    seedScoreThresholdP90: v.optional(v.number()),
    /** 单人挑战：是否达标（通关线） */
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

  /** 周联赛档案：按 lobby 持久段位（legacy gameType retained for old rows） */
  portal_weekly_league_profile: defineTable({
    uid: v.string(),
    /** @deprecated Prefer lobbyId for new rows. */
    gameType: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
    weeklyLeagueTier: v.string(),
    peakLeagueTier: v.string(),
    /** 综合胜场：multi #1 或 Solo P75 成功（徽章） */
    totalMatchWins: v.optional(v.number()),
    /** 多人第一累计（徽章 Crowns） */
    totalMultiplayerWins: v.optional(v.number()),
    /** 周联赛晋级累计（徽章） */
    totalWeeklyPromotions: v.optional(v.number()),
    /** 季末纪念章未读弹层 */
    unreadSeasonMarks: v.optional(v.boolean()),
    unreadSeasonId: v.optional(v.string()),
    unreadSeasonLevel: v.optional(v.number()),
    /** Lobby offerings permanently unlocked via season level gates. */
    unlockedTournamentIds: v.optional(v.array(v.string())),
    updatedAt: v.number(),
  })
    .index("by_uid_game", ["uid", "gameType"])
    .index("by_uid_lobby", ["uid", "lobbyId"]),

  /** 永久徽章解锁记录（纯展示） */
  portal_player_badges: defineTable({
    uid: v.string(),
    lobbyId: v.optional(v.id("portal_lobbies")),
    badgeId: v.string(),
    unlockedAt: v.number(),
    metadataJson: v.optional(v.string()),
  })
    .index("by_uid", ["uid"])
    .index("by_uid_badge", ["uid", "badgeId"])
    .index("by_uid_lobby", ["uid", "lobbyId"]),

  /** 赛季荣誉进度（Season Lv 1–30；每季重置） */
  portal_season_honor_progress: defineTable({
    uid: v.string(),
    lobbyId: v.optional(v.id("portal_lobbies")),
    seasonId: v.string(),
    seasonXp: v.number(),
    level: v.number(),
    dailyWinXpKey: v.optional(v.string()),
    dailyWinXp: v.optional(v.number()),
    dailyPlayXpKey: v.optional(v.string()),
    dailyPlayXp: v.optional(v.number()),
    finalized: v.optional(v.boolean()),
    finalizedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_uid_lobby_season", ["uid", "lobbyId", "seasonId"])
    .index("by_uid_season", ["uid", "seasonId"]),

  /** 周联赛 cohort：同 week + lobby + 段位 下分组 */
  portal_weekly_league_cohorts: defineTable({
    weekKey: v.string(),
    /** @deprecated Prefer lobbyId for new cohorts. */
    gameType: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
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
    .index("by_week_lobby_tier_status", ["weekKey", "lobbyId", "leagueTierId", "status"])
    .index("by_week_lobby_tier_index", ["weekKey", "lobbyId", "leagueTierId", "cohortIndex"])
    .index("by_status_matching_ends", ["status", "matchingEndsAt"]),

  /** 周联赛成员：组内按 weeklyPoints 排名（结算直接累加） */
  portal_weekly_league_members: defineTable({
    weekKey: v.string(),
    uid: v.string(),
    /** @deprecated Prefer lobbyId for new rows. */
    gameType: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
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
    .index("by_week_lobby_uid", ["weekKey", "lobbyId", "uid"])
    .index("by_uid_game", ["uid", "gameType"])
    .index("by_uid_lobby", ["uid", "lobbyId"])
    .index("by_cohort", ["cohortId"])
    .index("by_week_cohort_points", ["weekKey", "cohortId", "weeklyPoints"]),

  portal_point_ledger: defineTable({
    uid: v.string(),
    runTournamentId: v.id("portal_run_tournaments"),
    gameType: v.string(),
    /** Weekly-league scope; preferred over gameType for cohort accrual. */
    lobbyId: v.optional(v.id("portal_lobbies")),
    mode: v.union(v.literal("solo"), v.literal("multi")),
    weekKey: v.string(),
    delta: v.number(),
    reason: v.string(),
    rank: v.optional(v.number()),
    p75Success: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_uid", ["uid"])
    .index("by_uid_lobby_week", ["uid", "lobbyId", "weekKey"]),

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
    /** Economy partition; omit on legacy rows (= shared / partner-wide). */
    scopeKey: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
  })
    .index("by_uid_dayKey", ["uid", "dayKey"])
    .index("by_uid_scopeKey_dayKey", ["uid", "scopeKey", "dayKey"]),

  /**
   * Partner lobbyOpsMode SoT (platform admin → Portal).
   * isolated | shared — controls economy partition only, not matchmaking.
   * seasonEpochWeekKey — partner 共用赛季日历起点（缺省用全局常量）。
   */
  portal_partner_lobby_ops_settings: defineTable({
    partnerId: v.number(),
    lobbyOpsMode: v.union(v.literal("isolated"), v.literal("shared")),
    /** Partner 赛季日历 epoch（w:YYYY-MM-DD）；omit → 全局缺省 */
    seasonEpochWeekKey: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_partnerId", ["partnerId"]),

  /**
   * Per-partner replay ladder SoT (platform admin → Portal).
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

  /** Partner-scoped town instance (Strategy B: one rebranded Mayfield per partner). */
  portal_towns: defineTable({
    partnerId: v.number(),
    slug: v.string(),
    title: v.string(),
    isDefault: v.boolean(),
    enabled: v.boolean(),
    templateId: v.string(),
    economyProfileId: v.optional(v.string()),
    branding: v.optional(
      v.object({
        logoUrl: v.optional(v.string()),
        titleOverride: v.optional(v.string()),
        mapThemeId: v.optional(v.string()),
      })
    ),
    walletSeedCoins: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_partnerId", ["partnerId"])
    .index("by_partnerId_slug", ["partnerId", "slug"])
    .index("by_partnerId_default", ["partnerId", "isDefault"]),

  /** Saloon Row — Mayfield town meta. League-first: lobby Season Lv for unlocks; mayor/venue/prosperity for town shell. */
  town_progress: defineTable({
    uid: v.string(),
    /** portal_towns document id (string). */
    townId: v.string(),
    currentDistrict: v.string(),
    unlockedDistricts: v.array(v.string()),
    unlockedTierIds: v.array(v.string()),
    hallLevels: v.optional(v.record(v.string(), v.number())),
    questIds: v.array(v.string()),
    mayorXp: v.optional(v.number()),
    mayorLevel: v.optional(v.number()),
    prosperityScore: v.optional(v.number()),
    townTemplateId: v.optional(v.string()),
    equippedSkinId: v.optional(v.string()),
    completedQuestIds: v.optional(v.array(v.string())),
    mayorXpDayKey: v.optional(v.string()),
    mayorXpToday: v.optional(v.number()),
    venueXp: v.optional(v.record(v.string(), v.number())),
    venueLevel: v.optional(v.record(v.string(), v.number())),
    venueXpDayKey: v.optional(v.string()),
    venueXpToday: v.optional(v.record(v.string(), v.number())),
    /** Ops week key (`w:YYYY-MM-DD`) for entertainment × Showdown passive bonus. */
    showdownWeekKey: v.optional(v.string()),
    /** Settled Showdown (multi_ranked) games in `showdownWeekKey`. */
    showdownGamesThisWeek: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_uid_townId", ["uid", "townId"]),

  /** Mayfield — developable zone slots. */
  town_zones: defineTable({
    uid: v.string(),
    townId: v.string(),
    slotId: v.string(),
    districtId: v.string(),
    zoneType: v.optional(v.string()),
    level: v.number(),
    lastCollectedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_uid_townId", ["uid", "townId"])
    .index("by_uid_townId_slotId", ["uid", "townId", "slotId"]),

  /** Mayfield — daily coin source buckets for passive cap. */
  town_passive_state: defineTable({
    uid: v.string(),
    townId: v.string(),
    dayKey: v.string(),
    passiveCoins: v.number(),
    otherCoins: v.number(),
    updatedAt: v.number(),
  }).index("by_uid_townId_dayKey", ["uid", "townId", "dayKey"]),

  /** Mayfield — lightweight product analytics. */
  town_analytics_events: defineTable({
    uid: v.string(),
    event: v.string(),
    props: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean()))),
    createdAt: v.number(),
  }).index("by_uid_created", ["uid", "createdAt"]),

  town_gate_entries: defineTable({
    uid: v.string(),
    townId: v.optional(v.string()),
    entryToken: v.string(),
    buildingId: v.string(),
    tierId: v.string(),
    tournamentId: v.optional(v.string()),
    hallKind: v.optional(v.string()),
    /** @deprecated legacy M1 field */
    modeId: v.optional(v.string()),
    buyIn: v.number(),
    ssaKey: v.string(),
    status: v.string(),
    createdAt: v.number(),
  })
    .index("by_uid", ["uid"])
    .index("by_entry_token", ["entryToken"]),
});
