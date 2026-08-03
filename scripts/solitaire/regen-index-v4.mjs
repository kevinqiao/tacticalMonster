#!/usr/bin/env node
/**
 * Re-simulate every seed in an existing pool index with human-stochastic-v4.
 * Preserves seedId list; replaces metrics + rolloutSummaries (and optional rollouts/*.json).
 *
 * Usage:
 *   npx tsx scripts/solitaire/regen-index-v4.mjs --in scripts/solitaire/output/pool-v2
 *   npx tsx scripts/solitaire/regen-index-v4.mjs --in scripts/solitaire/output/pool-v2 --write-rollout-files
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

function parseArgs(argv) {
  const opts = {
    inDir: path.join(repoRoot, "scripts/solitaire/output/pool-v2"),
    writeRolloutFiles: false,
    matchSeconds: 300,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--in" && argv[i + 1]) opts.inDir = path.resolve(argv[++i]);
    else if (a === "--write-rollout-files") opts.writeRolloutFiles = true;
    else if (a === "--match-seconds" && argv[i + 1]) opts.matchSeconds = Number(argv[++i]);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv);
  const indexPath = path.join(opts.inDir, "index.json");
  const raw = JSON.parse(await readFile(indexPath, "utf8"));
  const entries = raw.entries ?? [];

  const runnerPath = path.join(
    repoRoot,
    "src/convex/solitaireArena/convex/service/seedPool/solitaireSeedPoolRunner.ts"
  );
  const simPath = path.join(
    repoRoot,
    "src/convex/solitaireArena/convex/service/seedPool/solitaireSeedSimulator.ts"
  );
  const verifyPath = path.join(
    repoRoot,
    "src/convex/solitaireArena/convex/service/seedPool/solitaireSeedPoolReplayVerify.ts"
  );
  const diffPath = path.join(
    repoRoot,
    "src/convex/solitaireArena/convex/service/seedPool/solitaireSeedDifficulty.ts"
  );

  const { toRolloutSummaries } = await import(pathToFileURL(runnerPath).href);
  const { simulateSeedRollouts } = await import(pathToFileURL(simPath).href);
  const { verifyAllRollouts } = await import(pathToFileURL(verifyPath).href);
  const { assignTiers, buildTierIndex } = await import(pathToFileURL(diffPath).href);

  const rolloutsDir = path.join(opts.inDir, "rollouts");
  if (opts.writeRolloutFiles) {
    await mkdir(rolloutsDir, { recursive: true });
  }

  const updated = [];
  const failed = [];
  const t0 = Date.now();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const seedId = entry.seedId;
    const k = entry.metrics?.rolloutCount ?? raw.rolloutCount ?? 8;
    const { allRollouts, metrics, rollouts } = simulateSeedRollouts(seedId, k, {
      matchSeconds: opts.matchSeconds,
      keepDuplicateRollouts: true,
    });
    const verify = verifyAllRollouts(seedId, allRollouts, opts.matchSeconds);
    if (!verify.ok) {
      failed.push({ seedId, reason: verify.reason });
      continue;
    }

    updated.push({
      ...entry,
      difficultyScore: metrics.scoreP50,
      metrics,
      rolloutSummaries: toRolloutSummaries(allRollouts),
    });

    if (opts.writeRolloutFiles) {
      const file = path.join(
        rolloutsDir,
        `${seedId.replace(/:/g, "-")}.json`
      );
      await writeFile(
        file,
        JSON.stringify({ seedId, rollouts }, null, 2),
        "utf8"
      );
    }

    if ((i + 1) % 10 === 0 || i === entries.length - 1) {
      console.log(`regen ${i + 1}/${entries.length} (${failed.length} failed)`);
    }
  }

  const tiered = assignTiers(
    updated.map((e) => ({
      seedId: e.seedId,
      poolVersion: e.poolVersion,
      difficultyScore: e.difficultyScore,
      metrics: e.metrics,
      rolloutSummaries: e.rolloutSummaries,
    })),
    { easy: 0.3, medium: 0.4 }
  );

  const rolloutCount = tiered[0]?.metrics.rolloutCount ?? raw.rolloutCount ?? 8;
  const nextIndex = {
    poolVersion: raw.poolVersion ?? "v2",
    rolloutCount,
    matchTimeLimitSec: opts.matchSeconds,
    generatedAt: new Date().toISOString(),
    policyNote: "regen-index-v4",
    entries: tiered,
  };

  await writeFile(indexPath, JSON.stringify(nextIndex, null, 2), "utf8");

  const tierIndex = buildTierIndex(
    tiered,
    nextIndex.poolVersion,
    rolloutCount,
    nextIndex.generatedAt
  );
  await writeFile(path.join(opts.inDir, "tier-index.json"), JSON.stringify(tierIndex, null, 2), "utf8");

  if (failed.length > 0) {
    await writeFile(
      path.join(opts.inDir, "regen-v4-failed.json"),
      JSON.stringify(failed, null, 2),
      "utf8"
    );
  }

  console.log(
    `done in ${((Date.now() - t0) / 1000).toFixed(1)}s accepted=${tiered.length} failed=${failed.length}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
