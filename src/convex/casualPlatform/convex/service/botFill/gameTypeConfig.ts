/** Per-game bot fill parameters (platform unified). */

export type BotFillGameType = "block_blast" | "solitaire" | "match_3" | "tower_arena";

export function scoreEpsilon(gameType: BotFillGameType): number {
  return gameType === "block_blast" ? 50 : 5;
}

export function scoreSpan(gameType: BotFillGameType): number {
  return gameType === "block_blast" ? 5000 : 500;
}

export function finiteSlotHighDefault(gameType: BotFillGameType): number {
  return gameType === "block_blast" ? 5000 : 2000;
}

export function isBotFillGameType(gameType: string): gameType is BotFillGameType {
  return (
    gameType === "block_blast" ||
    gameType === "solitaire" ||
    gameType === "match_3" ||
    gameType === "tower_arena"
  );
}
