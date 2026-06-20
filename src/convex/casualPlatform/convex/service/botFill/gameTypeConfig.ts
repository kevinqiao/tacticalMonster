/** Per-game bot fill parameters (platform unified). */

export type BotFillGameType = "block_blast" | "solitaire" | "match_3" | "tower_arena" | "yatz";

export function scoreEpsilon(gameType: BotFillGameType): number {
  if (gameType === "block_blast") return 50;
  if (gameType === "yatz") return 10;
  return 5;
}

export function scoreSpan(gameType: BotFillGameType): number {
  if (gameType === "block_blast") return 5000;
  if (gameType === "yatz") return 300;
  return 500;
}

export function finiteSlotHighDefault(gameType: BotFillGameType): number {
  if (gameType === "block_blast") return 5000;
  if (gameType === "yatz") return 375;
  return 2000;
}

export function isBotFillGameType(gameType: string): gameType is BotFillGameType {
  return (
    gameType === "block_blast" ||
    gameType === "solitaire" ||
    gameType === "match_3" ||
    gameType === "tower_arena" ||
    gameType === "yatz"
  );
}
