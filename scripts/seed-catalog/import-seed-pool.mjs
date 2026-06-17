#!/usr/bin/env node
/**
 * Import index.json into casualPlatform seed catalog (meta + entries + rollout rows).
 *
 *   npx tsx scripts/seed-catalog/import-seed-pool.mjs \
 *     --game-type block_blast \
 *     --index scripts/blockblast/output/pool-v3/index.json
 *
 *   npx tsx scripts/seed-catalog/import-seed-pool.mjs --game-type solitaire --index ... --append
 *   npx tsx scripts/seed-catalog/import-seed-pool.mjs --game-type match_3 --index ... --clear-first
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertCatalogGameType } from "./catalog-game-types.mjs";
import {
  clearSeedPoolFully,
  convexPayloadBytes,
  runConvexCatalog,
  WINDOWS_CONVEX_ARG_BUDGET,
} from "./run-convex-catalog.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const ADMIN = "service/seedPool/seedPoolAdmin";
const QUERIES = "service/seedPool/seedPoolQueries";

function defaultBatchSize(indexOnly) {
  if (indexOnly) return 8;
  return process.platform === "win32" ? 2 : 8;
}

function parseArgs(argv) {
  const opts = {
    gameType: "",
    index: "",
    batchSize: 0,
    minEntries: 0,
    indexOnly: false,
    clearFirst: false,
    append: false,
    updateExisting: false,
    poolVersion: "",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--game-type") opts.gameType = next();
    else if (a === "--index") opts.index = path.resolve(next());
    else if (a === "--batch-size") opts.batchSize = Number(next());
    else if (a === "--min-entries") opts.minEntries = Number(next());
    else if (a === "--index-only") opts.indexOnly = true;
    else if (a === "--clear-first") opts.clearFirst = true;
    else if (a === "--append") opts.append = true;
    else if (a === "--update-existing") opts.updateExisting = true;
    else if (a === "--pool-version") opts.poolVersion = next();
  }
  return opts;
}

function flattenRollouts(entries, poolVersion) {
  const rollouts = [];
  for (const e of entries) {
    for (const r of e.rolloutSummaries ?? []) {
      rollouts.push({
        poolVersion,
        seedId: e.seedId,
        rolloutIndex: r.rolloutIndex,
        finalScore: r.finalScore,
        moves: r.moves,
        completed: r.completed,
        terminalReason: r.terminalReason,
        elapsedSimSeconds: r.elapsedSimSeconds,
        opCount: r.opCount,
      });
    }
  }
  return rollouts;
}

/** Catalog schema accepts only cross-game rollout distribution fields. */
function stripCatalogMetrics(metrics) {
  if (!metrics || typeof metrics !== "object") {
    throw new Error("entry missing metrics");
  }
  const q = metrics.scoreQuantiles;
  if (!q || typeof q !== "object") {
    throw new Error("entry metrics missing scoreQuantiles");
  }
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
  if (metrics.scoreHistogram && typeof metrics.scoreHistogram === "object") {
    out.scoreHistogram = metrics.scoreHistogram;
  }
  return out;
}

function toEntryImport(e, poolVersion) {
  return {
    seedId: e.seedId,
    poolVersion,
    tier: e.tier,
    difficultyScore: e.difficultyScore,
    metrics: stripCatalogMetrics(e.metrics),
  };
}

function buildBatchArgs(gameType, poolVersion, batchEntries, indexOnly) {
  const rollouts = indexOnly ? [] : flattenRollouts(batchEntries, poolVersion);
  return {
    gameType,
    poolVersion,
    entries: batchEntries.map((e) => toEntryImport(e, poolVersion)),
    rollouts,
    indexOnly,
  };
}

