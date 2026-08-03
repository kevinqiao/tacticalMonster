#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const codecPath = path.join(repoRoot, "src/convex/solitaireArena/convex/service/seedPool/solitaireOpCodec.ts");
const rmPath = path.join(repoRoot, "src/convex/solitaireArena/convex/service/SoloRuleManager.ts");
const typesPath = path.join(repoRoot, "src/convex/solitaireArena/convex/types/SoloTypes.ts");

const { buildDealtState, openingMoveCount } = await import(pathToFileURL(codecPath).href);
const { SoloRuleManager } = await import(pathToFileURL(rmPath).href);
const { GameInteractionPhase } = await import(pathToFileURL(typesPath).href);

const indices = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
const seeds = indices.length ? indices : [0, 1, 21, 100, 999];

for (const i of seeds) {
  const seedId = `solitaire-pool:v2:${i}`;
  const s = buildDealtState(seedId);
  const rm = new SoloRuleManager(s, GameInteractionPhase.idle);
  const moves = rm.getAllPossibleMoves();
  const top = moves.slice(0, 5).map((m) => `${m.from}->${m.to}`);
  console.log(
    JSON.stringify({
      index: i,
      seedId,
      openingMoveCount: openingMoveCount(s),
      legalMoveCount: moves.length,
      sampleMoves: top,
    })
  );
}
