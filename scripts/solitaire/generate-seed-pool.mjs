#!/usr/bin/env node
/**
 * Regenerate after Solitaire Cash scoring / human-stochastic-v4 bot changes.
 * Old index finalScore values are invalid — do not use --rebuild-index-only.
 *
 * Index-only (default): metrics only, rolloutSummaries=[].
 * --write-rollout-summaries: fill rolloutSummaries in index.json (no ops on disk).
 * --write-rollout-files: summaries + rollouts/*.json with full ops + replayPacingMs.
 *
 * Friendly pool: use --min-score-p25 with --rollouts 40 for band diversity (v4 personas).
 * Incremental: re-run with --resume (same --out) to continue after the last scanned
 * seed index and merge into existing index.json / rejected.json.
 *
 * Mid-run durability: writes checkpoint.json (+ rejected.json) every
 * --checkpoint-every scans (default = --progress-every). --resume reloads it.
 * All JSON writes are atomic (tmp + rename) so a kill cannot leave 0-byte files.
 */
import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadPoolDefaults } from "./solitaire-pool-defaults.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const DEFAULT_TOTAL = 5000;
const CHECKPOINT_FILE = "checkpoint.json";

function parseArgs(argv) {
  const opts = {
    version: "v2",
    count: DEFAULT_TOTAL,
    start: 0,
    rollouts: 1,
    matchSeconds: 300,
    out: path.join(repoRoot, "scripts/solitaire/output/pool-v2"),
    rejectDead: true,
    tierEasy: 0.3,
    tierMedium: 0.4,
    progressEvery: 100,
    /** 0 = same as progressEvery; <0 disables checkpointing */
    checkpointEvery: 0,
    resume: false,
    rebuildIndexOnly: false,
    minOpeningMoves: 0,
    minScoreP25: 0,
    minScoreSpread: 0,
    rejectCollapsed: false,
    quickScreenRollouts: 1,
    minFoundationCardsP25: 0,
    maxTimeToFirstFoundationP50: 0,
    oversampleFactor: 1,
    writeRolloutSummaries: false,
    writeRolloutFiles: false,
    checkSolvability: true,
    requireSolvable: false,
    solveMaxNodes: 50_000,
    solveTimeoutMs: 15_000,
    /** 0 = auto (needCandidates * 20 when --require-solvable) */
    maxScan: 0,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--version") opts.version = next();
    else if (a === "--count") opts.count = Number(next());
    else if (a === "--start") opts.start = Number(next());
    else if (a === "--rollouts") opts.rollouts = Number(next());
    else if (a === "--match-seconds") opts.matchSeconds = Number(next());
    else if (a === "--out") opts.out = path.resolve(next());
    else if (a === "--reject-dead") opts.rejectDead = next() !== "false";
    else if (a === "--tier-easy") opts.tierEasy = Number(next());
    else if (a === "--tier-medium") opts.tierMedium = Number(next());
    else if (a === "--progress-every") opts.progressEvery = Number(next());
    else if (a === "--checkpoint-every") opts.checkpointEvery = Number(next());
    else if (a === "--resume") opts.resume = true;
    else if (a === "--append") opts.resume = true;
    else if (a === "--rebuild-index-only") opts.rebuildIndexOnly = true;
    else if (a === "--min-opening-moves") opts.minOpeningMoves = Number(next());
    else if (a === "--min-score-p25") opts.minScoreP25 = Number(next());
    else if (a === "--min-score-spread") opts.minScoreSpread = Number(next());
    else if (a === "--reject-collapsed") opts.rejectCollapsed = true;
    else if (a === "--quick-screen-rollouts") opts.quickScreenRollouts = Number(next());
    else if (a === "--min-foundation-cards-p25") opts.minFoundationCardsP25 = Number(next());
    else if (a === "--max-time-to-first-foundation-p50")
      opts.maxTimeToFirstFoundationP50 = Number(next());
    else if (a === "--oversample-factor") opts.oversampleFactor = Number(next());
    else if (a === "--write-rollout-summaries") opts.writeRolloutSummaries = true;
    else if (a === "--write-rollout-files") {
      opts.writeRolloutSummaries = true;
      opts.writeRolloutFiles = true;
    } else if (a === "--index-only") {
      const indexOnly = next() !== "false";
      if (!indexOnly) {
        opts.writeRolloutSummaries = true;
        opts.writeRolloutFiles = true;
      }
    } else if (a === "--skip-solvability") opts.checkSolvability = false;
    else if (a === "--require-solvable") opts.requireSolvable = true;
    else if (a === "--solve-max-nodes") opts.solveMaxNodes = Number(next());
    else if (a === "--solve-timeout-ms") opts.solveTimeoutMs = Number(next());
    else if (a === "--max-scan") opts.maxScan = Number(next());
  }
  if (opts.requireSolvable) opts.checkSolvability = true;
  if (!Number.isFinite(opts.checkpointEvery) || opts.checkpointEvery === 0) {
    opts.checkpointEvery = opts.progressEvery;
  }
  return opts;
}

