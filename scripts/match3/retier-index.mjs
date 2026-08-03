#!/usr/bin/env node
/**
 * Re-assign easy/medium/hard tiers on an existing index.json (no rollout re-sim).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const indexPath =
  process.argv[2] ?? path.join(repoRoot, "scripts/match3/output/pool-v1/index.json");

const { assignTiers } = await import(
  pathToFileURL(
    path.join(repoRoot, "src/convex/match3Arena/convex/service/seedPool/match3SeedDifficulty.ts")
  ).href
);

const raw = JSON.parse(await readFile(indexPath, "utf8"));
const poolVersion = raw.poolVersion ?? "v1";
const candidates = (raw.entries ?? []).map((e) => ({
  seedId: e.seedId,
  poolVersion,
  difficultyScore: e.difficultyScore ?? e.metrics?.scoreP50 ?? 0,
  metrics: e.metrics,
  rolloutSummaries: e.rolloutSummaries ?? [],
}));
const tiered = assignTiers(candidates);
raw.entries = tiered;

const tierIndex = { easy: [], medium: [], hard: [] };
for (const e of tiered) tierIndex[e.tier].push(e.seedId);
const counts = {
  easy: tierIndex.easy.length,
  medium: tierIndex.medium.length,
  hard: tierIndex.hard.length,
};

const outDir = path.dirname(indexPath);
await writeFile(indexPath, JSON.stringify(raw, null, 2));
await writeFile(path.join(outDir, "tier-index.json"), JSON.stringify(tierIndex, null, 2));
console.log(`retiered ${tiered.length} entries -> ${counts.easy} easy / ${counts.medium} medium / ${counts.hard} hard`);
