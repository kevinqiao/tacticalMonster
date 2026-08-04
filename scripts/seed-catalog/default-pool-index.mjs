import path from "node:path";

/** CLI 别名 → catalog gameType */
const GAME_ALIASES = {
  solitaire: "solitaire",
  sol: "solitaire",
  block_blast: "block_blast",
  blockblast: "block_blast",
  blast: "block_blast",
  match_3: "match_3",
  match3: "match_3",
  tower_arena: "tower_arena",
  tower: "tower_arena",
  yatz: "yatz",
};

export function normalizeGameAlias(raw) {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  return GAME_ALIASES[key] ?? raw;
}

export function gameAliasHelp() {
  return "solitaire (sol) | block_blast (blast) | match_3 (match3) | tower (tower_arena) | yatz";
}

/** 各 game 默认 index.json（solitaire / block_blast 随 policy 版本推导） */
export async function resolveDefaultIndexPath(repoRoot, gameType) {
  switch (gameType) {
    case "solitaire": {
      const { loadPoolDefaults } = await import("../solitaire/solitaire-pool-defaults.mjs");
      const d = await loadPoolDefaults(repoRoot);
      return path.join(d.outDir, "index.json");
    }
    case "block_blast": {
      const { loadPoolDefaults } = await import("../blockblast/blockblast-pool-defaults.mjs");
      const d = await loadPoolDefaults(repoRoot);
      return path.join(d.outDir, "index.json");
    }
    case "match_3":
      return path.join(repoRoot, "scripts/match3/output/pool-v1/index.json");
    case "tower_arena":
      return path.join(repoRoot, "scripts/tower/output/pool-v1/index.json");
    case "yatz":
      return path.join(repoRoot, "scripts/yatz/output/pool-v2/index.json");
    default:
      return "";
  }
}
