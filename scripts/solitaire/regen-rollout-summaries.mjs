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

function stripCatalogMetrics(metrics) {
  const q = metrics.scoreQuantiles;
  const out = {
    rolloutCount: metrics.rolloutCount,
    scoreMin: metrics.scoreMin,
    scoreP50: metrics.scoreP50,
    scoreP90: metrics.scoreP90,
    scoreMax: metrics.scoreMax,
    scoreSpread: metrics.scoreSpread,
    scoreQuantiles: {
      p10: q.p10,
      p25: q.p25,
      p30: q.p30,
      p33: q.p33,
      p50: q.p50,
      p66: q.p66,
      p70: q.p70,
      p75: q.p75,
      p90: q.p90,
    },
  };
  if (metrics.scoreHistogram) out.scoreHistogram = metrics.scoreHistogram;
  return out;
}

async function syncSeedToCatalog(poolVersion, entry, rolloutSummaries) {
  const seedId = entry.seedId;
  const entryDoc = {
    seedId,
    poolVersion,
    tier: entry.tier,
    difficultyScore: entry.difficultyScore,
    metrics: stripCatalogMetrics(entry.metrics),
  };
  if (entry.solvable != null) {
    entryDoc.solvable = entry.solvable;
    entryDoc.solvableSource = entry.solvableSource;
    entryDoc.solvableReason = entry.solvableReason ?? null;
  }
  await runConvexCatalog(`${ADMIN}:importSeedPoolAppendBatch`, {
    gameType: CATALOG_GAME_TYPE,
    poolVersion,
    entries: [entryDoc],
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

  const { toRolloutSummaries, DEFAULT_GENERATE_SOLVE_OPTS } = await import(
    pathToFileURL(runnerPath).href
  );
  const { simulateSeedRollouts } = await import(pathToFileURL(simPath).href);
  const { verifyAllRollouts } = await import(pathToFileURL(verifyPath).href);
  const { assignTiers, buildTierIndex } = await import(pathToFileURL(diffPath).href);
  const solverPath = path.join(
    repoRoot,
    "src/convex/solitaireArena/convex/service/seedPool/solitaireSolver.ts"
  );
  const { resolveSeedSolvability } = await import(pathToFileURL(solverPath).href);
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
    const solvability = resolveSeedSolvability({
      seedId,
      hasAnyCompleted: result.metrics.hasAnyCompleted,
      rolloutSummaries: result.rolloutSummaries,
      solveOpts: DEFAULT_GENERATE_SOLVE_OPTS,
    });
    const withSolve = {
      ...result,
      solvable: solvability.solvable,
      solvableSource: solvability.solvableSource,
      solvableReason: solvability.solvableReason,
    };
    updatedBySeed.set(seedId, withSolve);
    if (opts.sync) {
      const patchedEntry = {
        ...entry,
        difficultyScore: withSolve.difficultyScore,
        metrics: withSolve.metrics,
        rolloutSummaries: withSolve.rolloutSummaries,
        solvable: withSolve.solvable,
        solvableSource: withSolve.solvableSource,
        solvableReason: withSolve.solvableReason,
      };
      const syncRes = await syncSeedToCatalog(poolVersion, patchedEntry, withSolve.rolloutSummaries);
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
      solvable: u.solvable,
      solvableSource: u.solvableSource,
      solvableReason: u.solvableReason,
    };
  });

  const tiered = assignTiers(
    nextEntries.map((e) => ({
      seedId: e.seedId,
      poolVersion: e.poolVersion,
      difficultyScore: e.difficultyScore,
      metrics: e.metrics,
      rolloutSummaries: e.rolloutSummaries ?? [],
      solvable: e.solvable,
      solvableSource: e.solvableSource,
      solvableReason: e.solvableReason,
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
