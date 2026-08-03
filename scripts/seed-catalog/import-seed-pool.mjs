#!/usr/bin/env node
/**
 * Import index.json into casualPlatform seed catalog (meta + entries + rollout rows).
 *
 *   npx tsx scripts/seed-catalog/import-seed-pool.mjs solitaire --clear-first
 *   npx tsx scripts/seed-catalog/import-seed-pool.mjs solitaire --limit 50 --clear-first
 *   npx tsx scripts/seed-catalog/import-seed-pool.mjs --game solitaire --index path/to/index.json
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertCatalogGameType } from "./catalog-game-types.mjs";
import {
  gameAliasHelp,
  normalizeGameAlias,
  resolveDefaultIndexPath,
} from "./default-pool-index.mjs";
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

function usage() {
  console.log(`Import seed pool index into Convex catalog

Usage:
  npx tsx scripts/seed-catalog/import-seed-pool.mjs <game> [options]
  npx tsx scripts/seed-catalog/import-seed-pool.mjs --game <game> [options]

Games: ${gameAliasHelp()}

Options:
  --game, --game-type <name>   game（与 positional 二选一）
  --index <path>               index.json（省略则用该 game 默认路径）
  --limit <n>                  按 easy/medium/hard 均分抽样 n 条（避免只抽到 easy）
  --clear-first                导入前清空该 poolVersion
  --append                     增量导入（跳过已有 seedId）
  --update-existing            append 时覆盖已有 seed
  --min-entries <n>            finalize 最少条数（默认=实际导入数）
  --batch-size <n>             批大小（Windows 含 rollout 建议 ≤2）
  --pool-version <v>           覆盖 index 内 poolVersion
  --index-only                 不写 rollout 子表

Examples:
  npx tsx scripts/seed-catalog/import-seed-pool.mjs solitaire --limit 50 --clear-first
  npm run portal:seed-pool:import -- solitaire --append
`);
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
    limit: 0,
    convexArgs: [],
  };
  const flags = [...argv];
  if (flags.length > 0 && !flags[0].startsWith("-")) {
    opts.gameType = flags.shift();
  }
  for (let i = 0; i < flags.length; i++) {
    const a = flags[i];
    const next = () => flags[++i];
    if (a === "--game-type" || a === "--game") opts.gameType = next();
    else if (a === "--index") opts.index = path.resolve(next());
    else if (a === "--batch-size") opts.batchSize = Number(next());
    else if (a === "--min-entries") opts.minEntries = Number(next());
    else if (a === "--limit") opts.limit = Number(next());
    else if (a === "--index-only") opts.indexOnly = true;
    else if (a === "--clear-first") opts.clearFirst = true;
    else if (a === "--append") opts.append = true;
    else if (a === "--update-existing") opts.updateExisting = true;
    else if (a === "--pool-version") opts.poolVersion = next();
    else if (a === "--prod") opts.convexArgs.push("--prod");
  }
  return opts;
}

function stratifyEntriesByTier(entries, limit) {
  const n = Math.floor(limit);
  if (n < 1) return [];
  const buckets = { easy: [], medium: [], hard: [], other: [] };
  for (const e of entries) {
    const t = e?.tier;
    if (t === "easy" || t === "medium" || t === "hard") buckets[t].push(e);
    else buckets.other.push(e);
  }
  const tiers = ["easy", "medium", "hard"].filter((t) => buckets[t].length > 0);
  if (tiers.length === 0) return entries.slice(0, n);

  const base = Math.floor(n / tiers.length);
  let rem = n - base * tiers.length;
  const picked = [];
  const counts = {};
  for (const t of tiers) {
    const take = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem -= 1;
    const slice = buckets[t].slice(0, Math.min(take, buckets[t].length));
    counts[t] = slice.length;
    picked.push(...slice);
  }
  if (picked.length < n && buckets.other.length > 0) {
    const extra = buckets.other.slice(0, n - picked.length);
    counts.other = extra.length;
    picked.push(...extra);
  }
  // 某档不足时从其它档补齐
  if (picked.length < n) {
    const used = new Set(picked.map((e) => e.seedId));
    for (const e of entries) {
      if (picked.length >= n) break;
      if (used.has(e.seedId)) continue;
      picked.push(e);
      used.add(e.seedId);
    }
  }
  console.log(`limit stratify: ${JSON.stringify(counts)} (total ${picked.length}/${entries.length})`);
  return picked;
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
  const out = {
    seedId: e.seedId,
    poolVersion,
    tier: e.tier,
    difficultyScore: e.difficultyScore,
    metrics: stripCatalogMetrics(e.metrics),
  };
  if (e.solvable === "solvable" || e.solvable === "unsolvable" || e.solvable === "unknown") {
    out.solvable = e.solvable;
    if (e.solvableSource === "empirical_completed" || e.solvableSource === "search") {
      out.solvableSource = e.solvableSource;
    }
    out.solvableReason = e.solvableReason ?? null;
  }
  return out;
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
  if (!opts.gameType || opts.gameType === "help" || opts.gameType === "-h" || opts.gameType === "--help") {
    usage();
    process.exit(opts.gameType ? 0 : 1);
  }

  const gameType = assertCatalogGameType(normalizeGameAlias(opts.gameType));

  if (!opts.index) {
    opts.index = await resolveDefaultIndexPath(repoRoot, gameType);
    if (!opts.index) {
      console.error(`no default index for game=${gameType}; pass --index`);
      process.exit(1);
    }
    console.log(`index: ${opts.index} (default)`);
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

  const indexEntryCount = entries.length;
  if (opts.limit > 0) {
    if (!Number.isFinite(opts.limit) || opts.limit < 1) {
      console.error("--limit must be a positive integer");
      process.exit(1);
    }
    entries = stratifyEntriesByTier(entries, opts.limit);
    console.log(`limit: using ${entries.length}/${indexEntryCount} entries from index`);
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
