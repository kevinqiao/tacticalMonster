#!/usr/bin/env node
/**
 * Generate tower seed pool offline (mirrors scripts/solitaire/generate-seed-pool.mjs).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

const { generatePool, DEFAULT_TIER_QUOTAS, DEFAULT_MATCH_TIME_LIMIT_SEC } = await import(
  pathToFileURL(join(root, "src/convex/towerArena/convex/service/seedPool/towerSeedPoolRunner.ts")).href
);

const poolVersion = process.argv.includes("--pool-version")
  ? process.argv[process.argv.indexOf("--pool-version") + 1]
  : "v1";
const count = Number(
  process.argv.includes("--count") ? process.argv[process.argv.indexOf("--count") + 1] : 36
);
const rolloutCount = Number(
  process.argv.includes("--rollouts") ? process.argv[process.argv.indexOf("--rollouts") + 1] : 32
);

const outDir = join(__dirname, "output", `pool-${poolVersion}`);
mkdirSync(outDir, { recursive: true });

const { entries, rejected } = generatePool({
  poolVersion,
  start: 0,
  count,
  tierQuotas: DEFAULT_TIER_QUOTAS,
  rolloutCount,
  matchSeconds: DEFAULT_MATCH_TIME_LIMIT_SEC,
  writeRolloutSummaries: true,
});

const index = {
  poolVersion,
  rolloutCount,
  matchTimeLimitSec: DEFAULT_MATCH_TIME_LIMIT_SEC,
  generatedAt: new Date().toISOString(),
  entries,
  rejected,
};

writeFileSync(join(outDir, "index.json"), JSON.stringify(index, null, 2));

const tierIndex = {
  poolVersion,
  rolloutCount,
  matchTimeLimitSec: DEFAULT_MATCH_TIME_LIMIT_SEC,
  generatedAt: index.generatedAt,
  tiers: {
    easy: entries.filter((e) => e.tier === "easy"),
    medium: entries.filter((e) => e.tier === "medium"),
    hard: entries.filter((e) => e.tier === "hard"),
  },
};
writeFileSync(join(outDir, "tier-index.json"), JSON.stringify(tierIndex, null, 2));
writeFileSync(join(outDir, "rejected.json"), JSON.stringify(rejected, null, 2));

console.log(`Wrote ${entries.length} entries (${rejected.length} rejected) to ${outDir}`);
