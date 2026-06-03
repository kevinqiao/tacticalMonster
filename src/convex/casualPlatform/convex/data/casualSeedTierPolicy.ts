import type { CasualTournamentDefinition } from "./casualTournamentConfigs";

export type CasualSeedTier = "easy" | "medium" | "hard";

/** 按模板 matchType 映射 solitaire seed pool tier。 */
export function resolveSeedTierForTemplate(def: CasualTournamentDefinition): CasualSeedTier {
  switch (def.matchType) {
    case "tournament_b":
      return "medium";
    case "tournament_c":
      return "hard";
    case "tournament_a":
    case "season_challenge":
    default:
      return "easy";
  }
}
