/**
 * Join 匹配画像：effectiveHumans 规则与 solitaire solo 规划 HTTP 只读 profile。
 * （V3：bot 难度 / 目标名次在 solitaireArena，不在此模块。）
 */
import {
  findCasualRankRewardEntry,
  getTournamentDefinition,
  type CasualTournamentDefinition,
} from "../../../data/casualTournamentConfigs";
import {
  CASUAL_DEFAULT_EFFECTIVE_HUMANS,
  CASUAL_DEFAULT_QUEUE_EXPIRE,
  MATCHMAKING_RULES,
  resolveMatchmakingExpireAction,
  type QueueExpireAction,
} from "../../../data/casualMatchmakingConfig";
import {
  getDefaultPrimaryGameType,
  isRegisteredCasualGameType,
} from "../../../data/casualGameRegistry";
import {
  CASUAL_LOSS_STREAK_LOOKBACK_MAX,
  isCasualMultiplayerAsyncTemplate,
  type BotStrategyPlayerContext,
} from "../../../data/casualPlayerStrategyTypes";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { RUN_PLAYER_TOURNAMENT_COMPLETED } from "./casualTournamentJoinCore";
import { isCasualAsyncVirtualOpponentUid } from "../settle/async/casualAsyncTypes";

import { readWeeklyLeagueTier } from "../../weeklyLeague/casualWeeklyLeagueProfile";

/** 该名次是否视为「无奖励失败」（连续失败 streak） */
function isCasualMultiplayerRankLoss(
  def: CasualTournamentDefinition,
  rank: number
): boolean {
  const rr = findCasualRankRewardEntry(def.rewards.rankRewards, rank);
  if (rr) {
    const coins = (rr as { coins?: number }).coins ?? 0;
    const gems = rr.gems ?? 0;
    const hasPositiveRankReward = coins > 0 || gems > 0;
    return !hasPositiveRankReward;
  }
  return true;
}

async function activeSeasonId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const seasons = await ctx.db.query("casual_seasons").collect();
  const s = seasons.find((r) => r.active) ?? seasons[0];
  return s?.seasonId ?? null;
}

async function computeConsecutiveLossStreak(
  ctx: QueryCtx,
  uid: string
): Promise<number> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .collect();

  const settled = rows
    .filter((r) => r.status === "settled" && r.rank != null && !isCasualAsyncVirtualOpponentUid(r.uid))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, CASUAL_LOSS_STREAK_LOOKBACK_MAX);

  let streak = 0;
  for (const row of settled) {
    const def = getTournamentDefinition(row.templateId);
    if (!def || !isCasualMultiplayerAsyncTemplate(def)) continue;
    const rank = row.rank as number;
    if (!isCasualMultiplayerRankLoss(def, rank)) break;
    streak++;
  }
  return streak;
}

export async function resolvePlayerBotStrategyContext(
  ctx: QueryCtx,
  args: {
    uid: string;
    templateId: string;
    def: CasualTournamentDefinition;
  }
): Promise<BotStrategyPlayerContext> {
  const { uid, templateId, def } = args;
  const gameType = isRegisteredCasualGameType(def.gameType)
    ? def.gameType
    : getDefaultPrimaryGameType();

  let seasonLadderPoints = 0;
  const weeklyLeagueTier = await readWeeklyLeagueTier(ctx, uid);
  const seasonId = await activeSeasonId(ctx);

  const player = await ctx.db
    .query("casual_players")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .unique();

  let passLevel = 0;
  let passTrack: BotStrategyPlayerContext["passTrack"] = "none";
  if (seasonId) {
    const pass = await ctx.db
      .query("casual_pass_progress")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", seasonId))
      .unique();
    passLevel = pass?.level ?? 0;
    if (pass?.tracksPurchased?.deluxe) passTrack = "deluxe";
    else if (pass?.tracksPurchased?.standard) passTrack = "standard";
  }

  const ptRows = await ctx.db
    .query("casual_run_player_tournaments")
    .withIndex("by_uid_template", (q) => q.eq("uid", uid))
    .collect();
  let completedMultiplayerMatches = 0;
  for (const pt of ptRows) {
    const d = getTournamentDefinition(pt.templateId);
    if (d && isCasualMultiplayerAsyncTemplate(d) && pt.status === RUN_PLAYER_TOURNAMENT_COMPLETED) {
      completedMultiplayerMatches++;
    }
  }

  const matchRows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .collect();
  const humanSettled = matchRows
    .filter((r) => r.status === "settled" && !isCasualAsyncVirtualOpponentUid(r.uid))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const last = humanSettled[0];
  const daysSinceLastMatch = last
    ? Math.floor((Date.now() - last.updatedAt) / (24 * 60 * 60 * 1000))
    : 999;

  const consecutiveLossStreak = await computeConsecutiveLossStreak(ctx, uid);

  return {
    uid,
    tournamentId: templateId,
    templateId,
    matchType: def.matchType,
    gameType,
    maxPlayers: def.maxPlayers,
    seasonLadderPoints,
    weeklyLeagueTier,
    completedMultiplayerMatches,
    coinsBalance: player?.coins ?? 0,
    daysSinceLastMatch,
    passLevel,
    passTrack,
    consecutiveLossStreak,
  };
}

