#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.floor(p * (sorted.length - 1));
  return sorted[idx];
}

function quantilesFromScores(scores) {
  const sorted = [...scores].sort((a, b) => a - b);
  return {
    p10: percentile(sorted, 0.1),
    p25: percentile(sorted, 0.25),
    p30: percentile(sorted, 0.3),
    p33: percentile(sorted, 0.33),
    p50: percentile(sorted, 0.5),
    p66: percentile(sorted, 0.66),
    p70: percentile(sorted, 0.7),
    p75: percentile(sorted, 0.75),
    p90: percentile(sorted, 0.9),
  };
}

async function main() {
  const inDir =
    process.argv[2] ??
    path.join(repoRoot, "scripts/blockblast/output/pool-v3");
  const indexPath = path.join(inDir, "index.json");
  const raw = JSON.parse(await readFile(indexPath, "utf8"));
  const entries = raw.entries ?? [];

  const byTier = { easy: [], medium: [], hard: [] };
  const allRolloutScores = [];
  const allP50 = [];

  for (const entry of entries) {
    const tier = entry.tier ?? "easy";
    if (entry.metrics?.scoreP50 != null) {
      allP50.push(entry.metrics.scoreP50);
      if (byTier[tier]) byTier[tier].push(entry.metrics.scoreP50);
    }
    for (const r of entry.rolloutSummaries ?? []) {
      allRolloutScores.push(r.finalScore);
    }
  }

  console.log(JSON.stringify({
    entries: entries.length,
    seedScoreP50: quantilesFromScores(allP50),
    rolloutFinalScore: quantilesFromScores(allRolloutScores),
    tierSeedScoreP50: Object.fromEntries(
      Object.entries(byTier).map(([tier, scores]) => [tier, quantilesFromScores(scores)])
    ),
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
