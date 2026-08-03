import {
  CAMPAIGN_LEAGUE_BOT_POOL_SIZE,
  CAMPAIGN_LEAGUE_BOT_POST_ANCHOR_REVEAL_MS,
  CAMPAIGN_LEAGUE_BOT_REVEALED_NOW_MAX,
  CAMPAIGN_LEAGUE_BOT_REVEALED_NOW_MIN,
} from "./campaignLeagueConfig";
import { pseudoUnit } from "../../shared/pseudoUnit";

export type CampaignLeagueBotRevealPlan = {
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

export function planCampaignLeagueBotRevealSchedule(args: {
  cohortKey: string;
  startsAt: number;
  humanAnchorAt: number;
}): CampaignLeagueBotRevealPlan[] {
  const { cohortKey, startsAt, humanAnchorAt } = args;
  const seed = cohortSeed(cohortKey);
  const spanEarly = Math.max(0, humanAnchorAt - startsAt);
  const spanLate = CAMPAIGN_LEAGUE_BOT_POST_ANCHOR_REVEAL_MS;

  const revealedNowCount = Math.min(
    CAMPAIGN_LEAGUE_BOT_POOL_SIZE,
    CAMPAIGN_LEAGUE_BOT_REVEALED_NOW_MIN +
      Math.floor(
        pseudoUnit(seed, 11) *
          (CAMPAIGN_LEAGUE_BOT_REVEALED_NOW_MAX - CAMPAIGN_LEAGUE_BOT_REVEALED_NOW_MIN + 1)
      )
  );

  const plans: CampaignLeagueBotRevealPlan[] = [];
  for (let slot = 0; slot < CAMPAIGN_LEAGUE_BOT_POOL_SIZE; slot++) {
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
        spanLate <= 0 ? humanAnchorAt : Math.floor(humanAnchorAt + u * spanLate);
      revealAt = Math.max(revealAt, humanAnchorAt + 1);
    }
    plans.push({ slot, revealAt });
  }

  return plans;
}

export function isCampaignLeagueBotRevealed(
  revealAt: number | undefined,
  now: number
): boolean {
  if (revealAt == null) return true;
  return Number.isFinite(revealAt) && now >= revealAt;
}
