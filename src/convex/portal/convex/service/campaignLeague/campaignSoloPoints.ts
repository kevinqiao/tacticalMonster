import { PORTAL_SOLO_POINTS } from "../../data/portalTournamentConfigs";

/** Solo pass/fail points for campaign league (single source: PORTAL_SOLO_POINTS). */
export const CAMPAIGN_LEAGUE_SOLO_POINTS = PORTAL_SOLO_POINTS;

export function campaignSoloPointsDelta(isPassed: boolean | undefined): number {
  return isPassed === true
    ? CAMPAIGN_LEAGUE_SOLO_POINTS.success
    : CAMPAIGN_LEAGUE_SOLO_POINTS.fail;
}
