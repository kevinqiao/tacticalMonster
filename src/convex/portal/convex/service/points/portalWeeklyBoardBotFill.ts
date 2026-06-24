import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type { PortalWeeklyBoardMode } from "../../data/portalWeeklyBoardBotConfig";
import { weeklyWindowMsShanghai } from "../../utils/casualTaskPeriod";
import {
  ensureBotPersonasSeeded,
  pickBotPersonaId,
} from "../botPersona/portalBotPersonaService";
import { computePortalWeeklyBoardBotWeekEndPoints } from "./portalWeeklyBoardBotPoints";
import { planPortalWeeklyBoardBotRevealSchedule } from "./portalWeeklyBoardBotReveal";

export async function getPortalWeeklyBoardCohort(
  ctx: QueryCtx | MutationCtx,
  args: { gameType: string; mode: PortalWeeklyBoardMode; weekKey: string }
) {
  return await ctx.db
    .query("portal_weekly_board_cohorts")
    .withIndex("by_game_mode_week", (q) =>
      q.eq("gameType", args.gameType).eq("mode", args.mode).eq("weekKey", args.weekKey)
    )
    .unique();
}

/**
 * 首真人本周首次得分时 seed cohort + bot 池（幂等）。
 */
export async function ensurePortalWeeklyBoardBots(
  ctx: MutationCtx,
  args: {
    gameType: string;
    mode: PortalWeeklyBoardMode;
    weekKey: string;
    now?: number;
  }
): Promise<{ seeded: boolean; cohortId: Id<"portal_weekly_board_cohorts"> | null }> {
  const now = args.now ?? Date.now();
  await ensureBotPersonasSeeded(ctx, now);

  const existing = await getPortalWeeklyBoardCohort(ctx, args);
  if (existing) {
    return { seeded: false, cohortId: existing._id };
  }

  const humanRows = await ctx.db
    .query("portal_weekly_points")
    .withIndex("by_game_mode_week_points", (q) =>
      q.eq("gameType", args.gameType).eq("mode", args.mode).eq("weekKey", args.weekKey)
    )
    .collect();
  if (humanRows.length === 0) {
    return { seeded: false, cohortId: null };
  }

  const window = weeklyWindowMsShanghai(now);
  const humanAnchorAt =
    args.humanAnchorAt ?? Math.min(...humanRows.map((r) => r.updatedAt));
  const cohortKey = `${args.gameType}|${args.mode}|${args.weekKey}`;

  const cohortId = await ctx.db.insert("portal_weekly_board_cohorts", {
    gameType: args.gameType,
    mode: args.mode,
    weekKey: args.weekKey,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    humanAnchorAt,
    status: "open",
    createdAt: now,
    updatedAt: now,
  });

  const schedule = planPortalWeeklyBoardBotRevealSchedule({
    cohortKey: `${cohortKey}|${cohortId}`,
    startsAt: window.startsAt,
    humanAnchorAt,
  });

  for (const plan of schedule) {
    const weekEndPoints = computePortalWeeklyBoardBotWeekEndPoints({
      mode: args.mode,
      cohortKey: `${cohortKey}|${cohortId}`,
      slot: plan.slot,
    });
    await ctx.db.insert("portal_weekly_board_bot_members", {
      cohortId,
      slot: plan.slot,
      botPersonaId: pickBotPersonaId(cohortKey, plan.slot),
      revealAt: plan.revealAt,
      weekEndPoints,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { seeded: true, cohortId };
}

export async function listPortalWeeklyBoardBotMembers(
  ctx: QueryCtx,
  cohortId: Id<"portal_weekly_board_cohorts">
) {
  return await ctx.db
    .query("portal_weekly_board_bot_members")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect();
}
