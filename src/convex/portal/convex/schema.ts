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
    updatedAt: v.optional(v.number()),
    /** @deprecated legacy session token; do not write */
    token: v.optional(v.string()),
  }).index("by_uid", ["uid"]),

  portal_run_tournaments: defineTable({
    templateId: v.string(),
    gameType: v.string(),
    status: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    campaignId: v.optional(v.string()),
    merchantId: v.optional(v.string()),
  })
    .index("by_templateId", ["templateId"])
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
  })
    .index("by_tournament_uid", ["tournamentId", "uid"])
    .index("by_uid_template", ["uid", "templateId"])
    .index("by_uid_updatedAt", ["uid", "updatedAt"])
    .index("by_tournament", ["tournamentId"]),

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
    campaignId: v.optional(v.string()),
    merchantId: v.optional(v.string()),
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
    status: v.union(v.literal("waiting"), v.literal("claiming"), v.literal("matched")),
    matchedRunTournamentId: v.optional(v.id("portal_run_tournaments")),
    campaignId: v.optional(v.string()),
    merchantId: v.optional(v.string()),
    maxPlaysPerDay: v.optional(v.number()),
    dayTimezone: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_template_status", ["templateId", "status"])
    .index("by_template_status_effective", ["templateId", "status", "effectiveHumans"])
    .index("by_uid", ["uid"])
    .index("by_uid_template_status", ["uid", "templateId", "status"]),

  portal_bot_personas: defineTable({
    botPersonaId: v.string(),
    poolIndex: v.number(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_personaId", ["botPersonaId"])
    .index("by_poolIndex", ["poolIndex"]),

  portal_weekly_board_cohorts: defineTable({
    gameType: v.string(),
    mode: v.union(v.literal("solo"), v.literal("multi")),
    weekKey: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    humanAnchorAt: v.number(),
    status: v.union(v.literal("open"), v.literal("closed")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_game_mode_week", ["gameType", "mode", "weekKey"]),

  portal_weekly_board_bot_members: defineTable({
    cohortId: v.id("portal_weekly_board_cohorts"),
    slot: v.number(),
    botPersonaId: v.string(),
    revealAt: v.number(),
    weekEndPoints: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_cohort", ["cohortId"])
    .index("by_cohort_slot", ["cohortId", "slot"]),

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
    createdAt: v.number(),
    updatedAt: v.number(),
    campaignId: v.optional(v.string()),
    merchantId: v.optional(v.string()),
  })
    .index("by_gameId", ["gameId"])
    .index("by_matchId", ["matchId"])
    .index("by_match_uid", ["matchId", "uid"])
    .index("by_uid_template", ["uid", "templateId"])
    .index("by_uid", ["uid"])
    .index("by_templateId", ["templateId"])
    .index("by_run_uid", ["tournamentId", "uid"])
    .index("by_run_tournament", ["tournamentId"]),

  portal_weekly_points: defineTable({
    uid: v.string(),
    gameType: v.string(),
    mode: v.union(v.literal("solo"), v.literal("multi")),
    weekKey: v.string(),
    points: v.number(),
    matchCount: v.number(),
    updatedAt: v.number(),
  })
    .index("by_game_mode_week_points", ["gameType", "mode", "weekKey", "points"])
    .index("by_uid_game_mode_week", ["uid", "gameType", "mode", "weekKey"]),

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

  /** 再战令（与 casualPlatform 对齐；Portal 模板默认 `canUseReplayForTemplate` 关闭） */
  casual_replay_tokens: defineTable({
    uid: v.string(),
    createdAt: v.number(),
    usedAt: v.optional(v.number()),
    usedForTournamentId: v.optional(v.string()),
  }).index("by_uid", ["uid"]),

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
    .index("by_gameType_uid_poolVersion_seedId", ["gameType", "uid", "poolVersion", "seedId"])
    .index("by_matchId", ["matchId"]),
});
