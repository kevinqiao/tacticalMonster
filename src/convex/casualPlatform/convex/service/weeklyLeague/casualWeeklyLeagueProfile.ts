/**
 * 周联赛 profile：ensure 行、读段位。
 */
import {
  CASUAL_WEEKLY_LEAGUE_ENABLED,
  DEFAULT_WEEKLY_LEAGUE_TIER,
  type WeeklyLeagueTierId,
} from "../../data/casualWeeklyLeagueConfig";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export async function ensureWeeklyLeagueProfile(
  ctx: MutationCtx,
  uid: string
): Promise<{ weeklyLeagueTier: WeeklyLeagueTierId }> {
  const now = Date.now();
  const row = await ctx.db
    .query("casual_weekly_league_profile")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .unique();
  if (!row) {
    await ctx.db.insert("casual_weekly_league_profile", {
      uid,
      weeklyLeagueTier: DEFAULT_WEEKLY_LEAGUE_TIER,
      peakLeagueTier: DEFAULT_WEEKLY_LEAGUE_TIER,
      totalWeeklyPromotions: 0,
      totalMultiplayerWins: 0,
      totalMatchWins: 0,
      totalTriathlonCompletes: 0,
      updatedAt: now,
    });
    return { weeklyLeagueTier: DEFAULT_WEEKLY_LEAGUE_TIER };
  }
  return { weeklyLeagueTier: row.weeklyLeagueTier as WeeklyLeagueTierId };
}

export async function readWeeklyLeagueTier(
  ctx: QueryCtx | MutationCtx,
  uid: string
): Promise<WeeklyLeagueTierId> {
  if (!CASUAL_WEEKLY_LEAGUE_ENABLED) return DEFAULT_WEEKLY_LEAGUE_TIER;
  const row = await ctx.db
    .query("casual_weekly_league_profile")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .unique();
  return (row?.weeklyLeagueTier as WeeklyLeagueTierId) ?? DEFAULT_WEEKLY_LEAGUE_TIER;
}
