/**
 * Portal 周联赛：首次登录入组、组内排名、段位视图快照。
 */
import {
  DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
  PORTAL_WEEKLY_LEAGUE_COHORT_SIZE,
  PORTAL_WEEKLY_LEAGUE_ENABLED,
  PORTAL_WEEKLY_LEAGUE_MATCHING_DURATION_MS,
  PORTAL_WEEKLY_LEAGUE_ZONE_BANDS,
  resolvePortalCohortDisplayCode,
  portalWeeklyLeagueProjectedCoins,
  type PortalWeeklyLeagueTierId,
} from "../../data/portalWeeklyLeagueConfig";
import { weeklyPeriodKey, weeklyWindowMsShanghai } from "../../utils/casualTaskPeriod";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  assignCohortForUid,
  assignCohortForUidByLobby,
  getCohortById,
  listCohortMembers,
  refreshCohortAfterHumanJoin,
} from "./portalWeeklyLeagueCohort";
import {
  closePortalWeeklyLeagueMatching,
  syncPortalWeeklyLeagueBotPadding,
} from "./portalWeeklyLeagueBotFill";
import { resolvePortalWeeklyLeagueBotPoints } from "./portalWeeklyLeagueBotPoints";
import { isPortalWeeklyLeagueBotRevealed } from "./portalWeeklyLeagueBotReveal";
import {
  ensureWeeklyLeagueProfile,
  ensureWeeklyLeagueProfileForLobby,
  readWeeklyLeagueTier,
  readWeeklyLeagueTierForLobby,
} from "./casualWeeklyLeagueProfile";
import { readSeasonHonorView } from "../season/portalSeasonHonorService";
import {
  ensureUniqueDisplayNames,
  resolvePlayerDisplayName,
} from "../../../../shared/displayName";
import { loadDisplayNameMap } from "../player/portalDisplayNameLookup";

export async function getWeeklyLeagueMember(
  ctx: QueryCtx | MutationCtx,
  args: { uid: string; gameType: string; weekKey: string }
) {
  return await ctx.db
    .query("portal_weekly_league_members")
    .withIndex("by_week_game_uid", (q) =>
      q.eq("weekKey", args.weekKey).eq("gameType", args.gameType).eq("uid", args.uid)
    )
    .unique();
}

/** 本周首次登录 Portal 时入 cohort（幂等）。 */
export async function ensurePortalWeeklyLeagueMember(
  ctx: MutationCtx,
  uid: string,
  gameType: string,
  now: number = Date.now()
): Promise<Id<"portal_weekly_league_members"> | null> {
  if (!PORTAL_WEEKLY_LEAGUE_ENABLED) {
    console.log("[portal] weekly league disabled; skip ensure member", { uid, gameType });
    return null;
  }
  const weekKey = weeklyPeriodKey(now);
  const existing = await getWeeklyLeagueMember(ctx, { uid, gameType, weekKey });
  if (existing) {
    const cohort = await getCohortById(ctx, existing.cohortId);
    if (
      cohort &&
      cohort.status === "open" &&
      cohort.matchingClosedAt == null &&
      now >=
        (cohort.matchingEndsAt ??
          cohort.createdAt + PORTAL_WEEKLY_LEAGUE_MATCHING_DURATION_MS)
    ) {
      await closePortalWeeklyLeagueMatching(ctx, existing.cohortId, now);
    } else {
      await syncPortalWeeklyLeagueBotPadding(ctx, existing.cohortId, now);
    }
    return existing._id;
  }

  const { weeklyLeagueTier } = await ensureWeeklyLeagueProfile(ctx, uid, gameType, now);
  const cohortId = await assignCohortForUid(ctx, uid, gameType, weekKey, now);
  const memberId = await ctx.db.insert("portal_weekly_league_members", {
    weekKey,
    uid,
    gameType,
    cohortId,
    leagueTierId: weeklyLeagueTier,
    weeklyPoints: 0,
    isBot: false,
    createdAt: now,
    updatedAt: now,
  });
  await refreshCohortAfterHumanJoin(ctx, cohortId, now);
  console.log("[portal] weekly league member enrolled", {
    uid,
    gameType,
    weekKey,
    cohortId,
    memberId,
    weeklyLeagueTier,
  });
  return memberId;
}

