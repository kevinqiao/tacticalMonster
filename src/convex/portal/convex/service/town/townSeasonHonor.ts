import {
  PORTAL_SEASON_MAX_LEVEL,
  PORTAL_SEASON_XP_PLAY,
  portalSeasonIdAt,
  portalSeasonLevelFromXp,
  portalSeasonXpProgress,
} from "../../data/portalSeasonHonorConfig";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export async function readTownSeasonHonorView(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  leagueScopeKey: string,
  now: number = Date.now()
) {
  const seasonId = portalSeasonIdAt(now);
  const row = await ctx.db
    .query("portal_season_honor_progress")
    .withIndex("by_uid_scope_season", (q) =>
      q.eq("uid", uid).eq("leagueScopeKey", leagueScopeKey).eq("seasonId", seasonId)
    )
    .unique();
  const seasonXp = row?.seasonXp ?? 0;
  const level = row?.level ?? portalSeasonLevelFromXp(seasonXp);
  const progress = portalSeasonXpProgress(level, seasonXp);
  return {
    seasonId,
    seasonLevel: level,
    seasonXp,
    xpIntoLevel: progress.xpIntoLevel,
    xpForLevel: progress.xpForLevel,
  };
}

export async function addTownSeasonPlayXp(
  ctx: MutationCtx,
  args: { uid: string; leagueScopeKey: string; now?: number }
): Promise<{ xpGranted: number; level: number }> {
  const now = args.now ?? Date.now();
  const seasonId = portalSeasonIdAt(now);
  const existing = await ctx.db
    .query("portal_season_honor_progress")
    .withIndex("by_uid_scope_season", (q) =>
      q
        .eq("uid", args.uid)
        .eq("leagueScopeKey", args.leagueScopeKey)
        .eq("seasonId", seasonId)
    )
    .unique();
  const grant = Math.max(0, Math.floor(PORTAL_SEASON_XP_PLAY));
  if (!existing) {
    const seasonXp = grant;
    const level = Math.min(PORTAL_SEASON_MAX_LEVEL, portalSeasonLevelFromXp(seasonXp));
    await ctx.db.insert("portal_season_honor_progress", {
      uid: args.uid,
      leagueScopeKey: args.leagueScopeKey,
      seasonId,
      seasonXp,
      level,
      updatedAt: now,
    });
    return { xpGranted: grant, level };
  }
  const seasonXp = existing.seasonXp + grant;
  const level = Math.min(PORTAL_SEASON_MAX_LEVEL, portalSeasonLevelFromXp(seasonXp));
  await ctx.db.patch(existing._id, { seasonXp, level, updatedAt: now });
  return { xpGranted: grant, level };
}
