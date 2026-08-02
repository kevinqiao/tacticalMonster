#!/usr/bin/env node
/**
 * 从 tier-index.json 恢复 index.json（重跑仿真补全 metrics）。
 * 用于 index 被中断写空后的恢复。
 */
import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

async function writeJsonAtomic(filePath, value) {
  const tmp = `${filePath}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  try {
    await unlink(filePath);
  } catch {
    /* ok */
  }
  await rename(tmp, filePath);
}

async function main() {
  const outDir = path.resolve(
    process.argv[2] ?? path.join(repoRoot, "scripts/blockblast/output/pool-v4")
  );
  const rollouts = Number(process.argv[3] ?? 48);
  const thinkTimeScale = Number(process.argv[4] ?? 3);
  const matchSeconds = 300;

  const tierPath = path.join(outDir, "tier-index.json");
  const tier = JSON.parse(await readFile(tierPath, "utf8"));
  const seedIds = [];
  for (const t of ["easy", "medium", "hard"]) {
    for (const row of tier.tiers?.[t] ?? []) seedIds.push(row.seedId);
  }
  seedIds.sort((a, b) => {
    const na = Number(a.split(":").pop());
    const nb = Number(b.split(":").pop());
    return na - nb;
  });
  console.log(`recover ${seedIds.length} seeds from ${tierPath}`);

  const runner = await import(
    pathToFileURL(
      path.join(repoRoot, "src/convex/blockBlast/convex/service/seedPool/blockBlastSeedPoolRunner.ts")
    ).href
  );
  const difficulty = await import(
    pathToFileURL(
      path.join(repoRoot, "src/convex/blockBlast/convex/service/seedPool/blockBlastSeedDifficulty.ts")
    ).href
  );
  const sim = await import(
    pathToFileURL(
      path.join(repoRoot, "src/convex/blockBlast/convex/service/seedPool/blockBlastSeedSimulator.ts")
    ).href
  );

  const candidates = [];
  const t0 = Date.now();
  for (let i = 0; i < seedIds.length; i++) {
    const seedId = seedIds[i];
    const { allRollouts, metrics } = sim.simulateSeedRollouts(seedId, rollouts, {
      matchSeconds,
      thinkTimeScale,
      keepDuplicateRollouts: true,
    });
    candidates.push({
      seedId,
      poolVersion: tier.poolVersion ?? "v4",
      difficultyScore: metrics.scoreP50,
      metrics,
      rolloutSummaries: runner.toRolloutSummaries(allRollouts),
    });
    if ((i + 1) % 10 === 0 || i + 1 === seedIds.length) {
      console.log(`recovered ${i + 1}/${seedIds.length} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
  }

  const entries = difficulty.assignTiers(candidates, { easy: 0.3, medium: 0.4 });
  const generatedAt = new Date().toISOString();
  const poolVersion = tier.poolVersion ?? "v4";
  await writeJsonAtomic(path.join(outDir, "index.json"), {
    poolVersion,
    rolloutCount: rollouts,
    matchTimeLimitSec: matchSeconds,
    generatedAt,
    entries,
  });
  const tierIndex = difficulty.buildTierIndex(entries, poolVersion, rollouts, generatedAt);
  await writeJsonAtomic(path.join(outDir, "tier-index.json"), tierIndex);
  console.log(`wrote index.json entries=${entries.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