export async function getWeeklyLeagueMemberByLobby(
  ctx: QueryCtx | MutationCtx,
  args: { uid: string; lobbyId: Id<"portal_lobbies">; weekKey: string }
) {
  return await ctx.db
    .query("portal_weekly_league_members")
    .withIndex("by_week_lobby_uid", (q) =>
      q.eq("weekKey", args.weekKey).eq("lobbyId", args.lobbyId).eq("uid", args.uid)
    )
    .unique();
}

/** Prefer lobby-scoped enrollment for multi-game lobbies. */
export async function ensurePortalWeeklyLeagueMemberForLobby(
  ctx: MutationCtx,
  uid: string,
  lobbyId: Id<"portal_lobbies">,
  lobbySlug: string = "lobby",
  now: number = Date.now()
): Promise<Id<"portal_weekly_league_members"> | null> {
  if (!PORTAL_WEEKLY_LEAGUE_ENABLED) {
    console.log("[portal] weekly league disabled; skip ensure member (lobby)", {
      uid,
      lobbyId,
    });
    return null;
  }
  const weekKey = weeklyPeriodKey(now);
  const existing = await getWeeklyLeagueMemberByLobby(ctx, { uid, lobbyId, weekKey });
  if (existing) {
    const cohort = await getCohortById(ctx, existing.cohortId);
    if (
      cohort &&
      cohort.status === "open" &&
      cohort.matchingClosedAt == null &&
      now >=
        (cohort.matchingEndsAt ??
          cohort.createdAt + PORTAL_WEEKLY_LEAGUE_MATCHING_DURATION_MS)
    ) {
      await closePortalWeeklyLeagueMatching(ctx, existing.cohortId, now);
    } else {
      await syncPortalWeeklyLeagueBotPadding(ctx, existing.cohortId, now);
    }
    return existing._id;
  }

  const { weeklyLeagueTier } = await ensureWeeklyLeagueProfileForLobby(
    ctx,
    uid,
    lobbyId,
    now
  );
  const cohortId = await assignCohortForUidByLobby(
    ctx,
    uid,
    lobbyId,
    weekKey,
    now,
    lobbySlug
  );
  const memberId = await ctx.db.insert("portal_weekly_league_members", {
    weekKey,
    uid,
    lobbyId,
    cohortId,
    leagueTierId: weeklyLeagueTier,
    weeklyPoints: 0,
    isBot: false,
    createdAt: now,
    updatedAt: now,
  });
  await refreshCohortAfterHumanJoin(ctx, cohortId, now);
  console.log("[portal] weekly league member enrolled (lobby)", {
    uid,
    lobbyId,
    weekKey,
    cohortId,
    memberId,
    weeklyLeagueTier,
  });
  return memberId;
}

async function effectivePointsForMember(
  ctx: QueryCtx | MutationCtx,
  member: Awaited<ReturnType<typeof listCohortMembers>>[number],
  cohort: NonNullable<Awaited<ReturnType<typeof getCohortById>>>,
  now: number
): Promise<number> {
  if (!member.isBot) return Math.max(0, member.weeklyPoints);
  if (!isPortalWeeklyLeagueBotRevealed(member.revealAt, now)) return 0;
  return resolvePortalWeeklyLeagueBotPoints(
    {
      uid: member.uid,
      revealAt: member.revealAt,
      botStartPoints: member.botStartPoints,
      botWeekEndPoints: member.botWeekEndPoints,
      weeklyPoints: member.weeklyPoints,
    },
    {
      _id: String(cohort._id),
      weekKey: cohort.weekKey,
      gameType: cohort.gameType ?? (cohort.lobbyId ? `lobby:${cohort.lobbyId}` : undefined),
      lobbyId: cohort.lobbyId ? String(cohort.lobbyId) : undefined,
      leagueTierId: cohort.leagueTierId,
      startsAt: cohort.startsAt,
      endsAt: cohort.endsAt,
      status: cohort.status,
    },
    now
  );
}

