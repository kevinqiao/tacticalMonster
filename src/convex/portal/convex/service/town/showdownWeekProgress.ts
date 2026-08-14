import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import { ZONE_TYPES } from "./zoneEconomyConfig";
import { ensureTownProgress, townProgressCtxFromId, type TownProgressCtx, type TownProgressRow } from "./townProgressStore";
import { logTownEvent } from "./townTelemetry";

const bonusCfg = ZONE_TYPES.entertainment.showdownBonus!;

export const SHOWDOWN_BONUS_MIN_GAMES = bonusCfg.minGamesPerWeek;
export const SHOWDOWN_BONUS_MULTIPLIER = bonusCfg.passiveMultiplier;

/** Read-only count for queries — resets when weekKey mismatches stored key. */
export function resolveShowdownGamesThisWeek(
  progress: Pick<TownProgressRow, "showdownWeekKey" | "showdownGamesThisWeek"> | null,
  nowMs = Date.now()
): number {
  const weekKey = weeklyPeriodKey(nowMs);
  if (!progress || progress.showdownWeekKey !== weekKey) return 0;
  return progress.showdownGamesThisWeek ?? 0;
}

export function entertainmentBonusActive(showdownGamesThisWeek: number): boolean {
  return showdownGamesThisWeek >= SHOWDOWN_BONUS_MIN_GAMES;
}

export function entertainmentBonusView(showdownGamesThisWeek: number) {
  return {
    minGamesPerWeek: SHOWDOWN_BONUS_MIN_GAMES,
    passiveMultiplier: SHOWDOWN_BONUS_MULTIPLIER,
    gamesThisWeek: showdownGamesThisWeek,
    active: entertainmentBonusActive(showdownGamesThisWeek),
    remaining: Math.max(0, SHOWDOWN_BONUS_MIN_GAMES - showdownGamesThisWeek),
  };
}

export async function incrementShowdownWeekCount(
  ctx: TownProgressCtx,
  nowMs = Date.now()
): Promise<{ gamesThisWeek: number; bonusActivated: boolean }> {
  const progress = await ensureTownProgress(ctx);
  const weekKey = weeklyPeriodKey(nowMs);
  const prevCount =
    progress.showdownWeekKey === weekKey ? (progress.showdownGamesThisWeek ?? 0) : 0;
  const nextCount = prevCount + 1;
  const bonusActivated =
    prevCount < SHOWDOWN_BONUS_MIN_GAMES && nextCount >= SHOWDOWN_BONUS_MIN_GAMES;

  await ctx.db.patch(progress._id, {
    showdownWeekKey: weekKey,
    showdownGamesThisWeek: nextCount,
    updatedAt: nowMs,
  });

  if (bonusActivated) {
    await logTownEvent(ctx, "entertainment_bonus_active", {
      gamesThisWeek: nextCount,
    });
  }

  return { gamesThisWeek: nextCount, bonusActivated };
}

/** Called from run settlement when a Portal match completes. */
export const applyShowdownWeekCountOnRunSettled = internalMutation({
  args: {
    uid: v.string(),
    matchType: v.string(),
    townId: v.optional(v.string()),
  },
  handler: async (ctx, { uid, matchType, townId }) => {
    if (matchType !== "multi_ranked" || !townId) {
      return { ok: true as const, gamesThisWeek: 0, bonusActivated: false };
    }
    const result = await incrementShowdownWeekCount(townProgressCtxFromId(ctx.db, uid, townId));
    return { ok: true as const, ...result };
  },
});
