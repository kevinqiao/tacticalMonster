
import { baseHandler } from "./base";
import { multiPlayerIndependentMatchHandler } from "./multiPlayerIndependentMatchHandler";
import { multiPlayerSharedMatchHandler } from "./multiPlayerSharedMatchHandler";
import { singlePlayerIndependentTournamentHandler } from "./singlePlayerIndependentTournamentHandler";

/**
 * 锦标赛处理器映射
 * 根据锦标赛类型返回对应的处理器
 */
const HANDLER_MAP: Record<string, any> = {
  // Best of Series 锦标赛

  // 独立锦标赛 - 统一使用independentTournamentHandler
  "single_player_tournament": singlePlayerIndependentTournamentHandler,
  "independent_tournament": singlePlayerIndependentTournamentHandler,
  "single_player_threshold_tournament": singlePlayerIndependentTournamentHandler,

  // 多人锦标赛 - 统一使用unifiedMultiPlayerHandler
  "multi_player_tournament": multiPlayerSharedMatchHandler,
  "team_tournament": multiPlayerSharedMatchHandler,
  "multi_player_single_match_tournament": multiPlayerSharedMatchHandler,

  // 多人独立游戏锦标赛 - 每个玩家玩独立游戏
  "multi_player_independent_games_tournament": multiPlayerIndependentMatchHandler,

  // 多人独立比赛锦标赛 - 每人独立比赛
  "shared_tournament_independent_matches": multiPlayerIndependentMatchHandler,
};

/**
 * 获取锦标赛处理器
 * @param tournamentType 锦标赛类型
 * @returns 对应的处理器
 */
export function getHandler(tournamentType: string): any {
  const handler = HANDLER_MAP[tournamentType];
  if (!handler) {
    console.warn(`未找到锦标赛类型 ${tournamentType} 的处理器，使用默认处理器`);
    return baseHandler
    // return singlePlayerIndependentTournamentHandler; // 默认使用独立锦标赛处理器
  }
  return handler;
}

/**
 * 获取所有支持的锦标赛类型
 * @returns 锦标赛类型列表
 */
export function getSupportedTournamentTypes(): string[] {
  return Object.keys(HANDLER_MAP);
}

/**
 * 检查锦标赛类型是否支持
 * @param tournamentType 锦标赛类型
 * @returns 是否支持
 */
export function isTournamentTypeSupported(tournamentType: string): boolean {
  return tournamentType in HANDLER_MAP;
}

/**
 * 获取处理器分类
 * @returns 处理器分类映射
 */
export function getHandlerCategories(): Record<string, string[]> {
  return {
    daily: [
      "daily_solitaire_challenge",
      "daily_rummy_quick",
      "daily_uno_express",
      "daily_ludo_race"
    ],
    weekly: [
      "weekly_rummy_masters",
      "weekly_chess_club",
      "weekly_puzzle_league",
      "weekly_arcade_showdown"
    ],
    seasonal: [
      "seasonal_uno_championship",
      "seasonal_ludo_kingdom",
      "seasonal_puzzle_empire",
      "seasonal_arcade_legends"
    ],
    special: [
      "special_holiday_event",
      "special_weekend_warrior",
      "special_festival_frenzy",
      "special_anniversary_celebration"
    ],
    ranked: [
      "ranked_chess_masters",
      "ranked_puzzle_grandmaster",
      "ranked_arcade_pro",
      "ranked_strategy_elite"
    ],
    casual: [
      "casual_ludo_fun",
      "casual_uno_party",
      "casual_puzzle_relax",
      "casual_arcade_chill"
    ],
    championship: [
      "championship_puzzle_masters",
      "championship_chess_grandmaster",
      "championship_arcade_legend",
      "championship_strategy_king"
    ],
    tournament: [
      "tournament_arcade_challenge",
      "tournament_puzzle_quest",
      "tournament_strategy_battle",
      "tournament_skill_showdown"
    ],
    single: [
      "single_player_tournament",
      "independent_tournament"
    ],
    multi: [
      "multi_player_tournament",
      "team_tournament"
    ]
  };
}

// 导出所有处理器
export {
  multiPlayerIndependentMatchHandler,
  multiPlayerSharedMatchHandler, singlePlayerIndependentTournamentHandler
};

