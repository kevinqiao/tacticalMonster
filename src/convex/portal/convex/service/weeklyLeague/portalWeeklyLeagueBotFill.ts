/**
 * 周联赛 cohort Bot：首真人入组时固定 25 bot；后续真人只占虚席，不删 bot。
 */
import {
  PORTAL_WEEKLY_LEAGUE_BOT_POOL_SIZE,
} from "../../data/portalWeeklyLeagueConfig";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  computePortalWeeklyLeagueBotWeekEndPoints,
  leagueBotUidForSlot,
} from "./portalWeeklyLeagueBotPoints";
import { planPortalWeeklyLeagueBotRevealSchedule } from "./portalWeeklyLeagueBotReveal";

export async function syncPortalWeeklyLeagueBotPadding(
  ctx: MutationCtx,
  cohortId: Id<"portal_weekly_league_cohorts">,
  now: number = Date.now()
): Promise<{ botPoolSize: number; seeded: boolean }> {
  const cohort = await ctx.db.get(cohortId);
  if (!cohort || cohort.status !== "open") {
    return { botPoolSize: 0, seeded: false };
  }

  const members = await ctx.db
    .query("portal_weekly_league_members")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect();

  const humanCount = members.filter((m) => !m.isBot).length;
  const bots = members.filter((m) => m.isBot);
  let botPoolSize = bots.length;
  let seeded = false;

  if (bots.length === 0 && humanCount > 0) {
    const humanAnchorAt = now;
    const cohortKey = `${cohort.weekKey}|${cohort.gameType}|${cohort.leagueTierId}|${cohortId}`;
    const schedule = planPortalWeeklyLeagueBotRevealSchedule({
      cohortKey,
      startsAt: cohort.startsAt,
      humanAnchorAt,
    });

    for (const plan of schedule) {
      const weekEndPoints = computePortalWeeklyLeagueBotWeekEndPoints({
        cohortKey,
        slot: plan.slot,
      });
      await ctx.db.insert("portal_weekly_league_members", {
        weekKey: cohort.weekKey,
        uid: leagueBotUidForSlot(String(cohortId), plan.slot),
        gameType: cohort.gameType,
        cohortId,
        leagueTierId: cohort.leagueTierId,
        weeklyPoints: 0,
        isBot: true,
        revealAt: plan.revealAt,
        botWeekEndPoints: weekEndPoints,
        createdAt: now,
        updatedAt: now,
      });
    }

    botPoolSize = PORTAL_WEEKLY_LEAGUE_BOT_POOL_SIZE;
    seeded = true;

    await ctx.db.patch(cohortId, {
      humanAnchorAt,
      humanCount,
      botPoolSize,
      memberCount: humanCount + botPoolSize,
      updatedAt: now,
    });
    return { botPoolSize, seeded };
  }

  await ctx.db.patch(cohortId, {
    humanCount,
    botPoolSize: botPoolSize || cohort.botPoolSize,
    memberCount: humanCount + botPoolSize,
    updatedAt: now,
  });

  return { botPoolSize, seeded };
}
