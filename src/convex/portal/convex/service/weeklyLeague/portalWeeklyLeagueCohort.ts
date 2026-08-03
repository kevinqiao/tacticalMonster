/**
 * Portal 周联赛 cohort 分配（按 lobby + 段位；legacy gameType 路径仍可用）。
 * 匹配窗口内可加入；满员或超时后关闭匹配。
 */
import {
  PORTAL_WEEKLY_LEAGUE_MATCHING_DURATION_MS,
  PORTAL_WEEKLY_LEAGUE_MAX_HUMANS_PER_COHORT,
  portalWeeklyLeagueDisplayCohortNo,
  type PortalWeeklyLeagueTierId,
} from "../../data/portalWeeklyLeagueConfig";
import { weeklyWindowMsShanghai } from "../../utils/casualTaskPeriod";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  ensureWeeklyLeagueProfile,
  ensureWeeklyLeagueProfileForLobby,
} from "./casualWeeklyLeagueProfile";
import {
  maybeCloseMatchingIfFull,
  seedPortalWeeklyLeagueInitialBots,
  syncPortalWeeklyLeagueBotPadding,
} from "./portalWeeklyLeagueBotFill";

async function cohortHumanCount(
  ctx: MutationCtx | QueryCtx,
  cohortId: Id<"portal_weekly_league_cohorts">
): Promise<number> {
  // 始终从 members 实算：新建 cohort 的 humanCount 初值为 0，
  // 若信任缓存会在首真人入组后仍读到 0，导致 Bot 池/容量判断错误。
  const members = await ctx.db
    .query("portal_weekly_league_members")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect();
  return members.filter((m) => !m.isBot).length;
}

function isMatchingOpen(
  cohort: {
    matchingClosedAt?: number;
    matchingEndsAt?: number;
    createdAt: number;
  },
  now: number
): boolean {
  if (cohort.matchingClosedAt != null) return false;
  const endsAt = cohort.matchingEndsAt ?? cohort.createdAt + PORTAL_WEEKLY_LEAGUE_MATCHING_DURATION_MS;
  return now < endsAt;
}

export async function findOpenCohortForTier(
  ctx: MutationCtx,
  weekKey: string,
  gameType: string,
  leagueTierId: PortalWeeklyLeagueTierId,
  now: number = Date.now()
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
    if (!isMatchingOpen(c, now)) continue;
    const humans = await cohortHumanCount(ctx, c._id);
    if (humans < PORTAL_WEEKLY_LEAGUE_MAX_HUMANS_PER_COHORT) {
      withRoom.push({ id: c._id, cohortIndex: c.cohortIndex, humans });
    }
  }
  withRoom.sort((a, b) => b.humans - a.humans || a.cohortIndex - b.cohortIndex);
  return withRoom[0]?.id ?? null;
}

