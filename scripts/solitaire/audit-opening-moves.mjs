#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const codecPath = path.join(
  repoRoot,
  "src/convex/solitaireArena/convex/service/seedPool/solitaireOpCodec.ts"
);
const { buildDealtState, openingMoveCount } = await import(pathToFileURL(codecPath).href);

const n = Number(process.argv[2] ?? 2000);
const hist = {};
let withRealMove = 0;
for (let i = 0; i < n; i++) {
  const opens = openingMoveCount(buildDealtState(`solitaire-pool:v2:${i}`));
  hist[opens] = (hist[opens] ?? 0) + 1;
  if (opens >= 2) withRealMove++;
}
console.log(`sample=${n} (seed index 0..${n - 1})`);
console.log("openingMoveCount histogram:", hist);
console.log(
  `>=2 (draw + at least 1 legal move): ${withRealMove} (${((100 * withRealMove) / n).toFixed(1)}%)`
);
for (const min of [1, 2, 3, 4]) {
  const pass = Object.entries(hist).reduce(
    (s, [k, v]) => s + (Number(k) >= min ? v : 0),
    0
  );
  console.log(`pass min-opening-moves=${min}: ${pass} (${((100 * pass) / n).toFixed(1)}%)`);
}
