/**
 * Portal 周联赛 cohort 分配（按 gameType + 段位，每组最多 50 真人）。
 */
import {
  PORTAL_WEEKLY_LEAGUE_MAX_HUMANS_PER_COHORT,
  portalWeeklyLeagueDisplayCohortNo,
  type PortalWeeklyLeagueTierId,
} from "../../data/portalWeeklyLeagueConfig";
import { weeklyWindowMsShanghai } from "../../utils/casualTaskPeriod";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { ensureWeeklyLeagueProfile } from "./casualWeeklyLeagueProfile";
import { syncPortalWeeklyLeagueBotPadding } from "./portalWeeklyLeagueBotFill";

async function cohortHumanCount(
  ctx: MutationCtx | QueryCtx,
  cohortId: Id<"portal_weekly_league_cohorts">,
  cohortRow?: { humanCount?: number } | null
): Promise<number> {
  if (typeof cohortRow?.humanCount === "number") {
    return cohortRow.humanCount;
  }
  const members = await ctx.db
    .query("portal_weekly_league_members")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect();
  return members.filter((m) => !m.isBot).length;
}

export async function findOpenCohortForTier(
  ctx: MutationCtx,
  weekKey: string,
  gameType: string,
  leagueTierId: PortalWeeklyLeagueTierId
): Promise<Id<"portal_weekly_league_cohorts"> | null> {
  const open = await ctx.db
    .query("portal_weekly_league_cohorts")
    .withIndex("by_week_game_tier_status", (q) =>
      q
        .eq("weekKey", weekKey)
        .eq("gameType", gameType)
        .eq("leagueTierId", leagueTierId)
        .eq("status", "open")
    )
    .collect();

  const withRoom: Array<{ id: Id<"portal_weekly_league_cohorts">; cohortIndex: number; humans: number }> =
    [];
  for (const c of open) {
    const humans = await cohortHumanCount(ctx, c._id, c);
    if (humans < PORTAL_WEEKLY_LEAGUE_MAX_HUMANS_PER_COHORT) {
      withRoom.push({ id: c._id, cohortIndex: c.cohortIndex, humans });
    }
  }
  withRoom.sort((a, b) => b.humans - a.humans || a.cohortIndex - b.cohortIndex);
  return withRoom[0]?.id ?? null;
}

export async function createCohort(
  ctx: MutationCtx,
  weekKey: string,
  gameType: string,
  leagueTierId: PortalWeeklyLeagueTierId,
  now: number
): Promise<Id<"portal_weekly_league_cohorts">> {
  const window = weeklyWindowMsShanghai(now);
  const existing = await ctx.db
    .query("portal_weekly_league_cohorts")
    .withIndex("by_week_game_tier_index", (q) =>
      q.eq("weekKey", weekKey).eq("gameType", gameType).eq("leagueTierId", leagueTierId)
    )
    .collect();
  const nextIndex =
    existing.length > 0 ? Math.max(...existing.map((c) => c.cohortIndex)) + 1 : 0;
  const displayCode = portalWeeklyLeagueDisplayCohortNo({
    weekKey,
    gameType,
    leagueTierId,
    cohortIndex: nextIndex,
  });
  return await ctx.db.insert("portal_weekly_league_cohorts", {
    weekKey,
    gameType,
    leagueTierId,
    cohortIndex: nextIndex,
    displayCode,
    humanCount: 0,
    status: "open",
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    createdAt: now,
    updatedAt: now,
  });
}

export async function assignCohortForUid(
  ctx: MutationCtx,
  uid: string,
  gameType: string,
  weekKey: string,
  now: number
): Promise<Id<"portal_weekly_league_cohorts">> {
  const { weeklyLeagueTier } = await ensureWeeklyLeagueProfile(ctx, uid, gameType, now);
  let cohortId = await findOpenCohortForTier(ctx, weekKey, gameType, weeklyLeagueTier);
  if (!cohortId) {
    cohortId = await createCohort(ctx, weekKey, gameType, weeklyLeagueTier, now);
  }
  return cohortId;
}

export async function refreshCohortAfterHumanJoin(
  ctx: MutationCtx,
  cohortId: Id<"portal_weekly_league_cohorts">,
  now: number
): Promise<void> {
  const cohort = await ctx.db.get(cohortId);
  if (!cohort) return;
  const humanCount = await cohortHumanCount(ctx, cohortId, cohort);
  await ctx.db.patch(cohortId, { humanCount, updatedAt: now });
  await syncPortalWeeklyLeagueBotPadding(ctx, cohortId, now);
}

export type PortalCohortMemberRow = {
  uid: string;
  weeklyPoints: number;
  isBot: boolean;
  revealAt?: number;
  botWeekEndPoints?: number;
  finalRank?: number;
  outcome?: string;
};

export function comparePortalCohortMembers(
  a: Pick<PortalCohortMemberRow, "weeklyPoints" | "uid">,
  b: Pick<PortalCohortMemberRow, "weeklyPoints" | "uid">
): number {
  if (b.weeklyPoints !== a.weeklyPoints) return b.weeklyPoints - a.weeklyPoints;
  return a.uid.localeCompare(b.uid);
}

export async function listCohortMembers(
  ctx: QueryCtx,
  cohortId: Id<"portal_weekly_league_cohorts">
): Promise<PortalCohortMemberRow[]> {
  const rows = await ctx.db
    .query("portal_weekly_league_members")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect();

  return rows
    .map((r) => ({
      uid: r.uid,
      weeklyPoints: r.weeklyPoints,
      isBot: r.isBot,
      revealAt: r.revealAt,
      botWeekEndPoints: r.botWeekEndPoints,
      finalRank: r.finalRank,
      outcome: r.outcome,
    }))
    .sort(comparePortalCohortMembers);
}

export async function getCohortById(
  ctx: QueryCtx | MutationCtx,
  cohortId: Id<"portal_weekly_league_cohorts">
) {
  return await ctx.db.get(cohortId);
}
