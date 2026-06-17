/**
 * 周联赛 cohort 分配与列表。
 * 每组最多 15 真人 + 固定 15 bot；虚席在查询层展示为「匹配中」。
 */
import {
  CASUAL_WEEKLY_LEAGUE_ENABLED,
  WEEKLY_LEAGUE_MAX_HUMANS_PER_COHORT,
  type WeeklyLeagueTierId,
} from "../../data/casualWeeklyLeagueConfig";
import { weeklyWindowMsShanghai } from "../../utils/casualTaskPeriod";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { ensureWeeklyLeagueProfile } from "./casualWeeklyLeagueProfile";
import { syncCohortBotPadding } from "./casualWeeklyLeagueBotFill";
import {
  resolveWeeklyLeagueCohortRowState,
  resolveWeeklyLeagueXpForMember,
  type WeeklyLeagueCohortRowState,
} from "./casualWeeklyLeagueBotXp";
import { weeklyLeagueMatchingSlotCounts } from "./casualWeeklyLeagueBotReveal";

async function cohortHumanCount(
  ctx: MutationCtx | QueryCtx,
  cohortId: Id<"casual_weekly_league_cohorts">,
  cohortRow?: { humanCount?: number } | null
): Promise<number> {
  if (typeof cohortRow?.humanCount === "number") {
    return cohortRow.humanCount;
  }
  const members = await ctx.db
    .query("casual_weekly_league_members")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect();
  return members.filter((m) => !m.isBot).length;
}

export async function findOpenCohortForTier(
  ctx: MutationCtx,
  weekKey: string,
  leagueTierId: WeeklyLeagueTierId
): Promise<Id<"casual_weekly_league_cohorts"> | null> {
  const open = await ctx.db
    .query("casual_weekly_league_cohorts")
    .withIndex("by_week_tier_status", (q) =>
      q.eq("weekKey", weekKey).eq("leagueTierId", leagueTierId).eq("status", "open")
    )
    .collect();

  const withRoom: Array<{ id: Id<"casual_weekly_league_cohorts">; cohortIndex: number; humans: number }> =
    [];
  for (const c of open) {
    const humans = await cohortHumanCount(ctx, c._id, c);
    if (humans < WEEKLY_LEAGUE_MAX_HUMANS_PER_COHORT) {
      withRoom.push({ id: c._id, cohortIndex: c.cohortIndex, humans });
    }
  }
  withRoom.sort((a, b) => b.humans - a.humans || a.cohortIndex - b.cohortIndex);
  return withRoom[0]?.id ?? null;
}

export async function createCohort(
  ctx: MutationCtx,
  weekKey: string,
  leagueTierId: WeeklyLeagueTierId,
  now: number
): Promise<Id<"casual_weekly_league_cohorts">> {
  const window = weeklyWindowMsShanghai(now);
  const existing = await ctx.db
    .query("casual_weekly_league_cohorts")
    .withIndex("by_week_tier_cohortIndex", (q) =>
      q.eq("weekKey", weekKey).eq("leagueTierId", leagueTierId)
    )
    .collect();
  const nextIndex =
    existing.length > 0 ? Math.max(...existing.map((c) => c.cohortIndex)) + 1 : 0;
  return await ctx.db.insert("casual_weekly_league_cohorts", {
    weekKey,
    leagueTierId,
    cohortIndex: nextIndex,
    memberCount: 0,
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
  weekKey: string,
  now: number
): Promise<Id<"casual_weekly_league_cohorts">> {
  const { weeklyLeagueTier } = await ensureWeeklyLeagueProfile(ctx, uid);
  let cohortId = await findOpenCohortForTier(ctx, weekKey, weeklyLeagueTier);
  if (!cohortId) {
    cohortId = await createCohort(ctx, weekKey, weeklyLeagueTier, now);
  }
  return cohortId;
}

/** 真人 member 写入后：首真人建 bot 池，后续只更新计数。 */
export async function refreshCohortAfterHumanJoin(
  ctx: MutationCtx,
  cohortId: Id<"casual_weekly_league_cohorts">,
  now: number
): Promise<void> {
  await syncCohortBotPadding(ctx, cohortId, now);
}

export type CohortMemberRow = {
  uid: string;
  weeklyLeagueXp: number;
  isBot: boolean;
  rowState: WeeklyLeagueCohortRowState;
  finalRank?: number;
  outcome?: string;
};

export type CohortListResult = {
  activeMembers: CohortMemberRow[];
  matching: {
    total: number;
    bots: number;
    humans: number;
  };
};

export async function listCohortMembers(
  ctx: QueryCtx,
  cohortId: Id<"casual_weekly_league_cohorts">,
  now: number = Date.now(),
  options?: { activeOnly?: boolean }
): Promise<CohortListResult> {
  const cohort = await ctx.db.get(cohortId);
  if (!cohort) {
    return { activeMembers: [], matching: { total: 0, bots: 0, humans: 0 } };
  }

  const rows = await ctx.db
    .query("casual_weekly_league_members")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect();

  const humanCount = rows.filter((r) => !r.isBot).length;
  const botRows = rows.filter((r) => r.isBot);
  const matching = weeklyLeagueMatchingSlotCounts({
    humanCount,
    botRows,
    now,
  });

  const activeMembers = rows
    .map((r) => {
      const rowState = resolveWeeklyLeagueCohortRowState(r, now);
      return {
        uid: r.uid,
        weeklyLeagueXp: resolveWeeklyLeagueXpForMember(r, cohort, now),
        isBot: r.isBot,
        rowState,
        finalRank: r.finalRank,
        outcome: r.outcome,
      };
    })
    .filter((r) => !options?.activeOnly || r.rowState === "active")
    .sort(
      (a, b) =>
        b.weeklyLeagueXp - a.weeklyLeagueXp || a.uid.localeCompare(b.uid)
    );

  return { activeMembers, matching };
}

export function isWeeklyLeagueActive(): boolean {
  return CASUAL_WEEKLY_LEAGUE_ENABLED;
}
