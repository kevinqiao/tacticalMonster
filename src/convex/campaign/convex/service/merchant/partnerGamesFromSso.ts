/**
 * @deprecated Per-partner games allowlist removed.
 * Campaign gameType is validated against the static PARTNER_GAME_TYPES catalog.
 */

import {
  PARTNER_GAME_TYPES,
  type PartnerCampaignGameType,
} from "./campaignRuleValidation";

export async function fetchPartnerGamesFromSso(_partnerId: number): Promise<string[]> {
  return [...PARTNER_GAME_TYPES];
}

/** @deprecated No per-partner gate — catalog membership is checked in assertCampaignConfig. */
export async function assertGameTypeEnabledForPartner(
  _partnerId: number,
  gameType: string
): Promise<void> {
  if (!PARTNER_GAME_TYPES.includes(gameType as PartnerCampaignGameType)) {
    throw new Error("portal_game_invalid");
  }
}
