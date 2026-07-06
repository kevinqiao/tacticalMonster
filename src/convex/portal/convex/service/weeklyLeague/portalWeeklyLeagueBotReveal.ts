import {
  PORTAL_WEEKLY_LEAGUE_BOT_POOL_SIZE,
} from "../../data/portalWeeklyLeagueConfig";
import { pseudoUnit } from "../../shared/pseudoUnit";

export const PORTAL_WEEKLY_LEAGUE_BOT_POST_ANCHOR_REVEAL_MS = 5 * 24 * 3600 * 1000;
export const PORTAL_WEEKLY_LEAGUE_BOT_REVEALED_NOW_MIN = 4;
export const PORTAL_WEEKLY_LEAGUE_BOT_REVEALED_NOW_MAX = 10;

/** 周联赛 Bot 目标积分区间（按段位略调） */
export const PORTAL_WEEKLY_LEAGUE_BOT_POINTS_BAND = {
  min: 40,
  max: 420,
} as const;

export type PortalWeeklyLeagueBotRevealPlan = {
  slot: number;
  revealAt: number;
};

function cohortSeed(cohortKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < cohortKey.length; i++) {
    h ^= cohortKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function planPortalWeeklyLeagueBotRevealSchedule(args: {
  cohortKey: string;
  startsAt: number;
  humanAnchorAt: number;
}): PortalWeeklyLeagueBotRevealPlan[] {
  const { cohortKey, startsAt, humanAnchorAt } = args;
  const seed = cohortSeed(cohortKey);
  const spanEarly = Math.max(0, humanAnchorAt - startsAt);
  const spanLate = PORTAL_WEEKLY_LEAGUE_BOT_POST_ANCHOR_REVEAL_MS;

  const revealedNowCount = Math.min(
    PORTAL_WEEKLY_LEAGUE_BOT_POOL_SIZE,
    PORTAL_WEEKLY_LEAGUE_BOT_REVEALED_NOW_MIN +
      Math.floor(
        pseudoUnit(seed, 11) *
          (PORTAL_WEEKLY_LEAGUE_BOT_REVEALED_NOW_MAX -
            PORTAL_WEEKLY_LEAGUE_BOT_REVEALED_NOW_MIN +
            1)
      )
  );

  const plans: PortalWeeklyLeagueBotRevealPlan[] = [];
  for (let slot = 0; slot < PORTAL_WEEKLY_LEAGUE_BOT_POOL_SIZE; slot++) {
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

export function isPortalWeeklyLeagueBotRevealed(
  revealAt: number | undefined,
  now: number
): boolean {
  if (revealAt == null) return true;
  return Number.isFinite(revealAt) && now >= revealAt;
}