/** join 时按玩家画像决定开桌所需真人数与超时行为（MATCHMAKING_RULES；未命中 → default） */
export function evaluateEffectiveHumans(
  ctx: BotStrategyPlayerContext,
  def: CasualTournamentDefinition
): {
  effectiveHumans: number;
  matchedRuleId: string | null;
  queueExpireAction: QueueExpireAction;
} {
  const cap = Math.max(1, def.maxPlayers);
  const sorted = [...MATCHMAKING_RULES].sort((a, b) => b.priority - a.priority);
  for (const rule of sorted) {
    if (!rule.condition(ctx)) continue;
    const effective = Math.min(cap, Math.max(1, rule.strategy.effectiveHumans));
    return {
      effectiveHumans:1,
      matchedRuleId: rule.id,
      queueExpireAction: resolveMatchmakingExpireAction(rule.strategy),
    };
  }
  const effective = Math.min(cap, Math.max(1, CASUAL_DEFAULT_EFFECTIVE_HUMANS));
  return {
    effectiveHumans: effective,
    matchedRuleId: "default",
    queueExpireAction: CASUAL_DEFAULT_QUEUE_EXPIRE,
  };
}

/** @deprecated 使用 evaluateEffectiveHumans */
export function evaluateEffectiveMatchmakingMinHumans(
  ctx: BotStrategyPlayerContext,
  def: CasualTournamentDefinition
): {
  effectiveHumans: number;
  matchedRuleId: string | null;
  queueExpireAction: QueueExpireAction;
} {
  return evaluateEffectiveHumans(ctx, def);
}

/** join 画像规则评估结果（Convex dashboard / `npx convex dev` 日志） */
export function logJoinMatchmakingProfileResult(args: {
  uid: string;
  templateId: string;
  profile: BotStrategyPlayerContext;
  effectiveHumans: number;
  matchedRuleId: string | null;
  queueExpireAction?: QueueExpireAction;
  source: "enqueue" | "existing_open";
}): void {
  const { uid, templateId, profile, effectiveHumans, matchedRuleId, queueExpireAction, source } =
    args;
  console.log(
    "[casual][join-matchmaking]",
    JSON.stringify({
      source,
      uid,
      templateId,
      matchType: profile.matchType,
      maxPlayers: profile.maxPlayers,
      profile: {
        seasonLadderPoints: profile.seasonLadderPoints,
        weeklyLeagueTier: profile.weeklyLeagueTier,
        completedMultiplayerMatches: profile.completedMultiplayerMatches,
        coinsBalance: profile.coinsBalance,
        daysSinceLastMatch: profile.daysSinceLastMatch,
        passLevel: profile.passLevel,
        passTrack: profile.passTrack,
        consecutiveLossStreak: profile.consecutiveLossStreak,
      },
      result: {
        effectiveHumans,
        matchedRuleId,
        queueExpireAction,
        waitingForPeer: effectiveHumans > 1,
      },
    })
  );
}
