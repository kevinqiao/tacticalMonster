/** Campaign competitive leaderboard bot cohort config (ported from merchantCampaign board). */

export type CampaignLeagueMode = "solo" | "multi";

export const CAMPAIGN_LEAGUE_BOT_POOL_SIZE = 15;

export const CAMPAIGN_LEAGUE_BOT_REVEALED_NOW_MIN = 5;
export const CAMPAIGN_LEAGUE_BOT_REVEALED_NOW_MAX = 10;

/** After first human write, remaining bots reveal within this window (ms). */
export const CAMPAIGN_LEAGUE_BOT_POST_ANCHOR_REVEAL_MS = 6 * 3600 * 1000;

export const CAMPAIGN_LEAGUE_BOT_VALUE_BAND: Record<
  CampaignLeagueMode,
  { min: number; max: number }
> = {
  // Solo accumulates +3/-1 per run (aligned with PORTAL_SOLO_POINTS).
  solo: { min: 6, max: 150 },
  multi: { min: 8, max: 120 },
};

export const CAMPAIGN_LEAGUE_BOT_HUMAN_ANCHOR_FLOOR: Record<CampaignLeagueMode, number> = {
  solo: 4,
  multi: 6,
};

export const CAMPAIGN_LEAGUE_BOT_RAMP_FLOOR = 0.28;
export const CAMPAIGN_LEAGUE_BOT_RAMP_POWER = 0.55;

export const CAMPAIGN_LEAGUE_BOT_AVG_VALUE_PER_PLAY: Record<CampaignLeagueMode, number> = {
  solo: 1.0,
  multi: 2.2,
};

export const CAMPAIGN_LEAGUE_BOT_DAILY_PLAYS_BASE = 10;
export const CAMPAIGN_LEAGUE_BOT_DAILY_PLAYS_MIN = 6;
export const CAMPAIGN_LEAGUE_BOT_DAILY_PLAYS_MAX = 14;

export const CAMPAIGN_LEAGUE_BOT_SESSION_HOURS = 5;
export const CAMPAIGN_LEAGUE_BOT_SESSION_MS =
  CAMPAIGN_LEAGUE_BOT_SESSION_HOURS * 3600 * 1000;

export const CAMPAIGN_LEAGUE_BOT_PLAY_DAY_MS = 24 * 3600 * 1000;

export const CAMPAIGN_LEAGUE_BOT_MULTI_START_MIN = 1;
export const CAMPAIGN_LEAGUE_BOT_MULTI_START_MAX = 15;
