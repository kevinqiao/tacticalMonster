/**
 * 周尾结算：排名、升降 tier、pendingRewards、peak 更新。
 */
import { internal } from "../../_generated/api";
import {
  CASUAL_WEEKLY_LEAGUE_ENABLED,
  maxWeeklyLeagueTier,
  nextWeeklyLeagueTier,
  prevWeeklyLeagueTier,
  scaleWeeklyLeagueRewards,
  WEEKLY_LEAGUE_PROMOTION_VOUCHER,
  weeklyLeagueRewardsForFinalRank,
  weeklyLeagueZoneForRank,
  type WeeklyLeagueTierId,
} from "../../data/casualWeeklyLeagueConfig";
import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import type { Id } from "../../_generated/dataModel";
import { internalMutation } from "../../_generated/server";
import { listCohortMembers } from "./casualWeeklyLeagueCohort";
import { isWeeklyLeagueBotRevealed } from "./casualWeeklyLeagueBotReveal";
import { resolveWeeklyLeagueXpForMember } from "./casualWeeklyLeagueBotXp";

export const closeExpiredWeeks = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (!CASUAL_WEEKLY_LEAGUE_ENABLED) return { closedCohorts: 0 };

    const now = Date.now();
    const currentWeekKey = weeklyPeriodKey(now);
    const openCohorts = await ctx.db
      .query("casual_weekly_league_cohorts")
      .filter((q) => q.eq(q.field("status"), "open"))
      .collect();

    let closedCohorts = 0;
    for (const cohort of openCohorts) {
      if (cohort.weekKey === currentWeekKey && now <= cohort.endsAt) continue;
      await closeOneCohort(ctx, cohort._id, now);
      closedCohorts += 1;
    }
    return { closedCohorts };
  },
});

async function closeOneCohort(
  ctx: Parameters<typeof closeExpiredWeeks.handler>[0],
  cohortId: Id<"casual_weekly_league_cohorts">,
  now: number
) {
  const cohort = await ctx.db.get(cohortId);
  if (!cohort || cohort.status === "closed") return;

  const members = await ctx.db
    .query("casual_weekly_league_members")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect();

  const rankAt = Math.min(now, cohort.endsAt);

  const rankable = members.filter(
    (m) => !m.isBot || isWeeklyLeagueBotRevealed(m.revealAt, rankAt)
  );

  const sorted = [...rankable]
    .map((m) => ({
      member: m,
      effectiveXp: resolveWeeklyLeagueXpForMember(m, cohort, rankAt),
    }))
    .sort(
      (a, b) =>
        b.effectiveXp - a.effectiveXp || a.member.uid.localeCompare(b.member.uid)
    );

  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i]!.member;
    const effectiveXp = sorted[i]!.effectiveXp;
    const rank = i + 1;
    const tierId = m.leagueTierId as WeeklyLeagueTierId;
    const zone = weeklyLeagueZoneForRank(tierId, rank);
    const baseRewards = weeklyLeagueRewardsForFinalRank(rank);
    let pending = scaleWeeklyLeagueRewards(baseRewards, tierId);
    if (zone === "promote") {
      pending = {
        ...pending,
        seasonVoucher: (pending.seasonVoucher ?? 0) + WEEKLY_LEAGUE_PROMOTION_VOUCHER,
      };
    }

    const hasRewards =
      (pending.coins ?? 0) > 0 ||
      (pending.gems ?? 0) > 0 ||
      (pending.seasonVoucher ?? 0) > 0;

    await ctx.db.patch(m._id, {
      ...(m.isBot ? { weeklyLeagueXp: effectiveXp } : {}),
      finalRank: rank,
      outcome: zone,
      ...(hasRewards ? { pendingRewards: pending } : {}),
      unreadClose: !m.isBot,
      updatedAt: now,
    });

    if (m.isBot) continue;

    const profile = await ctx.db
      .query("casual_weekly_league_profile")
      .withIndex("by_uid", (q) => q.eq("uid", m.uid))
      .unique();
    if (!profile) continue;

    let nextTier = tierId;
    if (zone === "promote") nextTier = nextWeeklyLeagueTier(tierId);
    else if (zone === "demote") nextTier = prevWeeklyLeagueTier(tierId);

    const peak = maxWeeklyLeagueTier(
      profile.peakLeagueTier as WeeklyLeagueTierId,
      nextTier
    );
    const promoteCount =
      (profile.totalWeeklyPromotions ?? 0) + (zone === "promote" ? 1 : 0);

    await ctx.db.patch(profile._id, {
      weeklyLeagueTier: nextTier,
      peakLeagueTier: peak,
      totalWeeklyPromotions: promoteCount,
      updatedAt: now,
    });

    await ctx.runMutation(
      internal.service.achievement.casualAchievementService.checkAndUnlockAchievements,
      {
        uid: m.uid,
        event: {
          kind: "week_close",
          peakLeagueTier: peak,
          weeklyPromoteCount: promoteCount,
        },
      }
    );

    if (zone === "promote") {
      await ctx.runMutation(internal.service.task.casualTaskService.notifyWeeklyLeaguePromote, {
        uid: m.uid,
        weekKey: cohort.weekKey,
      });
    }
  }

  await ctx.db.patch(cohortId, { status: "closed", updatedAt: now });
}

export async function listCohortForQuery(
  ctx: Parameters<typeof closeExpiredWeeks.handler>[0],
  cohortId: Id<"casual_weekly_league_cohorts">
) {
  return listCohortMembers(ctx, cohortId);
}
