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

import { runConvexSolitaire } from "./run-convex-solitaire.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const ADMIN = "service/seedPool/solitaireSeedPoolAdmin";
const QUERIES = "service/seedPool/solitaireSeedPoolQueries";

function parseArgs(argv) {
  const opts = {
    index: path.join(repoRoot, "scripts/solitaire/output/pool-v2/index.json"),
    batchSize: 8,
    minEntries: 1,
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

async function clearPool(poolVersion) {
  console.log(`clearing pool ${poolVersion}...`);
  const res = await runConvexSolitaire(`${ADMIN}:clearSeedPoolVersion`, { poolVersion });
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

  console.log(
    `import poolVersion=${poolVersion} mode=${opts.append ? "append" : "full"} entries=${entries.length} indexOnly=${opts.indexOnly} batchSize=${opts.batchSize}`
  );

  if (!opts.append) {
    await runConvexSolitaire(`${ADMIN}:importSeedPoolBegin`, {
      poolVersion,
      rolloutCount: index.rolloutCount ?? 40,
      matchTimeLimitSec: index.matchTimeLimitSec ?? 300,
      generatedAt: index.generatedAt ?? new Date().toISOString(),
    });
  }

  const batchSize = Math.max(1, opts.batchSize);
  const totalBatches = Math.ceil(entries.length / batchSize);

  for (let i = 0; i < entries.length; i += batchSize) {
    const batchEntries = entries.slice(i, i + batchSize);
    const rollouts = opts.indexOnly
      ? []
      : flattenRollouts(batchEntries, poolVersion);
    const batchNum = Math.floor(i / batchSize) + 1;
    const res = await runConvexSolitaire(batchFn, {
      poolVersion,
      entries: batchEntries.map(toEntryImport),
      rollouts,
      indexOnly: opts.indexOnly,
    });
    console.log(
      `batch ${batchNum}/${totalBatches} entries=${batchEntries.length} rollouts=${rollouts.length} entryCount=${res?.entryCount}`
    );
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
    const finalized = await runConvexSolitaire(`${ADMIN}:importSeedPoolFinalize`, {
      poolVersion,
      minEntries: opts.minEntries,
    });
    console.log("finalize:", JSON.stringify(finalized, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
