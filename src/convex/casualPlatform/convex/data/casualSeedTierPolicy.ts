import type { CasualTournamentDefinition } from "./casualTournamentConfigs";

export type CasualSeedTier = "easy" | "medium" | "hard";

/** 按模板 matchType 映射 seed pool tier（含三场合战 A/B/C）。 */
export function resolveSeedTierForTemplate(def: CasualTournamentDefinition): CasualSeedTier {
  switch (def.matchType) {
    case "tournament_b":
    case "triathlon_b":
      return "medium";
    case "tournament_c":
    case "triathlon_c":
      return "hard";
    case "tournament_a":
    case "triathlon_a":
    case "season_challenge":
    default:
      return "easy";
  }
}
