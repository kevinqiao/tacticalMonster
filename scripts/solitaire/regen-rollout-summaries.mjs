#!/usr/bin/env node
/**
 * Regenerate rolloutSummaries (+ metrics) for one or all seeds in index.json.
 * Optionally sync rollout rows to Convex for the affected seed(s).
 *
 *   npx tsx scripts/solitaire/regen-rollout-summaries.mjs --seed solitaire-pool:v2:379
 *   npx tsx scripts/solitaire/regen-rollout-summaries.mjs --seed solitaire-pool:v2:379 --sync
 *   npx tsx scripts/solitaire/regen-rollout-summaries.mjs --all --in scripts/solitaire/output/pool-v2
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { runConvexCatalog } from "../seed-catalog/run-convex-catalog.mjs";
import { CATALOG_GAME_TYPES } from "../seed-catalog/catalog-game-types.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const ADMIN = "service/seedPool/seedPoolAdmin";
const CATALOG_GAME_TYPE = CATALOG_GAME_TYPES.solitaire;

function parseArgs(argv) {
  const opts = {
    inDir: path.join(repoRoot, "scripts/solitaire/output/pool-v2"),
    seedId: "",
    all: false,
    sync: false,
    matchSeconds: 300,
    poolVersion: "",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--in") opts.inDir = path.resolve(next());
    else if (a === "--seed") opts.seedId = next();
    else if (a === "--all") opts.all = true;
    else if (a === "--sync") opts.sync = true;
    else if (a === "--match-seconds") opts.matchSeconds = Number(next());
    else if (a === "--pool-version") opts.poolVersion = next();
  }
  return opts;
}

async function regenOneSeed(seedId, rolloutCount, matchSeconds, modules) {
  const { simulateSeedRollouts, verifyAllRollouts, toRolloutSummaries } = modules;
  const { allRollouts, metrics } = simulateSeedRollouts(seedId, rolloutCount, {
    matchSeconds,
    keepDuplicateRollouts: true,
  });
  const verify = verifyAllRollouts(seedId, allRollouts, matchSeconds);
  if (!verify.ok) {
    return { ok: false, reason: verify.reason };
  }
  return {
    ok: true,
    metrics,
    difficultyScore: metrics.scoreP50,
    rolloutSummaries: toRolloutSummaries(allRollouts),
  };
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
  const seedId = entry.seedId;
  await runConvexCatalog(`${ADMIN}:importSeedPoolAppendBatch`, {
    gameType: CATALOG_GAME_TYPE,
    poolVersion,
    entries: [
      {
        seedId,
        poolVersion,
        tier: entry.tier,
        difficultyScore: entry.difficultyScore,
        metrics: entry.metrics,
      },
    ],
    rollouts: flattenRollouts(poolVersion, seedId, rolloutSummaries),
    indexOnly: false,
  });
  return { ok: true, seedId, rollouts: rolloutSummaries.length };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.all && !opts.seedId) {
    console.error("Usage: regen-rollout-summaries.mjs --seed <seedId> [--sync] | --all [--sync]");
    process.exit(1);
  }

  const indexPath = path.join(opts.inDir, "index.json");
  const raw = JSON.parse(await readFile(indexPath, "utf8"));
  const poolVersion = opts.poolVersion || raw.poolVersion || "v2";
  const entries = raw.entries ?? [];

  const runnerPath = path.join(
    repoRoot,
    "src/convex/solitaireArena/convex/service/seedPool/solitaireSeedPoolRunner.ts"
  );
  const simPath = path.join(
    repoRoot,
    "src/convex/solitaireArena/convex/service/seedPool/solitaireSeedSimulator.ts"
  );
  const verifyPath = path.join(
    repoRoot,
    "src/convex/solitaireArena/convex/service/seedPool/solitaireSeedPoolReplayVerify.ts"
  );
  const diffPath = path.join(
    repoRoot,
    "src/convex/solitaireArena/convex/service/seedPool/solitaireSeedDifficulty.ts"
  );

  const { toRolloutSummaries } = await import(pathToFileURL(runnerPath).href);
  const { simulateSeedRollouts } = await import(pathToFileURL(simPath).href);
  const { verifyAllRollouts } = await import(pathToFileURL(verifyPath).href);
  const { assignTiers, buildTierIndex } = await import(pathToFileURL(diffPath).href);
  const modules = { simulateSeedRollouts, verifyAllRollouts, toRolloutSummaries };

  const targetIds = opts.all
    ? new Set(entries.map((e) => e.seedId))
    : new Set([opts.seedId]);

  const updatedBySeed = new Map();
  const failed = [];

  for (const seedId of targetIds) {
    const entry = entries.find((e) => e.seedId === seedId);
    if (!entry) {
      failed.push({ seedId, reason: "not_in_index" });
      continue;
    }
    const k = entry.metrics?.rolloutCount ?? raw.rolloutCount ?? 40;
    console.log(`regen summaries ${seedId} rollouts=${k}`);
    const result = await regenOneSeed(seedId, k, opts.matchSeconds, modules);
    if (!result.ok) {
      failed.push({ seedId, reason: result.reason });
      continue;
    }
    updatedBySeed.set(seedId, result);
    if (opts.sync) {
      const patchedEntry = {
        ...entry,
        difficultyScore: result.difficultyScore,
        metrics: result.metrics,
        rolloutSummaries: result.rolloutSummaries,
      };
      const syncRes = await syncSeedToCatalog(poolVersion, patchedEntry, result.rolloutSummaries);
      console.log(`  synced to catalog:`, syncRes);
    }
  }

  const nextEntries = entries.map((e) => {
    const u = updatedBySeed.get(e.seedId);
    if (!u) return e;
    return {
      ...e,
      difficultyScore: u.difficultyScore,
      metrics: u.metrics,
      rolloutSummaries: u.rolloutSummaries,
    };
  });

  const tiered = assignTiers(
    nextEntries.map((e) => ({
      seedId: e.seedId,
      poolVersion: e.poolVersion,
      difficultyScore: e.difficultyScore,
      metrics: e.metrics,
      rolloutSummaries: e.rolloutSummaries ?? [],
    })),
    { easy: 0.3, medium: 0.4 }
  );

  const rolloutCount = tiered[0]?.metrics.rolloutCount ?? raw.rolloutCount ?? 40;
  const nextIndex = {
    ...raw,
    poolVersion,
    rolloutCount,
    matchTimeLimitSec: opts.matchSeconds,
    generatedAt: new Date().toISOString(),
    policyNote: opts.all ? "regen-rollout-summaries-all" : `regen-rollout-summaries:${opts.seedId}`,
    entries: tiered,
  };

  await writeFile(indexPath, JSON.stringify(nextIndex, null, 2), "utf8");

  const tierIndex = buildTierIndex(tiered, poolVersion, rolloutCount, nextIndex.generatedAt);
  await writeFile(path.join(opts.inDir, "tier-index.json"), JSON.stringify(tierIndex, null, 2), "utf8");

  if (failed.length > 0) {
    console.log("failed:", failed);
  }
  console.log(
    `local index updated: ${updatedBySeed.size} seed(s), ${failed.length} failed, sync=${opts.sync}`
  );

  if (opts.sync && updatedBySeed.size > 0) {
    await runConvexCatalog(`${ADMIN}:refreshSeedPoolMeta`, {
      gameType: CATALOG_GAME_TYPE,
      poolVersion,
      generatedAt: nextIndex.generatedAt,
      rolloutCount,
      matchTimeLimitSec: opts.matchSeconds,
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
