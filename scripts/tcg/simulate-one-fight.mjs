#!/usr/bin/env node
/**
 * Headless one-fight simulation for TCG vertical slice (Step 2).
 *
 * Usage:
 *   node scripts/tcg/simulate-one-fight.mjs
 *   node scripts/tcg/simulate-one-fight.mjs --seed my-seed --boss boss_01
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
const ENGINE_PATH = join(
  __dirname,
  "../../src/convex/tcgArena/convex/service/TcgBossEngine.ts",
);

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, name), "utf8"));
}

function parseArgs(argv) {
  const args = { seed: "tcg-sim-default", boss: "boss_01", deck: "deck_starter_sim" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--seed" && argv[i + 1]) {
      args.seed = argv[++i];
    } else if (argv[i] === "--boss" && argv[i + 1]) {
      args.boss = argv[++i];
    } else if (argv[i] === "--deck" && argv[i + 1]) {
      args.deck = argv[++i];
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const season = loadJson("season_1.cards.json");
  const boss = loadJson(`${args.boss}.json`);
  const deckFile = loadJson(`${args.deck}.json`);

  const engineUrl = pathToFileURL(ENGINE_PATH).href;
  const { runGreedyBossFight, buildCatalog } = await import(engineUrl);

  const catalog = buildCatalog(season.cards);
  const result = runGreedyBossFight({
    seed: args.seed,
    boss,
    deckCardIds: deckFile.cardIds,
    catalog,
  });

  const out = {
    seed: args.seed,
    bossId: boss.bossId,
    bossName: boss.name,
    deckId: deckFile.deckId,
    won: result.won,
    turns: result.turns,
    score: result.finalState.score,
    heroHp: result.finalState.heroHp,
    heroArmor: result.finalState.heroArmor,
    bossHp: result.finalState.bossHp,
    damageDealtToBoss: result.finalState.damageDealtToBoss,
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
