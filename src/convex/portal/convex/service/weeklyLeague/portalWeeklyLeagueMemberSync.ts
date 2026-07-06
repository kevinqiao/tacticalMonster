import { PORTAL_WEEKLY_LEAGUE_ENABLED } from "../../data/portalWeeklyLeagueConfig";
import type { MutationCtx } from "../../_generated/server";

/** 总榜积分变更后同步到 league member（避免 service 层循环依赖）。 */
export async function syncMemberWeeklyPointsFromTotal(
  ctx: MutationCtx,
  args: {
    uid: string;
    gameType: string;
    weekKey: string;
    totalPoints: number;
    now?: number;
  }
): Promise<void> {
  if (!PORTAL_WEEKLY_LEAGUE_ENABLED) return;
  const member = await ctx.db
    .query("portal_weekly_league_members")
    .withIndex("by_week_game_uid", (q) =>
      q.eq("weekKey", args.weekKey).eq("gameType", args.gameType).eq("uid", args.uid)
    )
    .unique();
  if (!member || member.isBot) return;
  if (member.weeklyPoints === args.totalPoints) return;
  await ctx.db.patch(member._id, {
    weeklyPoints: args.totalPoints,
    updatedAt: args.now ?? Date.now(),
  });
}
