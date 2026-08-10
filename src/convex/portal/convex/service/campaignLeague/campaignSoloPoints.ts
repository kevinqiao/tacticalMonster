import {
  PORTAL_SOLO_POINTS,
  portalSoloSuccessTotal,
} from "../../data/portalTournamentConfigs";

/** Solo pass/fail points for campaign league (single target). */
export const CAMPAIGN_LEAGUE_SOLO_POINTS = PORTAL_SOLO_POINTS;

export function campaignSoloPointsDelta(isPassed: boolean | undefined): number {
  return isPassed === true
    ? portalSoloSuccessTotal(CAMPAIGN_LEAGUE_SOLO_POINTS)
    : CAMPAIGN_LEAGUE_SOLO_POINTS.fail;
}
