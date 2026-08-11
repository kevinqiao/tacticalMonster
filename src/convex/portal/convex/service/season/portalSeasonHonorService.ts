/**
 * Portal 赛季荣誉：Season XP / Lv / 季末 E 章 finalize。
 */
import {
  PORTAL_SEASON_DAILY_WIN_XP_CAP,
  PORTAL_SEASON_MAX_LEVEL,
  PORTAL_SEASON_XP_PLAY,
  PORTAL_SEASON_XP_WEEK_PROMOTE,
  PORTAL_SEASON_XP_WEEK_SETTLE,
  PORTAL_SEASON_XP_WIN,
  portalSeasonLevelFromXp,
  portalSeasonXpProgress,
} from "../../data/portalSeasonHonorConfig";
import { dailyPeriodKey } from "../../utils/casualTaskPeriod";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx, type QueryCtx } from "../../_generated/server";
import { checkAndUnlockBadgesCore } from "../badge/portalBadgeService";
import { syncLobbyOfferingUnlocksForSeasonLevel } from "../lobby/lobbyOfferingUnlocks";
import { ensureWeeklyLeagueProfileForLobby } from "../weeklyLeague/casualWeeklyLeagueProfile";
import { resolveSeasonHonorContext } from "./resolvePortalSeasonHonor";

async function getSeasonRow(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  lobbyId: Id<"portal_lobbies">,
  seasonId: string
) {
  return await ctx.db
    .query("portal_season_honor_progress")
    .withIndex("by_uid_lobby_season", (q) =>
      q.eq("uid", uid).eq("lobbyId", lobbyId).eq("seasonId", seasonId)
    )
    .unique();
}

export async function ensureSeasonHonorProgress(
  ctx: MutationCtx,
  uid: string,
  lobbyId: Id<"portal_lobbies">,
  now: number = Date.now()
) {
  const honor = await resolveSeasonHonorContext(ctx, lobbyId, now, {
    persistStartsWeekKey: true,
  });
  if (!honor?.active) return null;
  const existing = await getSeasonRow(ctx, uid, lobbyId, honor.seasonId);
  if (existing) {
    // Retroactive permanent unlocks for players already at gated levels.
    await syncLobbyOfferingUnlocksForSeasonLevel(ctx, {
      uid,
      lobbyId,
      seasonLevel: existing.level,
      now,
    });
    return existing;
  }
  const id = await ctx.db.insert("portal_season_honor_progress", {
    uid,
    lobbyId,
    seasonId: honor.seasonId,
    seasonXp: 0,
    level: 1,
    updatedAt: now,
  });
  return (await ctx.db.get(id))!;
}

export async function finalizePreviousSeasonsIfNeeded(
  ctx: MutationCtx,
  uid: string,
  lobbyId: Id<"portal_lobbies">,
  now: number = Date.now()
): Promise<{ finalizedSeasonId: string | null; unlocked: string[] }> {
  const honor = await resolveSeasonHonorContext(ctx, lobbyId, now, {
    persistStartsWeekKey: true,
  });
  if (!honor) return { finalizedSeasonId: null, unlocked: [] };

  const currentSeasonId = honor.seasonId;
  const rows = await ctx.db
    .query("portal_season_honor_progress")
    .withIndex("by_uid_lobby_season", (q) => q.eq("uid", uid).eq("lobbyId", lobbyId))
    .collect();

  let finalizedSeasonId: string | null = null;
  let finalizedLevel = 1;
  const unlocked: string[] = [];

  for (const row of rows) {
    if (row.seasonId === currentSeasonId) continue;
    if (row.finalized) continue;
    const level = portalSeasonLevelFromXp(row.seasonXp);
    await ctx.db.patch(row._id, {
      level,
      finalized: true,
      finalizedAt: now,
      updatedAt: now,
    });
    const r = await checkAndUnlockBadgesCore(ctx, {
      uid,
      lobbyId,
      event: {
        kind: "season_finalized",
        seasonId: row.seasonId,
        seasonLevel: level,
      },
      now,
    });
    unlocked.push(...r.unlocked);
    finalizedSeasonId = row.seasonId;
    finalizedLevel = level;
  }

  if (finalizedSeasonId) {
    await ensureWeeklyLeagueProfileForLobby(ctx, uid, lobbyId, now);
    const profile = await ctx.db
      .query("portal_weekly_league_profile")
      .withIndex("by_uid_lobby", (q) => q.eq("uid", uid).eq("lobbyId", lobbyId))
      .unique();
    if (profile) {
      await ctx.db.patch(profile._id, {
        unreadSeasonMarks: true,
        unreadSeasonId: finalizedSeasonId,
        unreadSeasonLevel: finalizedLevel,
        updatedAt: now,
      });
    }
    // Permanent offering unlocks based on the season that just closed.
    await syncLobbyOfferingUnlocksForSeasonLevel(ctx, {
      uid,
      lobbyId,
      seasonLevel: finalizedLevel,
      now,
    });
  }

  return { finalizedSeasonId, unlocked };
}

