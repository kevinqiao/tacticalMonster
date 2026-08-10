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
  /**
   * Solo ladder progress for A/B/C: count of settled runs that are not explicit fails.
   * `challengeSuccess === false` does not advance (repeat A/B until clear).
   * Legacy rows with missing `challengeSuccess` still count.
   */
  settledSoloCount: number;
  soloFailStreak: number;
  daysSinceLastMatch: number;
};

function soloTemplateIdForGame(gameType: string): string {
  return `portal_solo_p75_${gameType}`;
}

/** A/B ladder: only non-fail settled solos advance the segment. */
export function countSoloLadderProgress(
  rows: ReadonlyArray<{ status: string; challengeSuccess?: boolean }>
): number {
  return rows.filter(
    (r) => r.status === "settled" && r.challengeSuccess !== false
  ).length;
}

/** Multi ritual open until first Solo clear (ladder progress > 0). */
export function isPortalMultiRitualOpen(ladderProgress: number): boolean {
  return ladderProgress <= 0;
}

/**
 * While multi ritual is open, rewrite multi_ranked joins to the same-game Solo template.
 * Campaign joins should pass `skip: true`.
 */
export function resolveMultiRitualJoinTemplate(args: {
  requestedTemplateId: string;
  matchType: string;
  gameType: string;
  ladderProgress: number;
  skip?: boolean;
}): { templateId: string; ritualForcedSolo: boolean } {
  if (args.skip) {
    return { templateId: args.requestedTemplateId, ritualForcedSolo: false };
  }
  if (args.matchType !== "multi_ranked") {
    return { templateId: args.requestedTemplateId, ritualForcedSolo: false };
  }
  if (!isPortalMultiRitualOpen(args.ladderProgress)) {
    return { templateId: args.requestedTemplateId, ritualForcedSolo: false };
  }
  const soloTemplateId = soloTemplateIdForGame(args.gameType);
  return { templateId: soloTemplateId, ritualForcedSolo: true };
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
    settledSoloCount: countSoloLadderProgress(settledSolo),
    soloFailStreak,
    daysSinceLastMatch,
  };
}
