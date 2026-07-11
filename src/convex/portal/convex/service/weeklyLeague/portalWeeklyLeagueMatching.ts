/**
 * 周联赛匹配窗口：创建后 5 小时内可加人；超时或满员后结束匹配并补 Bot。
 * Bot 分数展示由前端轮询 query（现算阶梯分），不再靠 tick 写库推订阅。
 */
import {
  PORTAL_WEEKLY_LEAGUE_ENABLED,
  PORTAL_WEEKLY_LEAGUE_MATCHING_DURATION_MS,
} from "../../data/portalWeeklyLeagueConfig";
import { internalMutation } from "../../_generated/server";
import { closePortalWeeklyLeagueMatching } from "./portalWeeklyLeagueBotFill";

const MATCHING_CLOSE_BATCH = 40;

/** 扫描超时未关匹配的 open cohort，结束匹配并补 Bot。 */
export const closeExpiredPortalWeeklyLeagueMatching = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (!PORTAL_WEEKLY_LEAGUE_ENABLED) return { closed: 0 };
    const now = Date.now();
    const open = await ctx.db
      .query("portal_weekly_league_cohorts")
      .filter((q) => q.eq(q.field("status"), "open"))
      .take(200);

    let closed = 0;
    for (const cohort of open) {
      if (closed >= MATCHING_CLOSE_BATCH) break;
      if (cohort.matchingClosedAt != null) continue;
      const endsAt =
        cohort.matchingEndsAt ??
        cohort.createdAt + PORTAL_WEEKLY_LEAGUE_MATCHING_DURATION_MS;
      if (now < endsAt) continue;
      await closePortalWeeklyLeagueMatching(ctx, cohort._id, now);
      closed += 1;
    }
    return { closed };
  },
});
