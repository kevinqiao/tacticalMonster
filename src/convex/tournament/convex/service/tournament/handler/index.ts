import { TournamentHandler } from "./base";
import { dailySpecialHandler } from "./dailySpecial";
import { independentTournamentHandler } from "./independentTournament";
import { multiPlayerTournamentHandler } from "./multiPlayerTournament";
import { singlePlayerTournamentHandler } from "./singlePlayerTournament";

const handlers: Record<string, TournamentHandler> = {
  daily_special: dailySpecialHandler,
  multi_player_tournament: multiPlayerTournamentHandler,
  single_player_tournament: singlePlayerTournamentHandler,
  independent_tournament: independentTournamentHandler,
};

export function getHandler(tournamentType: string): TournamentHandler {
  const handler = handlers[tournamentType];
  if (!handler) throw new Error(`未知锦标赛类型: ${tournamentType}`);
  return handler;
}