async function cohortRankForMember(
  ctx: QueryCtx | MutationCtx,
  cohortId: Id<"portal_weekly_league_cohorts">,
  uid: string,
  now: number = Date.now()
): Promise<number | null> {
  const cohort = await getCohortById(ctx, cohortId);
  if (!cohort) return null;
  const members = await listCohortMembers(ctx, cohortId);
  const visible = members.filter(
    (m) => !m.isBot || isPortalWeeklyLeagueBotRevealed(m.revealAt, now)
  );
  const ranked = await Promise.all(
    visible.map(async (m) => ({
      uid: m.uid,
      points: await effectivePointsForMember(ctx, m, cohort, now),
    }))
  );
  ranked.sort((a, b) => b.points - a.points || a.uid.localeCompare(b.uid));
  const idx = ranked.findIndex((m) => m.uid === uid);
  return idx >= 0 ? idx + 1 : null;
}

/** 当前组内可见人数（真人 + 已 reveal 的 Bot） */
async function cohortVisibleMemberCount(
  ctx: QueryCtx | MutationCtx,
  cohortId: Id<"portal_weekly_league_cohorts">,
  now: number = Date.now()
): Promise<number> {
  const members = await listCohortMembers(ctx, cohortId);
  return members.filter(
    (m) => !m.isBot || isPortalWeeklyLeagueBotRevealed(m.revealAt, now)
  ).length;
}

export type PortalWeeklyLeagueTierView = {
  weekKey: string;
  weekEndsAt: number;
  enrolled: boolean;
  tierId: PortalWeeklyLeagueTierId;
  /** 历史最高段位（跨周） */
  peakLeagueTier: PortalWeeklyLeagueTierId;
  cohortNo: string | null;
  cohortRank: number | null;
  /** 设计容量（三区条 / 升降区文案，固定 30） */
  cohortSize: number;
  /** 当前可见人数（名次 #x / N 的分母） */
  cohortMemberCount: number;
  points: number;
  promoteTo: number;
  demoteFrom: number;
  projectedCoins: number | null;
  /** 有待读周尾结算（可能来自上一周 member） */
  unreadCloseResult: boolean;
  closeWeekKey?: string;
  lastOutcome?: "promote" | "safe" | "demote";
  lastFinalRank?: number;
  /** 未领取的周联赛金币（与 unreadClose 独立，dismiss 后仍可见） */
  unclaimedRewards?: PortalWeeklyLeagueUnclaimedRewards;
  /** 赛季荣誉（Lobby 细条） */
  seasonId?: string;
  seasonLevel?: number;
  seasonXp?: number;
  /** 本季第几周（1-based） */
  seasonWeek?: number;
  seasonWeeks?: number;
  seasonXpIntoLevel?: number;
  seasonXpForLevel?: number;
  unreadSeasonMarks?: boolean;
  unreadSeasonId?: string | null;
  unreadSeasonLevel?: number | null;
};

export type PortalWeeklyLeagueUnclaimedRewards = {
  weekKey: string;
  coins: number;
  outcome?: "promote" | "safe" | "demote";
  finalRank?: number;
};

async function findUnreadPortalWeeklyLeagueClose(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  scope: { lobbyId: Id<"portal_lobbies"> } | { gameType: string }
) {
  const members = "lobbyId" in scope
    ? await ctx.db
        .query("portal_weekly_league_members")
        .withIndex("by_uid_lobby", (q) => q.eq("uid", uid).eq("lobbyId", scope.lobbyId))
        .collect()
    : await ctx.db
        .query("portal_weekly_league_members")
        .withIndex("by_uid_game", (q) => q.eq("uid", uid).eq("gameType", scope.gameType))
        .collect();
  return (
    members
      .filter((m) => !m.isBot && m.unreadClose === true)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
  );
}

