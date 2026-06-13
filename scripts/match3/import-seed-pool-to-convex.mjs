#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { clearSeedPoolFully, convexPayloadBytes, runConvexMatch3, WINDOWS_CONVEX_ARG_BUDGET } from "./run-convex-match3.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const ADMIN = "service/seedPool/match3SeedPoolAdmin";

function parseArgs(argv) {
  const opts = {
    index: path.join(repoRoot, "scripts/match3/output/pool-v1/index.json"),
    batchSize: process.platform === "win32" ? 2 : 8,
    clearFirst: false,
    poolVersion: "",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--index") opts.index = path.resolve(next());
    else if (a === "--batch-size") opts.batchSize = Number(next());
    else if (a === "--clear-first") opts.clearFirst = true;
    else if (a === "--pool-version") opts.poolVersion = next();
  }
  return opts;
}

function toRolloutImports(entry, poolVersion) {
  return (entry.rolloutSummaries ?? []).map((r) => ({
    poolVersion,
    seedId: entry.seedId,
    ...r,
  }));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const raw = JSON.parse(await readFile(opts.index, "utf8"));
  const poolVersion = opts.poolVersion || raw.poolVersion || "v1";
  const entries = raw.entries ?? [];

  if (opts.clearFirst) {
    console.log(`clearing pool ${poolVersion}...`);
    await clearSeedPoolFully(poolVersion);
  }

  await runConvexMatch3(`${ADMIN}:importSeedPoolBegin`, {
    poolVersion,
    rolloutCount: raw.rolloutCount ?? 20,
    matchTimeLimitSec: raw.matchTimeLimitSec ?? 180,
    generatedAt: raw.generatedAt ?? new Date().toISOString(),
  });

  let imported = 0;
  for (let i = 0; i < entries.length; i += opts.batchSize) {
    const chunk = entries.slice(i, i + opts.batchSize);
    const entryImports = chunk.map((e) => ({
      seedId: e.seedId,
      poolVersion,
      tier: e.tier,
      difficultyScore: e.difficultyScore,
      metrics: e.metrics,
    }));
    const rolloutImports = chunk.flatMap((e) => toRolloutImports(e, poolVersion));
    const args = { poolVersion, entries: entryImports, rollouts: rolloutImports };
    if (convexPayloadBytes(args) > WINDOWS_CONVEX_ARG_BUDGET && opts.batchSize > 1) {
      throw new Error("batch too large; reduce --batch-size");
    }
    await runConvexMatch3(`${ADMIN}:importSeedPoolBatch`, args);
    imported += chunk.length;
    console.log(`imported ${imported}/${entries.length}`);
  }

  await runConvexMatch3(`${ADMIN}:importSeedPoolFinalize`, {
    poolVersion,
    minEntries: Math.min(1, entries.length),
  });
  console.log(`match3 pool import done: ${poolVersion} (${entries.length} entries)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
