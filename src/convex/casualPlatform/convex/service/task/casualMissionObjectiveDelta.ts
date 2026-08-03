import type { CasualMissionTemplate } from "../../data/casualMissionTemplates";

const ASYNC_MATCH_TYPES = new Set(["tournament_a", "tournament_b", "tournament_c"]);
const PVP_MATCH_TYPES = new Set(["pvp", "tournament_pvp"]);

/** 单局结算对任务进度的 +Δ（纯函数；`notifyScoreSubmitted` 与单测共用）。 */
export function deltaForMissionObjective(
  template: CasualMissionTemplate,
  args: {
    matchType: string;
    platformGameType: string;
    primaryGameType: string;
    spotlightGameType: string;
    multiplayerFinalRank?: number;
  }
): number {
  const isAsync = ASYNC_MATCH_TYPES.has(args.matchType);
  const isSpotlight = args.matchType === "season_challenge";
  const isPvp = PVP_MATCH_TYPES.has(args.matchType);

  switch (template.objectiveKind) {
    case "submit_any_score":
      return 1;
    case "submit_async_score":
      return isAsync ? 1 : 0;
    case "submit_spotlight_score":
      return isSpotlight ? 1 : 0;
    case "weekly_league_promote":
      return 0;
    case "submit_pvp_settled":
      return isPvp ? 1 : 0;
    case "submit_pvp_win":
      return isPvp && args.multiplayerFinalRank === 1 ? 1 : 0;
    case "submit_non_primary_score":
    case "submit_spotlight_game_score":
    case "submit_spotlight_game_top3":
    case "submit_distinct_games":
      return 0;
    default:
      return 0;
  }
}