export async function findOpenCohortForLobbyTier(
  ctx: MutationCtx,
  weekKey: string,
  lobbyId: Id<"portal_lobbies">,
  leagueTierId: PortalWeeklyLeagueTierId,
  now: number = Date.now()
): Promise<Id<"portal_weekly_league_cohorts"> | null> {
  const open = await ctx.db
    .query("portal_weekly_league_cohorts")
    .withIndex("by_week_lobby_tier_status", (q) =>
      q
        .eq("weekKey", weekKey)
        .eq("lobbyId", lobbyId)
        .eq("leagueTierId", leagueTierId)
        .eq("status", "open")
    )
    .collect();

  const withRoom: Array<{ id: Id<"portal_weekly_league_cohorts">; cohortIndex: number; humans: number }> =
    [];
  for (const c of open) {
    if (!isMatchingOpen(c, now)) continue;
    const humans = await cohortHumanCount(ctx, c._id);
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
  const cohortId = await ctx.db.insert("portal_weekly_league_cohorts", {
    weekKey,
    gameType,
    leagueTierId,
    cohortIndex: nextIndex,
    displayCode,
    humanCount: 0,
    status: "open",
    matchingEndsAt: now + PORTAL_WEEKLY_LEAGUE_MATCHING_DURATION_MS,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    createdAt: now,
    updatedAt: now,
  });
  // 创建时固定种入 15 Bot：立即可见 3–10，其余在 5h 内陆续可见
  await seedPortalWeeklyLeagueInitialBots(ctx, cohortId, now);
  return cohortId;
}

export async function createCohortForLobby(
  ctx: MutationCtx,
  weekKey: string,
  lobbyId: Id<"portal_lobbies">,
  leagueTierId: PortalWeeklyLeagueTierId,
  now: number,
  lobbySlugForDisplay: string = "lobby"
): Promise<Id<"portal_weekly_league_cohorts">> {
  const window = weeklyWindowMsShanghai(now);
  const existing = await ctx.db
    .query("portal_weekly_league_cohorts")
    .withIndex("by_week_lobby_tier_index", (q) =>
      q.eq("weekKey", weekKey).eq("lobbyId", lobbyId).eq("leagueTierId", leagueTierId)
    )
    .collect();
  const nextIndex =
    existing.length > 0 ? Math.max(...existing.map((c) => c.cohortIndex)) + 1 : 0;
  const displayCode = portalWeeklyLeagueDisplayCohortNo({
    weekKey,
    gameType: lobbySlugForDisplay,
    leagueTierId,
    cohortIndex: nextIndex,
  });
  const cohortId = await ctx.db.insert("portal_weekly_league_cohorts", {
    weekKey,
    lobbyId,
    leagueTierId,
    cohortIndex: nextIndex,
    displayCode,
    humanCount: 0,
    status: "open",
    matchingEndsAt: now + PORTAL_WEEKLY_LEAGUE_MATCHING_DURATION_MS,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    createdAt: now,
    updatedAt: now,
  });
  await seedPortalWeeklyLeagueInitialBots(ctx, cohortId, now);
  return cohortId;
}

export async function assignCohortForUid(
  ctx: MutationCtx,
  uid: string,
  gameType: string,
  weekKey: string,
  now: number
): Promise<Id<"portal_weekly_league_cohorts">> {
  const { weeklyLeagueTier } = await ensureWeeklyLeagueProfile(ctx, uid, gameType, now);
  let cohortId = await findOpenCohortForTier(ctx, weekKey, gameType, weeklyLeagueTier, now);
  if (!cohortId) {
    cohortId = await createCohort(ctx, weekKey, gameType, weeklyLeagueTier, now);
  }
  return cohortId;
}

/** Preferred: assign cohort by lobby (new weeks). */
export async function assignCohortForUidByLobby(
  ctx: MutationCtx,
  uid: string,
  lobbyId: Id<"portal_lobbies">,
  weekKey: string,
  now: number,
  lobbySlugForDisplay: string = "lobby"
): Promise<Id<"portal_weekly_league_cohorts">> {
  const { weeklyLeagueTier } = await ensureWeeklyLeagueProfileForLobby(
    ctx,
    uid,
    lobbyId,
    now
  );
  let cohortId = await findOpenCohortForLobbyTier(
    ctx,
    weekKey,
    lobbyId,
    weeklyLeagueTier,
    now
  );
  if (!cohortId) {
    cohortId = await createCohortForLobby(
      ctx,
      weekKey,
      lobbyId,
      weeklyLeagueTier,
      now,
      lobbySlugForDisplay
    );
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
  const humanCount = await cohortHumanCount(ctx, cohortId);
  await ctx.db.patch(cohortId, {
    humanCount,
    humanAnchorAt: cohort.humanAnchorAt ?? now,
    updatedAt: now,
  });
  // 匹配窗口内不新种初始 Bot（创建时已种）；满员则立刻关匹配并可能补位
  const closed = await maybeCloseMatchingIfFull(ctx, cohortId, now);
  if (!closed) {
    await syncPortalWeeklyLeagueBotPadding(ctx, cohortId, now);
  }
}

export type PortalCohortMemberRow = {
  uid: string;
  weeklyPoints: number;
  isBot: boolean;
  revealAt?: number;
  botStartPoints?: number;
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
      botStartPoints: r.botStartPoints,
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
