#!/usr/bin/env node
/**
 * Import index.json into solitaireArena Convex (meta + entries + rollout child rows).
 *
 *   npx tsx scripts/solitaire/import-seed-pool-to-convex.mjs --index scripts/solitaire/output/pool-v2/index.json
 *   npx tsx scripts/solitaire/import-seed-pool-to-convex.mjs --index ... --min-entries 500 --batch-size 8
 *   npx tsx scripts/solitaire/import-seed-pool-to-convex.mjs --index ... --index-only
 *   npx tsx scripts/solitaire/import-seed-pool-to-convex.mjs --index ... --clear-first
 *   npx tsx scripts/solitaire/import-seed-pool-to-convex.mjs --index ... --append
 *   npx tsx scripts/solitaire/import-seed-pool-to-convex.mjs --index ... --append --update-existing
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  clearSeedPoolFully,
  convexPayloadBytes,
  runConvexSolitaire,
  WINDOWS_CONVEX_ARG_BUDGET,
} from "./run-convex-solitaire.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const ADMIN = "service/seedPool/solitaireSeedPoolAdmin";
const QUERIES = "service/seedPool/solitaireSeedPoolQueries";

function defaultBatchSize(indexOnly) {
  if (indexOnly) return 8;
  // Full import payloads include rolloutSummaries (~8–12KiB/seed on Windows).
  return process.platform === "win32" ? 2 : 8;
}

function parseArgs(argv) {
  const opts = {
    index: path.join(repoRoot, "scripts/solitaire/output/pool-v2/index.json"),
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
    if (a === "--index") opts.index = path.resolve(next());
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

function toEntryImport(e) {
  return {
    seedId: e.seedId,
    poolVersion: e.poolVersion,
    tier: e.tier,
    difficultyScore: e.difficultyScore,
    metrics: e.metrics,
  };
}

function buildBatchArgs(poolVersion, batchEntries, indexOnly) {
  const rollouts = indexOnly ? [] : flattenRollouts(batchEntries, poolVersion);
  return {
    poolVersion,
    entries: batchEntries.map(toEntryImport),
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

function singleEntryWithRolloutsBytes(poolVersion, entry, indexOnly) {
  return convexPayloadBytes(buildBatchArgs(poolVersion, [entry], indexOnly));
}

/** True when even one entry + all rollouts exceeds the argv budget. */
function needsSplitEntryRolloutImport(poolVersion, entries, indexOnly) {
  if (indexOnly) return false;
  const sample = entries[0];
  if (!sample) return false;
  return singleEntryWithRolloutsBytes(poolVersion, sample, false) > WINDOWS_CONVEX_ARG_BUDGET;
}

async function importEntryBatches(batchFn, poolVersion, entries, batchSize, indexOnly) {
  const entryBatchSize = indexOnly
    ? Math.max(batchSize, process.platform === "win32" ? 8 : 16)
    : batchSize;
  let batchNum = 0;
  for (let i = 0; i < entries.length; ) {
    const size = fitBatchSize(entries, i, entryBatchSize, poolVersion, true);
    const batchEntries = entries.slice(i, i + size);
    const batchArgs = buildBatchArgs(poolVersion, batchEntries, true);
    batchNum += 1;
    const res = await runConvexSolitaire(batchFn, batchArgs);
    console.log(
      `entries batch ${batchNum} count=${batchEntries.length} bytes=${convexPayloadBytes(batchArgs)} entryCount=${res?.entryCount}`
    );
    i += size;
  }
}

async function importRolloutBatches(batchFn, poolVersion, entries) {
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
      const batchArgs = { poolVersion, entries: [], rollouts, indexOnly: false };
      batchNum += 1;
      const res = await runConvexSolitaire(batchFn, batchArgs);
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

function fitBatchSize(entries, start, maxSize, poolVersion, indexOnly) {
  let size = Math.min(maxSize, entries.length - start);
  if (process.platform !== "win32" || indexOnly) {
    return size;
  }
  while (size > 1) {
    const slice = entries.slice(start, start + size);
    if (convexPayloadBytes(buildBatchArgs(poolVersion, slice, indexOnly)) <= WINDOWS_CONVEX_ARG_BUDGET) {
      return size;
    }
    size -= 1;
  }
  return 1;
}

async function clearPool(poolVersion) {
  console.log(`clearing pool ${poolVersion}...`);
  const res = await clearSeedPoolFully(poolVersion);
  console.log("clear:", res);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
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
    await clearPool(poolVersion);
  }

  const batchFn = opts.append
    ? `${ADMIN}:importSeedPoolAppendBatch`
    : `${ADMIN}:importSeedPoolBatch`;

  if (opts.append) {
    const existing = await runConvexSolitaire(`${QUERIES}:listSeedIdsInPool`, {
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
      const refreshed = await runConvexSolitaire(`${ADMIN}:refreshSeedPoolMeta`, {
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
  const splitImport = needsSplitEntryRolloutImport(poolVersion, entries, opts.indexOnly);
  console.log(
    `import poolVersion=${poolVersion} mode=${opts.append ? "append" : "full"} entries=${entries.length} indexOnly=${opts.indexOnly} batchSize=${batchSize}${splitImport ? " (split: entries then rollout chunks)" : process.platform === "win32" && !opts.indexOnly ? " (win32 adaptive shrink)" : ""}`
  );

  if (!opts.append) {
    await runConvexSolitaire(`${ADMIN}:importSeedPoolBegin`, {
      poolVersion,
      rolloutCount: index.rolloutCount ?? 40,
      matchTimeLimitSec: index.matchTimeLimitSec ?? 300,
      generatedAt: index.generatedAt ?? new Date().toISOString(),
    });
  }

  let batchNum = 0;
  if (splitImport) {
    await importEntryBatches(batchFn, poolVersion, entries, batchSize, true);
    await importRolloutBatches(batchFn, poolVersion, entries);
  } else {
    for (let i = 0; i < entries.length; ) {
      const size = fitBatchSize(entries, i, batchSize, poolVersion, opts.indexOnly);
      const batchEntries = entries.slice(i, i + size);
      const batchArgs = buildBatchArgs(poolVersion, batchEntries, opts.indexOnly);
      batchNum += 1;
      const res = await runConvexSolitaire(batchFn, batchArgs);
      console.log(
        `batch ${batchNum} entries=${batchEntries.length} rollouts=${batchArgs.rollouts.length} bytes=${convexPayloadBytes(batchArgs)} entryCount=${res?.entryCount}`
      );
      i += size;
    }
  }

  if (opts.append) {
    const refreshed = await runConvexSolitaire(`${ADMIN}:refreshSeedPoolMeta`, {
      poolVersion,
      generatedAt: index.generatedAt,
      rolloutCount: index.rolloutCount,
      matchTimeLimitSec: index.matchTimeLimitSec,
    });
    console.log("append done:", JSON.stringify(refreshed, null, 2));
  } else {
    const minEntries =
      opts.minEntries > 0 ? opts.minEntries : entries.length;
    const finalized = await runConvexSolitaire(`${ADMIN}:importSeedPoolFinalize`, {
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
