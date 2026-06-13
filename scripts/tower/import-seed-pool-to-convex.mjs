#!/usr/bin/env node
/**
 * Import tower seed pool index.json into towerArena Convex.
 * Usage: node scripts/tower/import-seed-pool-to-convex.mjs [--dir scripts/tower/output/pool-v1]
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  convexPayloadBytes,
  runConvexTower,
  WINDOWS_CONVEX_ARG_BUDGET,
} from "./run-convex-tower.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir =
  (process.argv.includes("--dir") && process.argv[process.argv.indexOf("--dir") + 1]) ||
  join(__dirname, "output", "pool-v1");
const indexPath = join(dir, "index.json");
const index = JSON.parse(readFileSync(indexPath, "utf8"));

const ADMIN = "service/seedPool/towerSeedPoolAdmin";
const poolVersion = index.poolVersion;
const defaultBatchSize = process.platform === "win32" ? 4 : 10;

console.log(`Importing ${index.entries.length} seeds for ${poolVersion}...`);

const beginResult = runConvexTower(`${ADMIN}:importSeedPoolBegin`, {
  poolVersion,
  rolloutCount: index.rolloutCount,
  matchTimeLimitSec: index.matchTimeLimitSec,
  generatedAt: index.generatedAt,
});
console.log("begin:", beginResult);

let batchNum = 0;
for (let i = 0; i < index.entries.length; ) {
  let batchSize = defaultBatchSize;
  let slice = index.entries.slice(i, i + batchSize);
  let rollouts = [];
  for (const e of slice) {
    for (const r of e.rolloutSummaries ?? []) {
      rollouts.push({ poolVersion, seedId: e.seedId, ...r });
    }
  }
  let batch = {
    poolVersion,
    entries: slice.map((e) => ({
      poolVersion,
      seedId: e.seedId,
      tier: e.tier,
      difficultyScore: e.difficultyScore,
      metrics: e.metrics,
    })),
    rollouts,
  };

  while (convexPayloadBytes(batch) > WINDOWS_CONVEX_ARG_BUDGET && slice.length > 1) {
    batchSize = Math.max(1, Math.floor(batchSize / 2));
    slice = index.entries.slice(i, i + batchSize);
    rollouts = [];
    for (const e of slice) {
      for (const r of e.rolloutSummaries ?? []) {
        rollouts.push({ poolVersion, seedId: e.seedId, ...r });
      }
    }
    batch = {
      poolVersion,
      entries: slice.map((e) => ({
        poolVersion,
        seedId: e.seedId,
        tier: e.tier,
        difficultyScore: e.difficultyScore,
        metrics: e.metrics,
      })),
      rollouts,
    };
  }

  batchNum += 1;
  const batchResult = runConvexTower(`${ADMIN}:importSeedPoolBatch`, batch);
  console.log(
    `entries batch ${batchNum} count=${slice.length} bytes=${convexPayloadBytes(batch)} entryCount=${batchResult?.entriesWritten ?? "?"}`
  );
  i += slice.length;
}

const finalizeResult = runConvexTower(`${ADMIN}:importSeedPoolFinalize`, { poolVersion });
console.log("finalize:", finalizeResult);
console.log("Import complete.");
