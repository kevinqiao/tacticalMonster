/**
 * 周联赛 bot reveal 计划：首真人入组时固定 15 bot，分阶段露面。
 */
import {
  WEEKLY_LEAGUE_MAX_HUMANS_PER_COHORT,
  WEEKLY_LEAGUE_BOT_POOL_SIZE,
  WEEKLY_LEAGUE_BOT_POST_ANCHOR_REVEAL_MS,
  WEEKLY_LEAGUE_BOT_REVEALED_NOW_MAX,
  WEEKLY_LEAGUE_BOT_REVEALED_NOW_MIN,
} from "../../data/casualWeeklyLeagueConfig";
import { pseudoUnit } from "../../shared/pseudoUnit";

export type WeeklyLeagueBotRevealPlan = {
  slot: number;
  revealAt: number;
};

function cohortSeed(cohortId: string): number {
  let h = 2166136261;
  for (let i = 0; i < cohortId.length; i++) {
    h ^= cohortId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 确定性计划 15 个 bot 的 revealAt。 */
export function planWeeklyLeagueBotRevealSchedule(args: {
  cohortId: string;
  startsAt: number;
  humanAnchorAt: number;
}): WeeklyLeagueBotRevealPlan[] {
  const { cohortId, startsAt, humanAnchorAt } = args;
  const seed = cohortSeed(cohortId);
  const spanEarly = Math.max(0, humanAnchorAt - startsAt);
  const spanLate = WEEKLY_LEAGUE_BOT_POST_ANCHOR_REVEAL_MS;

  const revealedNowCount = Math.min(
    WEEKLY_LEAGUE_BOT_POOL_SIZE,
    WEEKLY_LEAGUE_BOT_REVEALED_NOW_MIN +
      Math.floor(
        pseudoUnit(seed, 11) *
          (WEEKLY_LEAGUE_BOT_REVEALED_NOW_MAX - WEEKLY_LEAGUE_BOT_REVEALED_NOW_MIN + 1)
      )
  );

  const plans: WeeklyLeagueBotRevealPlan[] = [];
  for (let slot = 0; slot < WEEKLY_LEAGUE_BOT_POOL_SIZE; slot++) {
    const u = pseudoUnit(seed, slot + 17);
    let revealAt: number;
    if (slot < revealedNowCount) {
      revealAt =
        spanEarly <= 0
          ? humanAnchorAt
          : Math.floor(startsAt + pseudoUnit(seed, slot + 31) * spanEarly);
      revealAt = Math.min(revealAt, humanAnchorAt);
    } else {
      revealAt =
        spanLate <= 0
          ? humanAnchorAt
          : Math.floor(humanAnchorAt + u * spanLate);
      revealAt = Math.max(revealAt, humanAnchorAt + 1);
    }
    plans.push({ slot, revealAt });
  }

  return plans;
}

export function isWeeklyLeagueBotRevealed(
  revealAt: number | undefined,
  now: number
): boolean {
  if (revealAt == null) return true;
  return Number.isFinite(revealAt) && now >= revealAt;
}

/** 未 reveal bot + 预留给后续真人的虚席。 */
export function weeklyLeagueMatchingSlotCounts(args: {
  humanCount: number;
  botRows: Array<{ revealAt?: number }>;
  now: number;
}): { matchingBots: number; matchingHumans: number; total: number } {
  const matchingBots = args.botRows.filter(
    (b) => !isWeeklyLeagueBotRevealed(b.revealAt, args.now)
  ).length;
  const matchingHumans = Math.max(0, WEEKLY_LEAGUE_MAX_HUMANS_PER_COHORT - args.humanCount);
  return {
    matchingBots,
    matchingHumans,
    total: matchingBots + matchingHumans,
  };
}
