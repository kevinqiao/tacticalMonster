import type { PortalTournamentDefinition } from "./portalTournamentConfigs";

export type PortalSeedTier = "easy" | "medium" | "hard";

/**
 * Preferred seed tier for open-table pick, or `null` = no preference (whole pool).
 * - solo_p75: easy
 * - multi_ranked: no preferred tier (pick across easy/medium/hard)
 */
export function resolveSeedTierForTemplate(
  def: PortalTournamentDefinition
): PortalSeedTier | null {
  if (def.matchType === "multi_ranked") return null;
  return "easy";
}