export async function findUnclaimedPortalWeeklyLeagueRewards(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  scope: { lobbyId: Id<"portal_lobbies"> } | { gameType: string }
): Promise<PortalWeeklyLeagueUnclaimedRewards | null> {
  const members = "lobbyId" in scope
    ? await ctx.db
        .query("portal_weekly_league_members")
        .withIndex("by_uid_lobby", (q) => q.eq("uid", uid).eq("lobbyId", scope.lobbyId))
        .collect()
    : await ctx.db
        .query("portal_weekly_league_members")
        .withIndex("by_uid_game", (q) => q.eq("uid", uid).eq("gameType", scope.gameType))
        .collect();
  const member =
    members
      .filter(
        (m) =>
          !m.isBot &&
          m.pendingRewards &&
          !m.rewardsClaimedAt &&
          (m.pendingRewards.coins ?? 0) > 0
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
  if (!member?.pendingRewards) return null;
  return {
    weekKey: member.weekKey,
    coins: member.pendingRewards.coins ?? 0,
    outcome: member.outcome,
    finalRank: member.finalRank,
  };
}

/** @deprecated Prefer lobby scope via getPortalWeeklyLeagueTierViewForUidScoped */
export async function getPortalWeeklyLeagueTierViewForUid(
  ctx: QueryCtx,
  uid: string,
  gameType: string,
  now: number = Date.now()
): Promise<PortalWeeklyLeagueTierView> {
  return getPortalWeeklyLeagueTierViewForUidScoped(ctx, uid, { gameType }, now);
}

export async function getPortalWeeklyLeagueTierViewForUidScoped(
  ctx: QueryCtx,
  uid: string,
  scope: { lobbyId: Id<"portal_lobbies"> } | { gameType: string },
  now: number = Date.now()
): Promise<PortalWeeklyLeagueTierView> {
  const weekKey = weeklyPeriodKey(now);
  const window = weeklyWindowMsShanghai(now);
  const tierId =
    "lobbyId" in scope
      ? await readWeeklyLeagueTierForLobby(ctx, uid, scope.lobbyId)
      : await readWeeklyLeagueTier(ctx, uid, scope.gameType);
  const bands = PORTAL_WEEKLY_LEAGUE_ZONE_BANDS[tierId];

  const profile =
    "lobbyId" in scope
      ? await ctx.db
          .query("portal_weekly_league_profile")
          .withIndex("by_uid_lobby", (q) =>
            q.eq("uid", uid).eq("lobbyId", scope.lobbyId)
          )
          .unique()
      : await ctx.db
          .query("portal_weekly_league_profile")
          .withIndex("by_uid_game", (q) =>
            q.eq("uid", uid).eq("gameType", scope.gameType)
          )
          .unique();
  const peakLeagueTier = (profile?.peakLeagueTier ??
    DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER) as PortalWeeklyLeagueTierId;

  let seasonFields: Partial<PortalWeeklyLeagueTierView> = {};
  if ("lobbyId" in scope) {
    const season = await readSeasonHonorView(ctx, uid, scope.lobbyId, now);
    if (season.active && season.seasonLevel != null) {
      seasonFields = {
        seasonId: season.seasonId ?? undefined,
        seasonLevel: season.seasonLevel,
        seasonXp: season.seasonXp,
        seasonWeek: season.seasonWeek ?? undefined,
        seasonWeeks: season.seasonWeeks ?? undefined,
        seasonXpIntoLevel: season.xpIntoLevel,
        seasonXpForLevel: season.xpForLevel,
        unreadSeasonMarks: Boolean(profile?.unreadSeasonMarks),
        unreadSeasonId: profile?.unreadSeasonId ?? null,
        unreadSeasonLevel: profile?.unreadSeasonLevel ?? null,
      };
    } else {
      // next_season 门控未到：不展示 Season 条；仍可弹已 finalize 的未读季末章
      seasonFields = {
        unreadSeasonMarks: Boolean(profile?.unreadSeasonMarks),
        unreadSeasonId: profile?.unreadSeasonId ?? null,
        unreadSeasonLevel: profile?.unreadSeasonLevel ?? null,
      };
    }
  }

  const member =
    "lobbyId" in scope
      ? await getWeeklyLeagueMemberByLobby(ctx, { uid, lobbyId: scope.lobbyId, weekKey })
      : await getWeeklyLeagueMember(ctx, { uid, gameType: scope.gameType, weekKey });
  const unreadClose = await findUnreadPortalWeeklyLeagueClose(ctx, uid, scope);
  const unclaimedRewards = await findUnclaimedPortalWeeklyLeagueRewards(ctx, uid, scope);
  const closeFields = unreadClose
    ? {
        unreadCloseResult: true as const,
        closeWeekKey: unreadClose.weekKey,
        lastOutcome: unreadClose.outcome,
        lastFinalRank: unreadClose.finalRank,
      }
    : { unreadCloseResult: false as const };
  const unclaimedFields = unclaimedRewards ? { unclaimedRewards } : {};

  if (!member) {
    return {
      weekKey,
      weekEndsAt: window.endsAt,
      enrolled: false,
      tierId,
      peakLeagueTier,
      cohortNo: null,
      cohortRank: null,
      cohortSize: PORTAL_WEEKLY_LEAGUE_COHORT_SIZE,
      cohortMemberCount: 0,
      points: 0,
      promoteTo: bands.promoteMaxRank,
      demoteFrom: bands.safeMaxRank + 1,
      projectedCoins: null,
      ...closeFields,
      ...unclaimedFields,
      ...seasonFields,
    };
  }

  const cohort = await getCohortById(ctx, member.cohortId);
  const [cohortRank, cohortMemberCount] = await Promise.all([
    cohortRankForMember(ctx, member.cohortId, uid, now),
    cohortVisibleMemberCount(ctx, member.cohortId, now),
  ]);
  const projectedCoins =
    cohortRank != null ? portalWeeklyLeagueProjectedCoins(tierId, cohortRank) : null;

  return {
    weekKey,
    weekEndsAt: window.endsAt,
    enrolled: true,
    tierId: member.leagueTierId as PortalWeeklyLeagueTierId,
    peakLeagueTier,
    cohortNo: cohort != null ? resolvePortalCohortDisplayCode(cohort) : null,
    cohortRank,
    cohortSize: PORTAL_WEEKLY_LEAGUE_COHORT_SIZE,
    cohortMemberCount,
    points: Math.max(0, member.weeklyPoints),
    promoteTo: bands.promoteMaxRank,
    demoteFrom: bands.safeMaxRank + 1,
    projectedCoins,
    ...closeFields,
    ...unclaimedFields,
    ...seasonFields,
  };
}

export type PortalWeeklyLeagueCohortLeaderboardRow = {
  rank: number;
  uid: string;
  points: number;
  matchCount: number;
  displayName: string;
  isBot: boolean;
};

/** @deprecated Prefer lobby scope via listPortalWeeklyLeagueCohortBoardScoped */
export async function listPortalWeeklyLeagueCohortBoard(
  ctx: QueryCtx,
  uid: string,
  gameType: string,
  limit: number = 30,
  now: number = Date.now()
): Promise<{ rows: PortalWeeklyLeagueCohortLeaderboardRow[]; cohortNo: string | null } | null> {
  return listPortalWeeklyLeagueCohortBoardScoped(ctx, uid, { gameType }, limit, now);
}

export async function listPortalWeeklyLeagueCohortBoardScoped(
  ctx: QueryCtx,
  uid: string,
  scope: { lobbyId: Id<"portal_lobbies"> } | { gameType: string },
  limit: number = 30,
  now: number = Date.now()
): Promise<{ rows: PortalWeeklyLeagueCohortLeaderboardRow[]; cohortNo: string | null } | null> {
  const weekKey = weeklyPeriodKey(now);
  const member =
    "lobbyId" in scope
      ? await getWeeklyLeagueMemberByLobby(ctx, { uid, lobbyId: scope.lobbyId, weekKey })
      : await getWeeklyLeagueMember(ctx, { uid, gameType: scope.gameType, weekKey });
  if (!member) return null;

  const cohort = await getCohortById(ctx, member.cohortId);
  if (!cohort) return null;

  const members = await listCohortMembers(ctx, member.cohortId);
  const visible = members.filter(
    (m) => !m.isBot || isPortalWeeklyLeagueBotRevealed(m.revealAt, now)
  );
  const ranked = await Promise.all(
    visible.map(async (m) => ({
      member: m,
      points: await effectivePointsForMember(ctx, m, cohort, now),
    }))
  );
  ranked.sort(
    (a, b) => b.points - a.points || a.member.uid.localeCompare(b.member.uid)
  );
  const slice = ranked.slice(0, limit);
  const customNames = await loadDisplayNameMap(
    ctx,
    slice.filter(({ member: m }) => !m.isBot).map(({ member: m }) => m.uid)
  );
  const names = ensureUniqueDisplayNames(
    slice.map(({ member: m }) => ({
      key: m.uid,
      seed: m.uid,
      preferredName: customNames.get(m.uid) ?? null,
    }))
  );

  return {
    cohortNo: resolvePortalCohortDisplayCode(cohort),
    rows: slice.map(({ member: m, points }, i) => ({
      rank: i + 1,
      uid: m.uid,
      points,
      matchCount: 0,
      displayName: names[i] ?? resolvePlayerDisplayName({
        uid: m.uid,
        customName: customNames.get(m.uid),
      }),
      isBot: m.isBot,
    })),
  };
}
