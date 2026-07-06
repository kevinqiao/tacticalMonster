/**

 * Portal 周尾结算：组内排名 → 升降段位 → pendingRewards。

 */

import {

  PORTAL_WEEKLY_LEAGUE_ENABLED,

  maxPortalWeeklyLeagueTier,

  nextPortalWeeklyLeagueTier,

  portalWeeklyLeagueRewardsForFinalRank,

  portalWeeklyLeagueZoneForRank,

  prevPortalWeeklyLeagueTier,

  type PortalWeeklyLeagueTierId,

} from "../../data/portalWeeklyLeagueConfig";

import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";

import type { Id } from "../../_generated/dataModel";

import { internalMutation, type MutationCtx } from "../../_generated/server";

import { resolvePortalWeeklyLeagueBotPoints } from "./portalWeeklyLeagueBotPoints";

import { isPortalWeeklyLeagueBotRevealed } from "./portalWeeklyLeagueBotReveal";



export const closeExpiredPortalWeeklyLeagueWeeks = internalMutation({

  args: {},

  handler: async (ctx) => {

    if (!PORTAL_WEEKLY_LEAGUE_ENABLED) return { closedCohorts: 0 };



    const now = Date.now();

    const currentWeekKey = weeklyPeriodKey(now);

    const openCohorts = await ctx.db

      .query("portal_weekly_league_cohorts")

      .filter((q) => q.eq(q.field("status"), "open"))

      .collect();



    let closedCohorts = 0;

    for (const cohort of openCohorts) {

      if (cohort.weekKey === currentWeekKey && now <= cohort.endsAt) continue;

      await closeOnePortalCohort(ctx, cohort._id, now);

      closedCohorts += 1;

    }

    return { closedCohorts };

  },

});



async function closeOnePortalCohort(

  ctx: MutationCtx,

  cohortId: Id<"portal_weekly_league_cohorts">,

  now: number

) {

  const cohort = await ctx.db.get(cohortId);

  if (!cohort || cohort.status === "closed") return;



  const memberDocs = await ctx.db

    .query("portal_weekly_league_members")

    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))

    .collect();



  const rankAt = Math.min(now, cohort.endsAt);

  const rankable = memberDocs.filter(

    (m) => !m.isBot || isPortalWeeklyLeagueBotRevealed(m.revealAt, rankAt)

  );



  const sorted = rankable

    .map((member) => ({

      member,

      effectivePoints: member.isBot

        ? resolvePortalWeeklyLeagueBotPoints(

            {

              revealAt: member.revealAt,

              botWeekEndPoints: member.botWeekEndPoints,

              weeklyPoints: member.weeklyPoints,

            },

            cohort,

            rankAt

          )

        : member.weeklyPoints,

    }))

    .sort(

      (a, b) =>

        b.effectivePoints - a.effectivePoints ||

        a.member.uid.localeCompare(b.member.uid)

    );



  for (let i = 0; i < sorted.length; i++) {

    const { member, effectivePoints } = sorted[i]!;

    const rank = i + 1;



    if (member.isBot) {

      await ctx.db.patch(member._id, {

        finalRank: rank,

        weeklyPoints: effectivePoints,

        updatedAt: now,

      });

      continue;

    }



    const tierId = member.leagueTierId as PortalWeeklyLeagueTierId;

    const zone = portalWeeklyLeagueZoneForRank(tierId, rank);

    const pending = portalWeeklyLeagueRewardsForFinalRank(tierId, rank);

    const hasRewards = (pending?.coins ?? 0) > 0;



    await ctx.db.patch(member._id, {

      finalRank: rank,

      outcome: zone,

      ...(hasRewards && pending ? { pendingRewards: pending } : {}),

      unreadClose: true,

      updatedAt: now,

    });



    const profile = await ctx.db

      .query("portal_weekly_league_profile")

      .withIndex("by_uid_game", (q) =>

        q.eq("uid", member.uid).eq("gameType", member.gameType)

      )

      .unique();

    if (!profile) continue;



    let nextTier = tierId;

    if (zone === "promote") nextTier = nextPortalWeeklyLeagueTier(tierId);

    else if (zone === "demote") nextTier = prevPortalWeeklyLeagueTier(tierId);



    const peak = maxPortalWeeklyLeagueTier(

      profile.peakLeagueTier as PortalWeeklyLeagueTierId,

      nextTier

    );



    await ctx.db.patch(profile._id, {

      weeklyLeagueTier: nextTier,

      peakLeagueTier: peak,

      updatedAt: now,

    });

  }



  await ctx.db.patch(cohortId, { status: "closed", updatedAt: now });

}


