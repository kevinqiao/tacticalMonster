/**
 * Player signals for L3 season seed pick (league / Solo career / fail streak / return).
 */
import {
  DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
  type PortalWeeklyLeagueTierId,
} from "../../data/portalWeeklyLeagueConfig";
import type { QueryCtx, MutationCtx } from "../../_generated/server";
import { readWeeklyLeagueTier } from "../weeklyLeague/casualWeeklyLeagueProfile";
import { isCasualAsyncVirtualOpponentUid } from "../tournament/settle/casualRunSettlementFill";

export type SeasonSeedPickSignals = {
  weeklyLeagueTier: PortalWeeklyLeagueTierId;
  settledSoloCount: number;
  soloFailStreak: number;
  daysSinceLastMatch: number;
};

function soloTemplateIdForGame(gameType: string): string {
  return `portal_solo_p75_${gameType}`;
}

export async function loadSeasonSeedPickSignals(
  ctx: QueryCtx | MutationCtx,
  args: { uid: string; gameType: string }
): Promise<SeasonSeedPickSignals> {
  const uid = args.uid.trim();
  if (!uid) {
    return {
      weeklyLeagueTier: DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
      settledSoloCount: 99,
      soloFailStreak: 0,
      daysSinceLastMatch: 0,
    };
  }

  const weeklyLeagueTier = await readWeeklyLeagueTier(ctx, uid, args.gameType);
  const soloTemplateId = soloTemplateIdForGame(args.gameType);

  const soloRows = await ctx.db
    .query("portal_run_player_matches")
    .withIndex("by_uid_template", (q) => q.eq("uid", uid).eq("templateId", soloTemplateId))
    .collect();

  const settledSolo = soloRows
    .filter((r) => r.status === "settled" && !isCasualAsyncVirtualOpponentUid(r.uid))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  let soloFailStreak = 0;
  for (const row of settledSolo) {
    if (row.challengeSuccess === false) soloFailStreak++;
    else break;
  }

  const anySettled = await ctx.db
    .query("portal_run_player_matches")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .collect();
  const humanSettled = anySettled
    .filter((r) => r.status === "settled" && !isCasualAsyncVirtualOpponentUid(r.uid))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const last = humanSettled[0];
  const daysSinceLastMatch = last
    ? Math.floor((Date.now() - last.updatedAt) / (24 * 60 * 60 * 1000))
    : 999;

  return {
    weeklyLeagueTier,
    settledSoloCount: settledSolo.length,
    soloFailStreak,
    daysSinceLastMatch,
  };
}
