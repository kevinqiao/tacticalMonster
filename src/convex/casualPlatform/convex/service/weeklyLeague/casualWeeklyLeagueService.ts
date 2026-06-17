/**
 * 周联赛核心：ensureMember、addLeagueXp、snapshot。
 */
import type { CasualTournamentDefinition } from "../../data/casualTournamentConfigs";
import {
  CASUAL_WEEKLY_LEAGUE_ENABLED,
  type WeeklyLeagueTierId,
} from "../../data/casualWeeklyLeagueConfig";
import { dailyPeriodKey, weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { assignCohortForUid, listCohortMembers, refreshCohortAfterHumanJoin } from "./casualWeeklyLeagueCohort";
import { ensureWeeklyLeagueProfile, readWeeklyLeagueTier } from "./casualWeeklyLeagueProfile";
import { resolveLeagueXpDelta, type LeagueXpLine } from "./casualWeeklyLeagueXp";

export type WeeklyLeagueSettlePayload = {
  leagueXpDelta: number;
  weeklyLeagueXpTotal: number;
  cohortRank: number;
  cohortSize: number;
  lines?: LeagueXpLine[];
};

export async function ensureWeeklyLeagueMember(
  ctx: MutationCtx,
  uid: string,
  now: number = Date.now()
): Promise<Id<"casual_weekly_league_members"> | null> {
  if (!CASUAL_WEEKLY_LEAGUE_ENABLED) return null;
  const weekKey = weeklyPeriodKey(now);
  const existing = await ctx.db
    .query("casual_weekly_league_members")
    .withIndex("by_week_uid", (q) => q.eq("weekKey", weekKey).eq("uid", uid))
    .unique();
  if (existing) return existing._id;

  const { weeklyLeagueTier } = await ensureWeeklyLeagueProfile(ctx, uid);
  const cohortId = await assignCohortForUid(ctx, uid, weekKey, now);
  const memberId = await ctx.db.insert("casual_weekly_league_members", {
    weekKey,
    uid,
    cohortId,
    leagueTierId: weeklyLeagueTier,
    weeklyLeagueXp: 0,
    isBot: false,
    dailyLeagueXpByPeriodKey: {},
    createdAt: now,
    updatedAt: now,
  });
  await refreshCohortAfterHumanJoin(ctx, cohortId, now);
  return memberId;
}

async function cohortRankForMember(
  ctx: QueryCtx | MutationCtx,
  cohortId: Id<"casual_weekly_league_cohorts">,
  uid: string,
  now: number = Date.now()
): Promise<{ rank: number; size: number }> {
  const { activeMembers } = await listCohortMembers(ctx, cohortId, now, {
    activeOnly: true,
  });
  const rank = activeMembers.findIndex((m) => m.uid === uid) + 1;
  return {
    rank: rank > 0 ? rank : activeMembers.length + 1,
    size: activeMembers.length,
  };
}

export async function addLeagueXp(
  ctx: MutationCtx,
  args: {
    uid: string;
    def: CasualTournamentDefinition;
    seasonXpOnSettle: number;
    multiplayerFinalRank?: number;
    now?: number;
  }
): Promise<WeeklyLeagueSettlePayload | null> {
  if (!CASUAL_WEEKLY_LEAGUE_ENABLED) return null;
  const now = args.now ?? Date.now();
  const memberId = await ensureWeeklyLeagueMember(ctx, args.uid, now);
  if (!memberId) return null;

  const member = await ctx.db.get(memberId);
  if (!member) return null;

  const dayKey = dailyPeriodKey(now);
  const dailyMap = { ...(member.dailyLeagueXpByPeriodKey ?? {}) };
  const dailyGranted = dailyMap[dayKey] ?? 0;

  const { delta, lines } = resolveLeagueXpDelta({
    def: args.def,
    seasonXpOnSettle: args.seasonXpOnSettle,
    multiplayerFinalRank: args.multiplayerFinalRank,
    dailyLeagueXpGranted: dailyGranted,
  });
  if (delta <= 0) {
    const { rank, size } = await cohortRankForMember(
      ctx,
      member.cohortId,
      args.uid,
      now
    );
    return {
      leagueXpDelta: 0,
      weeklyLeagueXpTotal: member.weeklyLeagueXp,
      cohortRank: rank,
      cohortSize: size,
      lines,
    };
  }

  const nextXp = member.weeklyLeagueXp + delta;
  dailyMap[dayKey] = dailyGranted + delta;
  await ctx.db.patch(memberId, {
    weeklyLeagueXp: nextXp,
    dailyLeagueXpByPeriodKey: dailyMap,
    updatedAt: now,
  });

  const { rank, size } = await cohortRankForMember(ctx, member.cohortId, args.uid, now);
  return {
    leagueXpDelta: delta,
    weeklyLeagueXpTotal: nextXp,
    cohortRank: rank,
    cohortSize: size,
    lines,
  };
}

export type WeeklyLeagueSnapshot = {
  weekKey: string;
  leagueTierId: WeeklyLeagueTierId;
  peakLeagueTier: WeeklyLeagueTierId;
  weeklyLeagueXp: number;
  cohortRank: number;
  cohortSize: number;
  unreadCloseResult: boolean;
  pendingRewards?: {
    coins?: number;
    gems?: number;
    seasonVoucher?: number;
  };
  lastOutcome?: "promote" | "safe" | "demote";
};

export async function getWeeklyLeagueSnapshotForUid(
  ctx: QueryCtx,
  uid: string,
  now: number = Date.now()
): Promise<WeeklyLeagueSnapshot | null> {
  if (!CASUAL_WEEKLY_LEAGUE_ENABLED) return null;
  const weekKey = weeklyPeriodKey(now);
  const profile = await ctx.db
    .query("casual_weekly_league_profile")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .unique();
  const tier = await readWeeklyLeagueTier(ctx, uid);
  const member = await ctx.db
    .query("casual_weekly_league_members")
    .withIndex("by_week_uid", (q) => q.eq("weekKey", weekKey).eq("uid", uid))
    .unique();

  if (!member) {
    return {
      weekKey,
      leagueTierId: tier,
      peakLeagueTier: (profile?.peakLeagueTier as WeeklyLeagueTierId) ?? tier,
      weeklyLeagueXp: 0,
      cohortRank: 0,
      cohortSize: 0,
      unreadCloseResult: false,
    };
  }

  const { rank, size } = await cohortRankForMember(
    ctx,
    member.cohortId,
    uid,
    now
  );

  return {
    weekKey,
    leagueTierId: member.leagueTierId as WeeklyLeagueTierId,
    peakLeagueTier: (profile?.peakLeagueTier as WeeklyLeagueTierId) ?? tier,
    weeklyLeagueXp: member.weeklyLeagueXp,
    cohortRank: rank,
    cohortSize: size,
    unreadCloseResult: member.unreadClose === true,
    ...(member.pendingRewards ? { pendingRewards: member.pendingRewards } : {}),
    ...(member.outcome ? { lastOutcome: member.outcome } : {}),
  };
}
