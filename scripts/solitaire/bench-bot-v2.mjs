#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const simPath = path.join(
  repoRoot,
  "src/convex/solitaireArena/convex/service/seedPool/solitaireSeedSimulator.ts"
);
const { simulateSeedRollouts } = await import(pathToFileURL(simPath).href);

const seeds = [0, 10, 21, 54, 100, 195, 346];
for (const i of seeds) {
  const seedId = `solitaire-pool:v2:${i}`;
  const { metrics } = simulateSeedRollouts(seedId, 1);
  const hist = metrics.scoreHistogram ?? {};
  console.log(
    i,
    "p50",
    metrics.scoreP50,
    "p90",
    metrics.scoreP90,
    "max",
    metrics.scoreMax,
    "spread",
    metrics.scoreMax - metrics.scoreP25,
    "exited%",
    Math.round(metrics.exitedRate * 100),
    "time_up%",
    Math.round((metrics.timeUpRate ?? 0) * 100),
    "hist",
    JSON.stringify(hist)
  );
}
