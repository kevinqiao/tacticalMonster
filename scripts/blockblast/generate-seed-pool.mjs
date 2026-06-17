#!/usr/bin/env node
/**
 * 生成 Block Blast 离线 rollout 种子池（与 scripts/solitaire/generate-seed-pool.mjs 对齐）。
 * 默认 matchSeconds=300，与真实 5 分钟休闲对局一致；推荐经 seed-pool.mjs create 调用。
 * v3 挑战+易上瘾参数：scripts/blockblast/README.md
 *
 * Index-only（默认）：仅 metrics，rolloutSummaries=[]。
 * --write-rollout-summaries：在 index.json 写入 rolloutSummaries（磁盘无 ops）。
 * --write-rollout-files：summaries + rollouts/*.json 全 ops + replayPacingMs。
 *
 * 增量：同 --out 重跑 --resume 从上次扫描的种子 index 之后继续并合并。
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadPoolDefaults } from "./blockblast-pool-defaults.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const DEFAULT_TOTAL = 5000;

function parseArgs(argv) {
  const opts = {
    version: "v1",
    count: DEFAULT_TOTAL,
    start: 0,
    rollouts: 1,
    matchSeconds: 300,
    out: path.join(repoRoot, "scripts/blockblast/output/pool-v1"),
    rejectDead: true,
    tierEasy: 0.3,
    tierMedium: 0.4,
    progressEvery: 100,
    resume: false,
    rebuildIndexOnly: false,
    minOpeningMoves: 0,
    maxOpeningMoves: 0,
    minScoreP25: 0,
    minScoreSpread: 0,
    rejectCollapsed: false,
    quickScreenRollouts: 1,
    oversampleFactor: 1,
    thinkTimeScale: 0,
    maxStuckRate: 0,
    writeRolloutSummaries: false,
    writeRolloutFiles: false,
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
    else if (a === "--resume") opts.resume = true;
    else if (a === "--append") opts.resume = true;
    else if (a === "--rebuild-index-only") opts.rebuildIndexOnly = true;
    else if (a === "--min-opening-moves") opts.minOpeningMoves = Number(next());
    else if (a === "--max-opening-moves") opts.maxOpeningMoves = Number(next());
    else if (a === "--min-score-p25") opts.minScoreP25 = Number(next());
    else if (a === "--min-score-spread") opts.minScoreSpread = Number(next());
    else if (a === "--reject-collapsed") opts.rejectCollapsed = true;
    else if (a === "--quick-screen-rollouts") opts.quickScreenRollouts = Number(next());
    else if (a === "--oversample-factor") opts.oversampleFactor = Number(next());
    else if (a === "--think-time-scale") opts.thinkTimeScale = Number(next());
    else if (a === "--max-stuck-rate") opts.maxStuckRate = Number(next());
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
    }
  }
  return opts;
}

function playerFriendlyOpts(opts) {
  return {
    minOpeningMoves: opts.minOpeningMoves,
    maxOpeningMoves: opts.maxOpeningMoves,
    minScoreP25: opts.minScoreP25,
    minScoreSpread: opts.minScoreSpread,
    rejectCollapsed: opts.rejectCollapsed,
    quickScreenRollouts: opts.quickScreenRollouts,
    maxStuckRate: opts.maxStuckRate,
  };
}

function seedIdToFilename(seedId) {
  return seedId.replace(/:/g, "-") + ".json";
}

function parseSeedIndexFromFilename(name, poolVersion) {
  const prefix = `blockblast-pool-${poolVersion}-`;
  if (!name.startsWith(prefix) || !name.endsWith(".json")) return null;
  const n = Number(name.slice(prefix.length, -5));
  return Number.isFinite(n) ? n : null;
}

async function loadExistingIndex(outDir) {
  const indexPath = path.join(outDir, "index.json");
  try {
    const raw = await readFile(indexPath, "utf8");
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
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseSeedIndexFromSeedId(seedId, poolVersion) {
  const prefix = `blockblast-pool:${poolVersion}:`;
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
    const seedId = `blockblast-pool:${poolVersion}:${idx}`;
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
    "src/convex/blockBlast/convex/service/seedPool/blockBlastSeedDifficulty.ts"
  );
  const { buildTierIndex } = await import(pathToFileURL(difficultyPath).href);
  const generatedAt = new Date().toISOString();
  const tierIndex = buildTierIndex(retiered, opts.version, opts.rollouts, generatedAt);

  const tierCounts = { easy: 0, medium: 0, hard: 0 };
  for (const e of retiered) tierCounts[e.tier] += 1;

  await writeFile(
    path.join(opts.out, "index.json"),
    JSON.stringify(
      {
        poolVersion: opts.version,
        rolloutCount: opts.rollouts,
        matchTimeLimitSec: opts.matchSeconds,
        generatedAt,
        entries: retiered,
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(
    path.join(opts.out, "rejected.json"),
    JSON.stringify(mergedRejected, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(opts.out, "tier-index.json"),
    JSON.stringify(tierIndex, null, 2),
    "utf8"
  );
  return tierCounts;
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
    "src/convex/blockBlast/convex/service/seedPool/blockBlastSeedPoolRunner.ts"
  );
  const runner = await import(pathToFileURL(runnerPath).href);
  const { processOneSeed } = runner;

  const difficultyPath = path.join(
    repoRoot,
    "src/convex/blockBlast/convex/service/seedPool/blockBlastSeedDifficulty.ts"
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

  if (opts.resume) {
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
    opts.start = maxIdx + 1;
    console.log(
      `resume: existing accepted=${existingEntries.length} rejected=${existingRejected.length} continue from seed index ${opts.start}`
    );
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
  const scanEnd = opts.start + candidateCount;

  console.log("== Block Blast seed pool generate ==");
  console.log(
    `version=${opts.version} start=${opts.start} target=${targetAccepted} candidates=${candidateCount} rollouts=${opts.rollouts} matchSeconds=${opts.matchSeconds} thinkTimeScale=${opts.thinkTimeScale || "default"}`
  );
  console.log(
    `out=${opts.out} summaries=${opts.writeRolloutSummaries} rolloutFiles=${opts.writeRolloutFiles}`
  );
  if (
    opts.minOpeningMoves > 0 ||
    opts.maxOpeningMoves > 0 ||
    opts.minScoreP25 > 0 ||
    opts.minScoreSpread > 0 ||
    opts.rejectCollapsed ||
    opts.maxStuckRate > 0
  ) {
    console.log(
      `playerFriendly: minOpening=${opts.minOpeningMoves} maxOpening=${opts.maxOpeningMoves} minP25=${opts.minScoreP25} minSpread=${opts.minScoreSpread} maxStuckRate=${opts.maxStuckRate || "off"} rejectCollapsed=${opts.rejectCollapsed} quickK=${opts.quickScreenRollouts}`
    );
  }
  if (opts.oversampleFactor > 1) {
    console.log(`oversampleFactor=${opts.oversampleFactor}`);
  }

  const existingRejected =
    opts.resume || opts.start > 0 ? await loadExistingRejected(opts.out) : [];

  let existingEntries =
    opts.resume || opts.start > 0 ? await loadExistingIndex(opts.out) : [];
  if (opts.start > 0 && existingEntries.length === 0) {
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

  const seenFingerprints = new Set([
    ...fingerprintsFromRecords(existingEntries),
    ...fingerprintsFromRecords(existingRejected),
  ]);
  const batchCandidates = [];
  const batchRejected = [];

  const t0 = Date.now();
  const oneSeedOpts = {
    poolVersion: opts.version,
    rejectDead: opts.rejectDead,
    rolloutCount: opts.rollouts,
    matchSeconds: opts.matchSeconds,
    thinkTimeScale: opts.thinkTimeScale > 0 ? opts.thinkTimeScale : undefined,
    playerFriendly: playerFriendlyOpts(opts),
    writeRolloutSummaries: opts.writeRolloutSummaries,
    writeRolloutFiles: opts.writeRolloutFiles,
  };

  for (let i = opts.start; i < scanEnd; i++) {
    console.log = () => {};
    const result = processOneSeed(i, oneSeedOpts, seenFingerprints);
    console.log = log;

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
        await writeFile(file, JSON.stringify({ seedId, rollouts }, null, 2), "utf8");
      }
      batchCandidates.push(result.candidate);
    }

    const done = i - opts.start + 1;
    if (opts.progressEvery > 0 && done % opts.progressEvery === 0) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `progress ${done}/${candidateCount} accepted=${batchCandidates.length} rejected=${batchRejected.length} elapsed=${elapsed}s`
      );
    }
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
    })),
    ...trimmedBatch,
  ];

  const retiered = assignTiers(mergedCandidates, {
    easy: opts.tierEasy,
    medium: opts.tierMedium,
  });
  const tierCounts = await writePoolOutputs(opts, retiered, mergedRejected);

  const rejectReasons = {};
  for (const e of mergedRejected) {
    rejectReasons[e.reason] = (rejectReasons[e.reason] ?? 0) + 1;
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`done in ${elapsed}s`);
  console.log(`accepted=${retiered.length} rejected=${mergedRejected.length}`);
  if (mergedRejected.length > 0) {
    console.log(`reject reasons: ${JSON.stringify(rejectReasons)}`);
  }
  if (retiered.length === 0 && opts.rejectDead) {
    console.log(
      "hint: all seeds may be dead_layout (scoreMax<1). Try --reject-dead false or scan more indices."
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
