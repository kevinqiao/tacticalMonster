import { casualHandler } from "./casualHandler";
import { championshipHandler } from "./championshipHandler";
import { dailyHandler } from "./dailyHandler";
import { multiPlayerTournamentHandler } from "./multiPlayerTournament";
import { rankedHandler } from "./rankedHandler";
import { seasonalHandler } from "./seasonalHandler";
import { specialHandler } from "./specialHandler";
import { tournamentHandler } from "./tournamentHandler";
import { weeklyHandler } from "./weeklyHandler";

/**
 * 锦标赛处理器映射
 * 根据锦标赛类型返回对应的处理器
 */
const HANDLER_MAP: Record<string, any> = {
  // 每日锦标赛
  "daily_solitaire_challenge": dailyHandler,
  "daily_rummy_quick": dailyHandler,
  "daily_uno_express": dailyHandler,
  "daily_ludo_race": dailyHandler,

  // 每周锦标赛
  "weekly_rummy_masters": weeklyHandler,
  "weekly_chess_club": weeklyHandler,
  "weekly_puzzle_league": weeklyHandler,
  "weekly_arcade_showdown": weeklyHandler,

  // 赛季锦标赛
  "seasonal_uno_championship": seasonalHandler,
  "seasonal_ludo_kingdom": seasonalHandler,
  "seasonal_puzzle_empire": seasonalHandler,
  "seasonal_arcade_legends": seasonalHandler,

  // 特殊锦标赛
  "special_holiday_event": specialHandler,
  "special_weekend_warrior": specialHandler,
  "special_festival_frenzy": specialHandler,
  "special_anniversary_celebration": specialHandler,

  // 排位锦标赛
  "ranked_chess_masters": rankedHandler,
  "ranked_puzzle_grandmaster": rankedHandler,
  "ranked_arcade_pro": rankedHandler,
  "ranked_strategy_elite": rankedHandler,

  // 休闲锦标赛
  "casual_ludo_fun": casualHandler,
  "casual_uno_party": casualHandler,
  "casual_puzzle_relax": casualHandler,
  "casual_arcade_chill": casualHandler,

  // 冠军锦标赛
  "championship_puzzle_masters": championshipHandler,
  "championship_chess_grandmaster": championshipHandler,
  "championship_arcade_legend": championshipHandler,
  "championship_strategy_king": championshipHandler,

  // 普通锦标赛
  "tournament_arcade_challenge": tournamentHandler,
  "tournament_puzzle_quest": tournamentHandler,
  "tournament_strategy_battle": tournamentHandler,
  "tournament_skill_showdown": tournamentHandler,

  // 单人锦标赛 - 统一使用multiPlayerTournamentHandler
  "single_player_tournament": multiPlayerTournamentHandler,
  "independent_tournament": multiPlayerTournamentHandler,
  "single_player_threshold_tournament": multiPlayerTournamentHandler,

  // 多人锦标赛
  "multi_player_tournament": multiPlayerTournamentHandler,
  "team_tournament": multiPlayerTournamentHandler,
  "multi_player_single_match_tournament": multiPlayerTournamentHandler,
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
    return tournamentHandler; // 默认使用普通锦标赛处理器
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
  casualHandler,
  championshipHandler, dailyHandler, multiPlayerTournamentHandler, rankedHandler, seasonalHandler, specialHandler, tournamentHandler, weeklyHandler
};

