import type { PortalTournamentDefinition } from "./portalTournamentConfigs";

export type PortalSeedTier = "easy" | "medium" | "hard";

export function resolveSeedTierForTemplate(def: PortalTournamentDefinition): PortalSeedTier {
  if (def.matchType === "multi_ranked") return "medium";
  return "easy";
}

