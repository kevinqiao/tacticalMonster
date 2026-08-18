import { RPG_SHELL_TABS, RpgGameType, RpgHallKind } from "convex/rpg/architecture";
import { createGameState, defaultRankRoadLoadout, scoreFinishedGame } from "convex/chessArena/convex/service/createGame";
import { catalogAlbum } from "convex/chessArena/convex/service/teamService";
import {
  createArenaMemory,
  createRpgStore,
  ensureChessPlayer,
  hudSnapshot,
} from "convex/rpg/session";
import {
  buyTickets,
  catalog,
  claimPass,
  joinRpg,
  leagueBoard,
  previewTable,
  settleRpg,
} from "convex/portal/convex/service/rpg/engine";

export type RpgScreen =
  | "shop"
  | "rewards"
  | "home"
  | "hall"
  | "preview"
  | "loadout"
  | "match"
  | "result"
  | "league"
  | "me";

const listeners = new Set<() => void>();

export function subscribeRpg(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => listener());
}

const runtime = {
  store: createRpgStore(),
  arena: createArenaMemory(),
  uid: "guest",
  screen: "home" as RpgScreen,
  hallKind: "showdown" as RpgHallKind,
  tableId: "showdown_chess",
  lastGameType: "chess" as RpgGameType,
  loadout: defaultRankRoadLoadout(),
  lastResult: null as null | ReturnType<typeof settleRpg> & { score: number; gameId: string },
  lastGameId: "",
};

ensureChessPlayer(runtime.arena, runtime.uid);

export function rpgUid() {
  return runtime.uid;
}

export function setRpgUid(uid: string) {
  runtime.uid = uid || "guest";
  ensureChessPlayer(runtime.arena, runtime.uid);
}

export function getRpgHud() {
  return hudSnapshot(runtime.store, runtime.uid);
}

export function getRpgCatalog() {
  return catalog();
}

export function getRpgScreen() {
  return runtime.screen;
}

export function setRpgScreen(screen: RpgScreen) {
  runtime.screen = screen;
}

export function getHallKind() {
  return runtime.hallKind;
}

export function setHallKind(kind: RpgHallKind) {
  runtime.hallKind = kind;
}

export function getTableId() {
  return runtime.tableId;
}

export function setTableId(tableId: string) {
  runtime.tableId = tableId;
}

export function getLoadout() {
  return [...runtime.loadout];
}

export function setLoadout(loadout: string[]) {
  runtime.loadout = [...loadout];
}

export function getLastGameType() {
  return runtime.lastGameType;
}

export function setLastGameType(gameType: RpgGameType) {
  runtime.lastGameType = gameType;
}

export function previewCurrentTable() {
  return previewTable(runtime.store, { tableId: runtime.tableId });
}

export function shopBuy(skuId: string) {
  const result = buyTickets(runtime.store, { uid: runtime.uid, skuId });
  notify();
  return result;
}

export function claimRpgPass() {
  const result = claimPass(runtime.store, runtime.uid);
  notify();
  return result;
}

export function getLeague() {
  return leagueBoard(runtime.store);
}

export function getChessCodex() {
  const owned = ensureChessPlayer(runtime.arena, runtime.uid);
  return {
    dust: runtime.arena.dust.get(runtime.uid) ?? 0,
    cards: catalogAlbum(owned),
  };
}

export function joinCurrentTable() {
  const joined = joinRpg(runtime.store, {
    uid: runtime.uid,
    tableId: runtime.tableId,
    loadout: runtime.loadout,
  });
  if (!joined.ok || !joined.run) return joined;
  const game = createGameState({
    gameId: joined.run.gameId,
    seed: joined.run.seedId,
    loadout: joined.run.loadout,
    uid: runtime.uid,
    matchId: joined.run.matchId,
  });
  runtime.arena.games.set(game.gameId, game);
  runtime.lastGameId = game.gameId;
  notify();
  return { ...joined, game };
}

export function getCurrentGame() {
  return runtime.arena.games.get(runtime.lastGameId) ?? null;
}

export function submitCurrentGame() {
  const game = getCurrentGame();
  if (!game) return { ok: false as const, reason: "no_game" };
  const score = scoreFinishedGame(game);
  game.score = score;
  game.status = 3;
  const settled = settleRpg(runtime.store, { gameId: game.gameId, score, success: true });
  if (settled.dust) {
    runtime.arena.dust.set(runtime.uid, (runtime.arena.dust.get(runtime.uid) ?? 0) + settled.dust);
  }
  runtime.lastResult = { ...settled, score, gameId: game.gameId };
  notify();
  return { ok: true as const, score, settled, game };
}

export function getLastResult() {
  return runtime.lastResult;
}

export function tabUri(id: (typeof RPG_SHELL_TABS)[number]["id"]) {
  return RPG_SHELL_TABS.find((tab) => tab.id === id)?.path ?? "/rpg/home";
}