/** Atomic JSON write so a kill mid-write cannot leave a 0-byte / corrupt file. */
async function writeJsonAtomic(filePath, value) {
  const tmp = `${filePath}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  try {
    await rename(tmp, filePath);
  } catch {
    await unlink(filePath).catch(() => {});
    await rename(tmp, filePath);
  }
}

function playerFriendlyOpts(opts) {
  return {
    minOpeningMoves: opts.minOpeningMoves,
    minScoreP25: opts.minScoreP25,
    minScoreSpread: opts.minScoreSpread,
    rejectCollapsed: opts.rejectCollapsed,
    quickScreenRollouts: opts.quickScreenRollouts,
    minFoundationCardsP25: opts.minFoundationCardsP25,
    maxTimeToFirstFoundationP50: opts.maxTimeToFirstFoundationP50,
  };
}

function seedIdToFilename(seedId) {
  return seedId.replace(/:/g, "-") + ".json";
}

function parseSeedIndexFromFilename(name, poolVersion) {
  const prefix = `solitaire-pool-${poolVersion}-`;
  if (!name.startsWith(prefix) || !name.endsWith(".json")) return null;
  const n = Number(name.slice(prefix.length, -5));
  return Number.isFinite(n) ? n : null;
}

async function loadExistingIndex(outDir) {
  const indexPath = path.join(outDir, "index.json");
  try {
    const raw = await readFile(indexPath, "utf8");
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch {
    return [];
  }
}

async function loadExistingRejected(outDir) {
  const rejectedPath = path.join(outDir, "rejected.json");
  try {
    const raw = await readFile(rejectedPath, "utf8");
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadCheckpoint(outDir, poolVersion) {
  const checkpointPath = path.join(outDir, CHECKPOINT_FILE);
  try {
    const raw = await readFile(checkpointPath, "utf8");
    if (!raw.trim()) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.poolVersion !== poolVersion) return null;
    if (!Array.isArray(parsed.batchCandidates) || !Array.isArray(parsed.batchRejected)) {
      return null;
    }
    if (!Number.isFinite(parsed.lastScannedIndex)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function clearCheckpoint(outDir) {
  await unlink(path.join(outDir, CHECKPOINT_FILE)).catch(() => {});
}

function parseSeedIndexFromSeedId(seedId, poolVersion) {
  const prefix = `solitaire-pool:${poolVersion}:`;
  if (!seedId.startsWith(prefix)) return null;
  const n = Number(seedId.slice(prefix.length));
  return Number.isFinite(n) ? n : null;
}

function maxSeedIndexFromRecords(records, poolVersion) {
  let max = -1;
  for (const e of records) {
    const idx = parseSeedIndexFromSeedId(e.seedId, poolVersion);
    if (idx != null && idx > max) max = idx;
  }
  return max;
}

function fingerprintsFromRecords(records) {
  const seen = new Set();
  for (const e of records) {
    const fp = e.metrics?.layoutFingerprint;
    if (fp) seen.add(fp);
  }
  return seen;
}

async function scanRolloutIndices(rolloutsDir, poolVersion) {
  let files;
  try {
    files = await readdir(rolloutsDir);
  } catch {
    return [];
  }
  const indices = [];
  for (const f of files) {
    const idx = parseSeedIndexFromFilename(f, poolVersion);
    if (idx != null) indices.push(idx);
  }
  indices.sort((a, b) => a - b);
  return indices;
}

async function rebuildCandidatesFromRollouts(rolloutsDir, poolVersion, matchSeconds, runner) {
  const indices = await scanRolloutIndices(rolloutsDir, poolVersion);
  const { candidateFromRollouts, layoutContextForSeed } = runner;

  const candidates = [];
  for (const idx of indices) {
    const seedId = `solitaire-pool:${poolVersion}:${idx}`;
    const file = path.join(rolloutsDir, seedIdToFilename(seedId));
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    const rollouts = parsed.rollouts ?? [];
    candidates.push(
      candidateFromRollouts(
        seedId,
        poolVersion,
        rollouts,
        layoutContextForSeed(seedId, matchSeconds)
      )
    );
  }
  return candidates;
}

async function writePoolOutputs(opts, retiered, mergedRejected) {
  const difficultyPath = path.join(
    repoRoot,
    "src/convex/solitaireArena/convex/service/seedPool/solitaireSeedDifficulty.ts"
  );
  const { buildTierIndex } = await import(pathToFileURL(difficultyPath).href);
  const generatedAt = new Date().toISOString();
  const tierIndex = buildTierIndex(retiered, opts.version, opts.rollouts, generatedAt);

  const tierCounts = { easy: 0, medium: 0, hard: 0 };
  for (const e of retiered) tierCounts[e.tier] += 1;

  await writeJsonAtomic(path.join(opts.out, "index.json"), {
    poolVersion: opts.version,
    rolloutCount: opts.rollouts,
    matchTimeLimitSec: opts.matchSeconds,
    generatedAt,
    entries: retiered,
  });
  await writeJsonAtomic(path.join(opts.out, "rejected.json"), mergedRejected);
  await writeJsonAtomic(path.join(opts.out, "tier-index.json"), tierIndex);
  return tierCounts;
}

async function writeRunCheckpoint(args) {
  const {
    outDir,
    poolVersion,
    lastScannedIndex,
    targetAccepted,
    candidateCount,
    batchCandidates,
    batchRejected,
    existingRejected,
    matchSeconds,
    rollouts,
  } = args;
  await writeJsonAtomic(path.join(outDir, CHECKPOINT_FILE), {
    poolVersion,
    updatedAt: new Date().toISOString(),
    lastScannedIndex,
    targetAccepted,
    candidateCount,
    matchSeconds,
    rollouts,
    batchCandidates,
    batchRejected,
  });
  // Persist rejects early so resume can advance seed index even if checkpoint is lost.
  await writeJsonAtomic(path.join(outDir, "rejected.json"), [
    ...existingRejected,
    ...batchRejected,
  ]);
}

async function main() {
  const argv = process.argv.slice(2);
  const defaults = await loadPoolDefaults(repoRoot);
  const opts = parseArgs(argv);
  if (!argv.includes("--version")) opts.version = defaults.poolVersion;
  if (!argv.includes("--out")) opts.out = defaults.outDir;
  const log = console.log;
  console.log = () => {};

  const runnerPath = path.join(
    repoRoot,
    "src/convex/solitaireArena/convex/service/seedPool/solitaireSeedPoolRunner.ts"
  );
  const runner = await import(pathToFileURL(runnerPath).href);
  const { processOneSeed } = runner;

  const difficultyPath = path.join(
    repoRoot,
    "src/convex/solitaireArena/convex/service/seedPool/solitaireSeedDifficulty.ts"
  );
  const { assignTiers, selectTopCandidatesByPlayerEase } = await import(
    pathToFileURL(difficultyPath).href
  );

  console.log = log;

  await mkdir(opts.out, { recursive: true });

  const rolloutsDir = path.join(opts.out, "rollouts");
  if (opts.writeRolloutFiles) {
    await mkdir(rolloutsDir, { recursive: true });
  }

  /** In-progress batch restored from checkpoint.json (same create invocation). */
  let restoredCheckpoint = null;
  if (opts.resume) {
    restoredCheckpoint = await loadCheckpoint(opts.out, opts.version);
    const existingEntries = await loadExistingIndex(opts.out);
    const existingRejected = await loadExistingRejected(opts.out);
    let maxIdx = maxSeedIndexFromRecords(existingEntries, opts.version);
    maxIdx = Math.max(maxIdx, maxSeedIndexFromRecords(existingRejected, opts.version));
    if (opts.writeRolloutFiles) {
      const indices = await scanRolloutIndices(rolloutsDir, opts.version);
      if (indices.length > 0) {
        maxIdx = Math.max(maxIdx, indices[indices.length - 1]);
      }
    }
    if (restoredCheckpoint) {
      maxIdx = Math.max(maxIdx, restoredCheckpoint.lastScannedIndex);
      opts.start = restoredCheckpoint.lastScannedIndex + 1;
      console.log(
        `resume checkpoint: lastScanned=${restoredCheckpoint.lastScannedIndex} ` +
          `batchAccepted=${restoredCheckpoint.batchCandidates.length} ` +
          `batchRejected=${restoredCheckpoint.batchRejected.length} ` +
          `continue from seed index ${opts.start}`
      );
    } else {
      opts.start = maxIdx + 1;
      console.log(
        `resume: existing accepted=${existingEntries.length} rejected=${existingRejected.length} continue from seed index ${opts.start}`
      );
    }
  }

  if (opts.rebuildIndexOnly) {
    console.log("== Rebuild index ==");
    let candidates;
    if (opts.writeRolloutFiles) {
      candidates = await rebuildCandidatesFromRollouts(
        rolloutsDir,
        opts.version,
        opts.matchSeconds,
        runner
      );
    } else {
      const existing = await loadExistingIndex(opts.out);
      candidates = existing.map((e) => ({
        seedId: e.seedId,
        poolVersion: e.poolVersion,
        difficultyScore: e.difficultyScore,
        metrics: e.metrics,
        rolloutSummaries: e.rolloutSummaries ?? [],
      }));
    }
    const retiered = assignTiers(candidates, {
      easy: opts.tierEasy,
      medium: opts.tierMedium,
    });
    const rejected = await loadExistingRejected(opts.out);
    const tierCounts = await writePoolOutputs(opts, retiered, rejected);
    console.log(`rebuilt index: accepted=${retiered.length}`);
    console.log(
      `tiers: easy=${tierCounts.easy} medium=${tierCounts.medium} hard=${tierCounts.hard}`
    );
    return;
  }

  const targetAccepted = opts.count;
  const candidateCount = Math.ceil(targetAccepted * Math.max(1, opts.oversampleFactor));
  const maxScan =
    opts.maxScan > 0
      ? opts.maxScan
      : opts.requireSolvable
        ? Math.max(candidateCount * 20, candidateCount)
        : candidateCount;
  const scanEnd = opts.start + maxScan;

  console.log("== Solitaire seed pool generate ==");
  console.log(
    `version=${opts.version} start=${opts.start} target=${targetAccepted} candidates=${candidateCount} rollouts=${opts.rollouts} matchSeconds=${opts.matchSeconds}`
  );
  console.log(
    `out=${opts.out} summaries=${opts.writeRolloutSummaries} rolloutFiles=${opts.writeRolloutFiles} ` +
      `solvability=${opts.checkSolvability} requireSolvable=${opts.requireSolvable} ` +
      `solveMaxNodes=${opts.solveMaxNodes} solveTimeoutMs=${opts.solveTimeoutMs} maxScan=${maxScan} ` +
      `checkpointEvery=${opts.checkpointEvery}`
  );
  if (
    opts.minOpeningMoves > 0 ||
    opts.minScoreP25 > 0 ||
    opts.minScoreSpread > 0 ||
    opts.rejectCollapsed ||
    opts.minFoundationCardsP25 > 0 ||
    opts.maxTimeToFirstFoundationP50 > 0
  ) {
    console.log(
      `playerFriendly: minOpening=${opts.minOpeningMoves} minP25=${opts.minScoreP25} minSpread=${opts.minScoreSpread} rejectCollapsed=${opts.rejectCollapsed} ` +
        `minFoundationP25=${opts.minFoundationCardsP25} maxTimeToFirstFoundationP50=${opts.maxTimeToFirstFoundationP50} quickK=${opts.quickScreenRollouts}`
    );
  }
  if (opts.oversampleFactor > 1) {
    console.log(`oversampleFactor=${opts.oversampleFactor}`);
  }

  let existingRejected =
    opts.resume || opts.start > 0 ? await loadExistingRejected(opts.out) : [];

  let existingEntries =
    opts.resume || opts.start > 0 ? await loadExistingIndex(opts.out) : [];
  if (opts.start > 0 && existingEntries.length === 0 && !restoredCheckpoint) {
    console.log("rebuilding partial index from existing rollout files...");
    existingEntries = await rebuildCandidatesFromRollouts(
      rolloutsDir,
      opts.version,
      opts.matchSeconds,
      runner
    );
    const retiered = assignTiers(
      existingEntries.map((e) => ({
        seedId: e.seedId,
        poolVersion: e.poolVersion,
        difficultyScore: e.difficultyScore,
        metrics: e.metrics,
        rolloutSummaries: e.rolloutSummaries,
      })),
      { easy: opts.tierEasy, medium: opts.tierMedium }
    );
    await writePoolOutputs(opts, retiered, existingRejected);
  }

  const batchCandidates = restoredCheckpoint
    ? [...restoredCheckpoint.batchCandidates]
    : [];
  const batchRejected = restoredCheckpoint
    ? [...restoredCheckpoint.batchRejected]
    : [];

  // Checkpoint also flushes rejected.json = prior + batch; strip batch ids so final merge
  // does not double-count when --resume reloads both.
  if (restoredCheckpoint && batchRejected.length > 0) {
    const batchRejectIds = new Set(batchRejected.map((e) => e.seedId));
    existingRejected = existingRejected.filter((e) => !batchRejectIds.has(e.seedId));
  }

  const seenFingerprints = new Set([
    ...fingerprintsFromRecords(existingEntries),
    ...fingerprintsFromRecords(existingRejected),
    ...fingerprintsFromRecords(batchCandidates),
    ...fingerprintsFromRecords(batchRejected),
  ]);

  const t0 = Date.now();
  const oneSeedOpts = {
    poolVersion: opts.version,
    rejectDead: opts.rejectDead,
    rolloutCount: opts.rollouts,
    matchSeconds: opts.matchSeconds,
    playerFriendly: playerFriendlyOpts(opts),
    writeRolloutSummaries: opts.writeRolloutSummaries,
    writeRolloutFiles: opts.writeRolloutFiles,
    checkSolvability: opts.checkSolvability,
    requireSolvable: opts.requireSolvable,
    solveOpts: {
      maxNodes: opts.solveMaxNodes,
      timeoutMs: opts.solveTimeoutMs,
    },
  };

  // Fixed window by default; with --require-solvable keep scanning until enough accepted.
  // Checkpoint-restored candidates already count toward the quota.
  const stopWhenAccepted = opts.requireSolvable ? candidateCount : Infinity;
  let lastScannedIndex = restoredCheckpoint?.lastScannedIndex ?? opts.start - 1;
  let checkpointWrites = 0;

  const persistCheckpoint = async (reason) => {
    if (opts.checkpointEvery < 0) return;
    await writeRunCheckpoint({
      outDir: opts.out,
      poolVersion: opts.version,
      lastScannedIndex,
      targetAccepted,
      candidateCount,
      batchCandidates,
      batchRejected,
      existingRejected,
      matchSeconds: opts.matchSeconds,
      rollouts: opts.rollouts,
    });
    checkpointWrites += 1;
    console.log(
      `checkpoint[${reason}] lastScanned=${lastScannedIndex} ` +
        `batchAccepted=${batchCandidates.length}/${candidateCount} ` +
        `batchRejected=${batchRejected.length} → ${path.join(opts.out, CHECKPOINT_FILE)}`
    );
  };

  const onSignal = (signal) => {
    console.log(`\n${signal}: flushing checkpoint before exit...`);
    void persistCheckpoint(signal)
      .catch((e) => console.error("checkpoint flush failed", e))
      .finally(() => process.exit(130));
  };
  process.once("SIGINT", () => onSignal("SIGINT"));
  process.once("SIGTERM", () => onSignal("SIGTERM"));

  for (let i = opts.start; i < scanEnd; i++) {
    if (batchCandidates.length >= stopWhenAccepted) break;

    console.log = () => {};
    const result = processOneSeed(i, oneSeedOpts, seenFingerprints);
    console.log = log;
    lastScannedIndex = i;

    if (result.kind === "rejected") {
      batchRejected.push(result.entry);
    } else {
      if (opts.writeRolloutFiles && result.rollouts.length > 0) {
        const { seedId, rollouts } = {
          seedId: result.candidate.seedId,
          rollouts: result.rollouts,
        };
        await mkdir(rolloutsDir, { recursive: true });
        const file = path.join(rolloutsDir, seedIdToFilename(seedId));
        await writeJsonAtomic(file, { seedId, rollouts });
      }
      batchCandidates.push(result.candidate);
    }

    const done = i - opts.start + 1;
    if (opts.progressEvery > 0 && done % opts.progressEvery === 0) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      const goal = opts.requireSolvable
        ? `${batchCandidates.length}/${candidateCount}`
        : `${done}/${candidateCount}`;
      console.log(
        `progress scanned=${done}/${maxScan} accepted=${goal} rejected=${batchRejected.length} elapsed=${elapsed}s`
      );
    }
    if (opts.checkpointEvery > 0 && done % opts.checkpointEvery === 0) {
      await persistCheckpoint("periodic");
    }
  }

  if (opts.requireSolvable && batchCandidates.length < candidateCount) {
    console.log(
      `warn: require-solvable only accepted ${batchCandidates.length}/${candidateCount} before maxScan=${maxScan}; ` +
        `raise --max-scan or --solve-max-nodes / --solve-timeout-ms`
    );
  }

  const trimmedBatch =
    opts.oversampleFactor > 1
      ? selectTopCandidatesByPlayerEase(batchCandidates, targetAccepted)
      : batchCandidates;

  if (opts.oversampleFactor > 1 && batchCandidates.length > trimmedBatch.length) {
    console.log(
      `oversample: kept ${trimmedBatch.length}/${batchCandidates.length} by playerEaseScore`
    );
  }

  const mergedRejected = [...existingRejected, ...batchRejected];
  const mergedCandidates = [
    ...existingEntries.map((e) => ({
      seedId: e.seedId,
      poolVersion: e.poolVersion,
      difficultyScore: e.difficultyScore,
      metrics: e.metrics,
      rolloutSummaries: e.rolloutSummaries,
      solvable: e.solvable,
      solvableSource: e.solvableSource,
      solvableReason: e.solvableReason,
    })),
    ...trimmedBatch,
  ];

  const retiered = assignTiers(mergedCandidates, {
    easy: opts.tierEasy,
    medium: opts.tierMedium,
  });
  const tierCounts = await writePoolOutputs(opts, retiered, mergedRejected);
  await clearCheckpoint(opts.out);

  const rejectReasons = {};
  for (const e of mergedRejected) {
    rejectReasons[e.reason] = (rejectReasons[e.reason] ?? 0) + 1;
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`done in ${elapsed}s`);
  console.log(
    `accepted=${retiered.length} rejected=${mergedRejected.length} checkpoints=${checkpointWrites}`
  );
  if (mergedRejected.length > 0) {
    console.log(`reject reasons: ${JSON.stringify(rejectReasons)}`);
  }
  if (retiered.length === 0 && opts.rejectDead) {
    console.log(
      "hint: all seeds may be dead_layout (scoreMax<0). Try --reject-dead false or scan more indices."
    );
  }
  if (retiered.length === 0 && (opts.minOpeningMoves > 0 || opts.minScoreSpread > 0 || opts.rejectCollapsed)) {
    console.log(
      "hint: friendly filters may reject everything. Prefer --min-score-p25 200 with --rollouts 1; " +
        "avoid --min-score-spread / --reject-collapsed unless --rollouts >= 8."
    );
  }
  if (retiered.length === 0 && opts.minOpeningMoves >= 3) {
    console.log("hint: --min-opening-moves 3+ is very strict; most layouts have 0-2 opening moves.");
  }
  if (opts.requireSolvable && (rejectReasons.not_solvable ?? 0) > 0 && retiered.length < targetAccepted) {
    console.log(
      "hint: many not_solvable rejects are budget timeouts (unknown), not proven dead. " +
        "Try --solve-max-nodes 200000 --solve-timeout-ms 30000 or higher --max-scan."
    );
  }
  console.log(
    `tiers: easy=${tierCounts.easy} medium=${tierCounts.medium} hard=${tierCounts.hard}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
