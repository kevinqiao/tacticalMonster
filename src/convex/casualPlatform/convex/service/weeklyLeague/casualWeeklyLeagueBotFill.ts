/**
 * 周联赛 cohort Bot：首真人入组时固定 15 bot + revealAt；后续真人只占虚席，不删 bot。
 */
import {
  WEEKLY_LEAGUE_BOT_POOL_SIZE,
} from "../../data/casualWeeklyLeagueConfig";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { planWeeklyLeagueBotRevealSchedule } from "./casualWeeklyLeagueBotReveal";

export function botUidForSlot(
  cohortId: Id<"casual_weekly_league_cohorts">,
  slot: number
): string {
  return `wl_bot_${cohortId}_${slot}`;
}

export function botSlotFromUid(uid: string): number | null {
  const i = uid.lastIndexOf("_");
  if (i < 0) return null;
  const slot = Number.parseInt(uid.slice(i + 1), 10);
  return Number.isFinite(slot) && slot >= 0 ? slot : null;
}

/**
 * 真人 member 写入后：首真人建 15 bot 池；后续仅更新计数，永不 delete bot。
 */
export async function syncCohortBotPadding(
  ctx: MutationCtx,
  cohortId: Id<"casual_weekly_league_cohorts">,
  now: number = Date.now()
): Promise<{ botPoolSize: number; seeded: boolean }> {
  const cohort = await ctx.db.get(cohortId);
  if (!cohort || cohort.status !== "open") {
    return { botPoolSize: 0, seeded: false };
  }

  const members = await ctx.db
    .query("casual_weekly_league_members")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect();

  const humanCount = members.filter((m) => !m.isBot).length;
  const bots = members.filter((m) => m.isBot);
  let botPoolSize = bots.length;
  let seeded = false;

  if (bots.length === 0 && humanCount > 0) {
    const humanAnchorAt = now;
    const schedule = planWeeklyLeagueBotRevealSchedule({
      cohortId: String(cohortId),
      startsAt: cohort.startsAt,
      humanAnchorAt,
    });

    for (const plan of schedule) {
      await ctx.db.insert("casual_weekly_league_members", {
        weekKey: cohort.weekKey,
        uid: botUidForSlot(cohortId, plan.slot),
        cohortId,
        leagueTierId: cohort.leagueTierId,
        weeklyLeagueXp: 0,
        isBot: true,
        revealAt: plan.revealAt,
        createdAt: now,
        updatedAt: now,
      });
    }

    botPoolSize = WEEKLY_LEAGUE_BOT_POOL_SIZE;
    seeded = true;

    await ctx.db.patch(cohortId, {
      humanAnchorAt,
      humanCount,
      memberCount: humanCount + botPoolSize,
      updatedAt: now,
    });
    return { botPoolSize, seeded };
  }

  await ctx.db.patch(cohortId, {
    humanCount,
    memberCount: humanCount + botPoolSize,
    updatedAt: now,
  });

  return { botPoolSize, seeded };
}
