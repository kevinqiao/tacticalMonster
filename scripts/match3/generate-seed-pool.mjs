#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

async function loadRunner() {
  const mod = await import(
    pathToFileURL(
      path.join(repoRoot, "src/convex/match3Arena/convex/service/seedPool/match3SeedPoolRunner.ts")
    ).href
  );
  return mod;
}

function parseArgs(argv) {
  const opts = {
    version: "v1",
    count: 50,
    start: 1,
    rollouts: 60,
    matchSeconds: 300,
    out: path.join(repoRoot, "scripts/match3/output/pool-v1"),
    minOpeningMoves: 4,
    minScoreP25: 100,
    maxEarlyStuckRate: 0.35,
    minEarlyCascadeHitRate: 0.15,
    rejectLikelyDead: true,
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
    else if (a === "--min-opening-moves") opts.minOpeningMoves = Number(next());
    else if (a === "--min-score-p25") opts.minScoreP25 = Number(next());
    else if (a === "--max-early-stuck-rate") opts.maxEarlyStuckRate = Number(next());
    else if (a === "--min-early-cascade-hit-rate") opts.minEarlyCascadeHitRate = Number(next());
    else if (a === "--allow-likely-dead") opts.rejectLikelyDead = false;
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { generateSeedPoolBatch } = await loadRunner();
  const result = generateSeedPoolBatch({
    poolVersion: opts.version,
    start: opts.start,
    count: opts.count,
    rolloutCount: opts.rollouts,
    matchSeconds: opts.matchSeconds,
    minOpeningMoves: opts.minOpeningMoves,
    minScoreP25: opts.minScoreP25,
    maxEarlyStuckRate: opts.maxEarlyStuckRate,
    minEarlyCascadeHitRate: opts.minEarlyCascadeHitRate,
    rejectLikelyDead: opts.rejectLikelyDead,
  });

  await mkdir(opts.out, { recursive: true });
  const index = {
    poolVersion: opts.version,
    rolloutCount: opts.rollouts,
    matchTimeLimitSec: opts.matchSeconds,
    generatedAt: new Date().toISOString(),
    entries: result.entries,
  };
  await writeFile(path.join(opts.out, "index.json"), JSON.stringify(index, null, 2));
  await writeFile(path.join(opts.out, "rejected.json"), JSON.stringify(result.rejected, null, 2));

  const tierIndex = { easy: [], medium: [], hard: [] };
  for (const e of result.entries) {
    tierIndex[e.tier].push(e.seedId);
  }
  await writeFile(path.join(opts.out, "tier-index.json"), JSON.stringify(tierIndex, null, 2));

  console.log(
    `match3 pool generated: accepted=${result.entries.length} rejected=${result.rejected.length} -> ${opts.out}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