export async function addSeasonHonorXp(
  ctx: MutationCtx,
  args: {
    uid: string;
    lobbyId: Id<"portal_lobbies">;
    kind: "win" | "play" | "week_settle" | "week_promote";
    now?: number;
  }
): Promise<{
  seasonXp: number;
  level: number;
  leveledUp: boolean;
  xpGranted: number;
}> {
  const now = args.now ?? Date.now();
  const honor = await resolveSeasonHonorContext(ctx, args.lobbyId, now, {
    persistStartsWeekKey: true,
  });
  if (!honor?.active) {
    return { seasonXp: 0, level: 1, leveledUp: false, xpGranted: 0 };
  }

  await finalizePreviousSeasonsIfNeeded(ctx, args.uid, args.lobbyId, now);
  const row = await ensureSeasonHonorProgress(ctx, args.uid, args.lobbyId, now);
  if (!row || row.finalized) {
    return {
      seasonXp: row?.seasonXp ?? 0,
      level: row?.level ?? 1,
      leveledUp: false,
      xpGranted: 0,
    };
  }

  let add = 0;
  const dayKey = dailyPeriodKey(now);
  let dailyWinXp = row.dailyWinXpKey === dayKey ? (row.dailyWinXp ?? 0) : 0;
  let dailyPlayXp = row.dailyPlayXpKey === dayKey ? (row.dailyPlayXp ?? 0) : 0;

  if (args.kind === "win") {
    const room = Math.max(0, PORTAL_SEASON_DAILY_WIN_XP_CAP - dailyWinXp);
    add = Math.min(PORTAL_SEASON_XP_WIN, room);
    dailyWinXp += add;
  } else if (args.kind === "play") {
    // Play XP is uncapped (null dailyPlayXpCap in economy SSOT).
    add = PORTAL_SEASON_XP_PLAY;
    dailyPlayXp += add;
  } else if (args.kind === "week_settle") {
    add = PORTAL_SEASON_XP_WEEK_SETTLE;
  } else if (args.kind === "week_promote") {
    add = PORTAL_SEASON_XP_WEEK_PROMOTE;
  }

  if (add <= 0) {
    return {
      seasonXp: row.seasonXp,
      level: row.level,
      leveledUp: false,
      xpGranted: 0,
    };
  }

  const prevLevel = row.level;
  const seasonXp = row.seasonXp + add;
  const level = Math.min(PORTAL_SEASON_MAX_LEVEL, portalSeasonLevelFromXp(seasonXp));
  await ctx.db.patch(row._id, {
    seasonXp,
    level,
    dailyWinXpKey: dayKey,
    dailyWinXp,
    dailyPlayXpKey: dayKey,
    dailyPlayXp,
    updatedAt: now,
  });
  await syncLobbyOfferingUnlocksForSeasonLevel(ctx, {
    uid: args.uid,
    lobbyId: args.lobbyId,
    seasonLevel: level,
    now,
  });
  return { seasonXp, level, leveledUp: level > prevLevel, xpGranted: add };
}

