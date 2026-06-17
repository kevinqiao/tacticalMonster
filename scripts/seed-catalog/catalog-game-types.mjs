/** Catalog `gameType` values (casualPlatform seed_pool schema). */
export const CATALOG_GAME_TYPES = {
  block_blast: "block_blast",
  solitaire: "solitaire",
  match_3: "match_3",
  tower_arena: "tower_arena",
};

export const VALID_CATALOG_GAME_TYPES = new Set(Object.values(CATALOG_GAME_TYPES));

export function assertCatalogGameType(gameType) {
  if (!VALID_CATALOG_GAME_TYPES.has(gameType)) {
    throw new Error(
      `invalid --game-type ${gameType}; expected one of: ${[...VALID_CATALOG_GAME_TYPES].join(", ")}`
    );
  }
  return gameType;
}