function fitRolloutChunk(summaries, start, poolVersion, seedId, maxBytes) {
  let size = summaries.length - start;
  while (size > 1) {
    const rollouts = summaries.slice(start, start + size).map((r) => ({
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
    const args = { poolVersion, entries: [], rollouts, indexOnly: false };
    if (convexPayloadBytes(args) <= maxBytes) {
      return { size, rollouts };
    }
    size -= 1;
  }
  const r = summaries[start];
  return {
    size: 1,
    rollouts: [
      {
        poolVersion,
        seedId,
        rolloutIndex: r.rolloutIndex,
        finalScore: r.finalScore,
        moves: r.moves,
        completed: r.completed,
        terminalReason: r.terminalReason,
        elapsedSimSeconds: r.elapsedSimSeconds,
        opCount: r.opCount,
      },
    ],
  };
}

function singleEntryWithRolloutsBytes(gameType, poolVersion, entry, indexOnly) {
  return convexPayloadBytes(buildBatchArgs(gameType, poolVersion, [entry], indexOnly));
}

function needsSplitEntryRolloutImport(gameType, poolVersion, entries, indexOnly) {
  if (indexOnly) return false;
  const sample = entries[0];
  if (!sample) return false;
  return singleEntryWithRolloutsBytes(gameType, poolVersion, sample, false) > WINDOWS_CONVEX_ARG_BUDGET;
}

async function importEntryBatches(batchFn, gameType, poolVersion, entries, batchSize) {
  const entryBatchSize = Math.max(batchSize, process.platform === "win32" ? 8 : 16);
  let batchNum = 0;
  for (let i = 0; i < entries.length; ) {
    const size = fitBatchSize(entries, i, entryBatchSize, gameType, poolVersion, true);
    const batchEntries = entries.slice(i, i + size);
    const batchArgs = buildBatchArgs(gameType, poolVersion, batchEntries, true);
    batchNum += 1;
    const res = await runConvexCatalog(batchFn, batchArgs);
    console.log(
      `entries batch ${batchNum} count=${batchEntries.length} bytes=${convexPayloadBytes(batchArgs)} entryCount=${res?.entryCount}`
    );
    i += size;
  }
}

async function importRolloutBatches(batchFn, gameType, poolVersion, entries) {
  let batchNum = 0;
  let rolloutRows = 0;
  for (const entry of entries) {
    const summaries = entry.rolloutSummaries ?? [];
    for (let i = 0; i < summaries.length; ) {
      const { size, rollouts } = fitRolloutChunk(
        summaries,
        i,
        poolVersion,
        entry.seedId,
        WINDOWS_CONVEX_ARG_BUDGET
      );
      const batchArgs = { gameType, poolVersion, entries: [], rollouts, indexOnly: false };
      batchNum += 1;
      const res = await runConvexCatalog(batchFn, batchArgs);
      rolloutRows += rollouts.length;
      if (batchNum % 50 === 0 || batchNum === 1) {
        console.log(
          `rollouts batch ${batchNum} seed=${entry.seedId} chunk=${rollouts.length} bytes=${convexPayloadBytes(batchArgs)} entryCount=${res?.entryCount}`
        );
      }
      i += size;
    }
  }
  console.log(`rollouts import done: batches=${batchNum} rows=${rolloutRows}`);
}

function fitBatchSize(entries, start, maxSize, gameType, poolVersion, indexOnly) {
  let size = Math.min(maxSize, entries.length - start);
  if (process.platform !== "win32" || indexOnly) {
    return size;
  }
  while (size > 1) {
    const slice = entries.slice(start, start + size);
    if (
      convexPayloadBytes(buildBatchArgs(gameType, poolVersion, slice, indexOnly)) <=
      WINDOWS_CONVEX_ARG_BUDGET
    ) {
      return size;
    }
    size -= 1;
  }
  return 1;
}

async function clearPool(gameType, poolVersion) {
  console.log(`clearing catalog pool ${gameType}/${poolVersion}...`);
  const res = await clearSeedPoolFully(gameType, poolVersion);
  console.log("clear:", res);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.gameType) {
    console.error("missing required --game-type (block_blast | solitaire | match_3 | tower_arena)");
    process.exit(1);
  }
  const gameType = assertCatalogGameType(opts.gameType);

  if (!opts.index) {
    console.error("missing required --index <path-to-index.json>");
    process.exit(1);
  }

  const raw = await readFile(opts.index, "utf8");
  const index = JSON.parse(raw);
  const poolVersion = opts.poolVersion || index.poolVersion;
  if (!poolVersion) {
    console.error("missing poolVersion in index or --pool-version");
    process.exit(1);
  }

  let entries = index.entries ?? [];
  if (entries.length === 0) {
    console.error("no entries in index");
    process.exit(1);
  }

  if (opts.append && opts.clearFirst) {
    console.error("--append and --clear-first are mutually exclusive");
    process.exit(1);
  }

  if (opts.clearFirst) {
    await clearPool(gameType, poolVersion);
  }

  const batchFn = opts.append
    ? `${ADMIN}:importSeedPoolAppendBatch`
    : `${ADMIN}:importSeedPoolBatch`;

  if (opts.append) {
    const existing = await runConvexCatalog(`${QUERIES}:listSeedIdsInPool`, {
      gameType,
      poolVersion,
    });
    const existingSet = new Set(existing?.seedIds ?? []);
    const before = entries.length;
    if (!opts.updateExisting) {
      entries = entries.filter((e) => !existingSet.has(e.seedId));
    }
    console.log(
      `append: index has ${before} entries, ${existingSet.size} already in DB, importing ${entries.length}`
    );
    if (entries.length === 0) {
      const refreshed = await runConvexCatalog(`${ADMIN}:refreshSeedPoolMeta`, {
        gameType,
        poolVersion,
        generatedAt: index.generatedAt,
        rolloutCount: index.rolloutCount,
        matchTimeLimitSec: index.matchTimeLimitSec,
      });
      console.log("nothing new; meta refreshed:", refreshed);
      return;
    }
  }

  const batchSize = Math.max(1, opts.batchSize || defaultBatchSize(opts.indexOnly));
  const splitImport = needsSplitEntryRolloutImport(gameType, poolVersion, entries, opts.indexOnly);
  console.log(
    `import catalog gameType=${gameType} poolVersion=${poolVersion} mode=${opts.append ? "append" : "full"} entries=${entries.length} indexOnly=${opts.indexOnly} batchSize=${batchSize}${splitImport ? " (split: entries then rollout chunks)" : process.platform === "win32" && !opts.indexOnly ? " (win32 adaptive shrink)" : ""}`
  );

  if (!opts.append) {
    await runConvexCatalog(`${ADMIN}:importSeedPoolBegin`, {
      gameType,
      poolVersion,
      rolloutCount: index.rolloutCount ?? 40,
      matchTimeLimitSec: index.matchTimeLimitSec ?? 300,
      generatedAt: index.generatedAt ?? new Date().toISOString(),
    });
  }

  let batchNum = 0;
  if (splitImport) {
    await importEntryBatches(batchFn, gameType, poolVersion, entries, batchSize);
    await importRolloutBatches(batchFn, gameType, poolVersion, entries);
  } else {
    for (let i = 0; i < entries.length; ) {
      const size = fitBatchSize(entries, i, batchSize, gameType, poolVersion, opts.indexOnly);
      const batchEntries = entries.slice(i, i + size);
      const batchArgs = buildBatchArgs(gameType, poolVersion, batchEntries, opts.indexOnly);
      batchNum += 1;
      const res = await runConvexCatalog(batchFn, batchArgs);
      console.log(
        `batch ${batchNum} entries=${batchEntries.length} rollouts=${batchArgs.rollouts.length} bytes=${convexPayloadBytes(batchArgs)} entryCount=${res?.entryCount}`
      );
      i += size;
    }
  }

  if (opts.append) {
    const refreshed = await runConvexCatalog(`${ADMIN}:refreshSeedPoolMeta`, {
      gameType,
      poolVersion,
      generatedAt: index.generatedAt,
      rolloutCount: index.rolloutCount,
      matchTimeLimitSec: index.matchTimeLimitSec,
    });
    console.log("append done:", JSON.stringify(refreshed, null, 2));
  } else {
    const minEntries = opts.minEntries > 0 ? opts.minEntries : entries.length;
    const finalized = await runConvexCatalog(`${ADMIN}:importSeedPoolFinalize`, {
      gameType,
      poolVersion,
      minEntries,
    });
    console.log("finalize:", JSON.stringify(finalized, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