export async function readSeasonHonorView(
  ctx: QueryCtx,
  uid: string,
  lobbyId: Id<"portal_lobbies">,
  now: number = Date.now()
) {
  const honor = await resolveSeasonHonorContext(ctx, lobbyId, now);
  if (!honor) {
    return {
      active: false as const,
      seasonId: null as string | null,
      seasonLevel: null as number | null,
      seasonXp: 0,
      seasonWeek: null as number | null,
      seasonWeeks: null as number | null,
      startsWeekKey: null as string | null,
      xpIntoLevel: 0,
      xpForLevel: 0,
      xpToNext: 0,
      maxLevel: PORTAL_SEASON_MAX_LEVEL,
    };
  }
  if (!honor.active) {
    return {
      active: false as const,
      seasonId: honor.seasonId,
      seasonLevel: null as number | null,
      seasonXp: 0,
      seasonWeek: honor.seasonWeek,
      seasonWeeks: honor.seasonWeeks,
      startsWeekKey: honor.startsWeekKey,
      xpIntoLevel: 0,
      xpForLevel: 0,
      xpToNext: 0,
      maxLevel: PORTAL_SEASON_MAX_LEVEL,
    };
  }

  const row = await getSeasonRow(ctx, uid, lobbyId, honor.seasonId);
  const seasonXp = row?.seasonXp ?? 0;
  const level = row?.level ?? portalSeasonLevelFromXp(seasonXp);
  const prog = portalSeasonXpProgress(level, seasonXp);
  return {
    active: true as const,
    seasonId: honor.seasonId,
    seasonLevel: level,
    seasonXp,
    seasonWeek: honor.seasonWeek,
    seasonWeeks: honor.seasonWeeks,
    startsWeekKey: null as string | null,
    xpIntoLevel: prog.xpIntoLevel,
    xpForLevel: prog.xpForLevel,
    xpToNext: prog.xpToNext,
    maxLevel: PORTAL_SEASON_MAX_LEVEL,
  };
}

/** 周尾：给该成员加赛季 XP（完赛 + 可选晋级） */
export async function applySeasonXpOnWeekClose(
  ctx: MutationCtx,
  args: {
    uid: string;
    lobbyId: Id<"portal_lobbies">;
    promoted: boolean;
    now: number;
  }
) {
  await addSeasonHonorXp(ctx, {
    uid: args.uid,
    lobbyId: args.lobbyId,
    kind: "week_settle",
    now: args.now,
  });
  if (args.promoted) {
    await addSeasonHonorXp(ctx, {
      uid: args.uid,
      lobbyId: args.lobbyId,
      kind: "week_promote",
      now: args.now,
    });
  }
}

/**
 * Cron 兜底：扫未 finalize 的过期赛季进度并落 E 章 + unread 标记。
 * 主路径仍是玩家进 Lobby 时的懒结算。
 */
export const finalizeExpiredPortalSeasonProgress = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db.query("portal_season_honor_progress").collect();
    const keys = new Map<string, { uid: string; lobbyId: Id<"portal_lobbies"> }>();
    for (const row of rows) {
      if (row.finalized || !row.lobbyId) continue;
      keys.set(`${row.uid}:${row.lobbyId}`, {
        uid: row.uid,
        lobbyId: row.lobbyId,
      });
    }
    let processed = 0;
    for (const { uid, lobbyId } of keys.values()) {
      const r = await finalizePreviousSeasonsIfNeeded(ctx, uid, lobbyId, now);
      if (r.finalizedSeasonId) processed += 1;
    }
    return { scanned: keys.size, processed };
  },
});
