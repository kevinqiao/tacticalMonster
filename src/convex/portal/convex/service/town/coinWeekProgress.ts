import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import { ZONE_TYPES } from "./zoneEconomyConfig";
import {
  ensureTownProgress,
  type TownProgressCtx,
  type TownProgressRow,
} from "./townProgressStore";
import { logTownEvent } from "./townTelemetry";

const bonusCfg = ZONE_TYPES.commercial.coinTableBonus!;

export const COIN_TABLE_BONUS_MIN_GAMES = bonusCfg.minGamesPerWeek;
export const COIN_TABLE_BONUS_MULTIPLIER = bonusCfg.passiveMultiplier;

export function resolveCoinGamesThisWeek(
  progress: Pick<TownProgressRow, "coinWeekKey" | "coinGamesThisWeek"> | null,
  nowMs = Date.now()
): number {
  const weekKey = weeklyPeriodKey(nowMs);
  if (!progress || progress.coinWeekKey !== weekKey) return 0;
  return progress.coinGamesThisWeek ?? 0;
}

export function coinTableBonusActive(coinGamesThisWeek: number): boolean {
  return coinGamesThisWeek >= COIN_TABLE_BONUS_MIN_GAMES;
}

export function coinTableBonusView(coinGamesThisWeek: number) {
  return {
    minGamesPerWeek: COIN_TABLE_BONUS_MIN_GAMES,
    passiveMultiplier: COIN_TABLE_BONUS_MULTIPLIER,
    gamesThisWeek: coinGamesThisWeek,
    active: coinTableBonusActive(coinGamesThisWeek),
    remaining: Math.max(0, COIN_TABLE_BONUS_MIN_GAMES - coinGamesThisWeek),
  };
}

export async function incrementCoinWeekCount(
  ctx: TownProgressCtx,
  nowMs = Date.now()
): Promise<{ gamesThisWeek: number; bonusActivated: boolean }> {
  const progress = await ensureTownProgress(ctx);
  const weekKey = weeklyPeriodKey(nowMs);
  const prevCount = progress.coinWeekKey === weekKey ? (progress.coinGamesThisWeek ?? 0) : 0;
  const nextCount = prevCount + 1;
  const bonusActivated =
    prevCount < COIN_TABLE_BONUS_MIN_GAMES && nextCount >= COIN_TABLE_BONUS_MIN_GAMES;

  await ctx.db.patch(progress._id, {
    coinWeekKey: weekKey,
    coinGamesThisWeek: nextCount,
    updatedAt: nowMs,
  });

  if (bonusActivated) {
    await logTownEvent(ctx, "coin_table_bonus_active", {
      gamesThisWeek: nextCount,
    });
  }

  return { gamesThisWeek: nextCount, bonusActivated };
}
