import { createGameState, scoreFinishedGame, ChessGameState } from "../chessArena/convex/service/createGame";
import { catalogAlbum, grantRankRoadRoster, OwnedHero } from "../chessArena/convex/service/teamService";
import { CHESS_HERO_CATALOG } from "../chessArena/convex/data/heroCatalog";
import {
  buyTickets,
  catalog,
  claimPass,
  createRpgStore,
  DEFAULT_SCOPE,
  hudSnapshot,
  joinRpg,
  leagueBoard,
  previewTable,
  RpgEngineStore,
  settleRpg,
  weekKeyAt,
} from "../portal/convex/service/rpg/engine";

export type ArenaMemory = {
  owned: Map<string, OwnedHero[]>;
  dust: Map<string, number>;
  games: Map<string, ChessGameState>;
};

export function createArenaMemory(): ArenaMemory {
  return { owned: new Map(), dust: new Map(), games: new Map() };
}

export function ensureChessPlayer(arena: ArenaMemory, uid: string) {
  const owned = grantRankRoadRoster(uid, arena.owned.get(uid) ?? []);
  arena.owned.set(uid, owned);
  if (!arena.dust.has(uid)) arena.dust.set(uid, 0);
  return owned;
}

export function playJoinSettle(opts: {
  store: RpgEngineStore;
  arena: ArenaMemory;
  uid: string;
  tableId: string;
  loadout: string[];
  gameId?: string;
}) {
  ensureChessPlayer(opts.arena, opts.uid);
  const joined = joinRpg(opts.store, {
    uid: opts.uid,
    tableId: opts.tableId,
    loadout: opts.loadout,
    gameId: opts.gameId,
  });
  if (!joined.ok || !joined.run) return { ok: false as const, reason: joined.reason };
  const game = createGameState({
    gameId: joined.run.gameId,
    seed: joined.run.seedId,
    loadout: joined.run.loadout,
    uid: opts.uid,
    matchId: joined.run.matchId,
  });
  opts.arena.games.set(game.gameId, game);
  const score = scoreFinishedGame(game);
  game.score = score;
  game.status = 3;
  const settled = settleRpg(opts.store, { gameId: game.gameId, score, success: true });
  if (settled.dust) {
    opts.arena.dust.set(opts.uid, (opts.arena.dust.get(opts.uid) ?? 0) + settled.dust);
  }
  return { ok: true as const, joined, game, score, settled };
}

export {
  buyTickets,
  catalog,
  catalogAlbum,
  CHESS_HERO_CATALOG,
  claimPass,
  createRpgStore,
  DEFAULT_SCOPE,
  hudSnapshot,
  joinRpg,
  leagueBoard,
  previewTable,
  settleRpg,
  weekKeyAt,
};
