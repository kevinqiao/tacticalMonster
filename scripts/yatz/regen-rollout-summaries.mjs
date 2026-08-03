#!/usr/bin/env node
/**
 * 重算 yatz index.json 内 rolloutSummaries（Bot 观战依赖 casualPlatform rollout 子表）。
 *
 *   npx tsx scripts/yatz/regen-rollout-summaries.mjs --all
 *   npx tsx scripts/yatz/regen-rollout-summaries.mjs --all --sync
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { runConvexCatalog } from "../seed-catalog/run-convex-catalog.mjs";
import { CATALOG_GAME_TYPES } from "../seed-catalog/catalog-game-types.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const ADMIN = "service/seedPool/seedPoolAdmin";
const CATALOG_GAME_TYPE = CATALOG_GAME_TYPES.yatz;

function parseArgs(argv) {
  const opts = {
    inDir: path.join(repoRoot, "scripts/yatz/output/pool-v1"),
    all: false,
    sync: false,
    poolVersion: "",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--in") opts.inDir = path.resolve(next());
    else if (a === "--all") opts.all = true;
    else if (a === "--sync") opts.sync = true;
    else if (a === "--pool-version") opts.poolVersion = next();
  }
  return opts;
}

async function loadSimulator() {
  const mod = await import(
    pathToFileURL(
      path.join(repoRoot, "src/convex/yatzArena/convex/service/seedPool/yatzSeedSimulator.ts")
    ).href
  );
  return mod;
}

function toRolloutSummaries(seedId, rolloutCount, simulateRollout) {
  const summaries = [];
  for (let r = 0; r < rolloutCount; r++) {
    const sim = simulateRollout(seedId, r);
    const elapsedMs =
      sim.replayPacingMs?.reduce((a, b) => a + b, 0) ?? sim.ops.length * 500;
    summaries.push({
      rolloutIndex: r,
      finalScore: sim.finalScore,
      moves: sim.ops.filter((o) => o.op === "pick_category").length,
      completed: sim.completed,
      terminalReason: sim.completed ? "completed" : "incomplete",
      elapsedSimSeconds: Math.max(1, Math.round(elapsedMs / 1000)),
      opCount: sim.ops.length,
    });
  }
  return summaries;
}

function flattenRollouts(poolVersion, seedId, rolloutSummaries) {
  return rolloutSummaries.map((r) => ({
    poolVersion,
    seedId,
    rolloutIndex: r.rolloutIndex,
    finalScore: r.finalScore,
    moves: r.moves,
    completed: r.completed,
    terminalReason: r.terminalReason,
    elapsedSimSeconds: r.elapsedSimSeconds,
    opCount: r.opCount,
  }));
}

async function syncSeedToCatalog(poolVersion, entry, rolloutSummaries) {
  await runConvexCatalog(`${ADMIN}:importSeedPoolAppendBatch`, {
    gameType: CATALOG_GAME_TYPE,
    poolVersion,
    entries: [
      {
        seedId: entry.seedId,
        poolVersion,
        tier: entry.tier,
        difficultyScore: entry.difficultyScore,
        metrics: entry.metrics,
      },
    ],
    rollouts: flattenRollouts(poolVersion, entry.seedId, rolloutSummaries),
    indexOnly: false,
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.all) {
    console.error("usage: regen-rollout-summaries.mjs --all [--sync] [--in dir]");
    process.exit(1);
  }

  const indexPath = path.join(opts.inDir, "index.json");
  const raw = JSON.parse(await readFile(indexPath, "utf8"));
  const poolVersion = opts.poolVersion || raw.poolVersion || "v1";
  const rolloutCount = raw.rolloutCount ?? 20;
  const { simulateRollout } = await loadSimulator();

  let done = 0;
  for (const entry of raw.entries) {
    entry.rolloutSummaries = toRolloutSummaries(entry.seedId, rolloutCount, simulateRollout);
    done++;
    if (done % 10 === 0) {
      console.log(`rollout summaries: ${done}/${raw.entries.length}`);
    }
  }

  await writeFile(indexPath, JSON.stringify(raw, null, 2));
  console.log(`updated ${indexPath} (${raw.entries.length} seeds × ${rolloutCount} rollouts)`);

  if (opts.sync) {
    for (const entry of raw.entries) {
      await syncSeedToCatalog(poolVersion, entry, entry.rolloutSummaries);
      console.log(`synced rollouts: ${entry.seedId}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
