#!/usr/bin/env node
/**
 * 对已有 index.json 出体验 KPI 体检报告（不重新仿真时可只读 metrics）。
 *
 *   npx tsx scripts/blockblast/report-kpi.mjs --in scripts/blockblast/output/pool-v4
 *   npx tsx scripts/blockblast/report-kpi.mjs --in ... --profile prod
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadPoolDefaults } from "./blockblast-pool-defaults.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

function parseArgs(argv) {
  const opts = {
    inDir: "",
    profile: "prod",
    out: "",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--in") opts.inDir = path.resolve(next());
    else if (a === "--profile") opts.profile = next();
    else if (a === "--out") opts.out = path.resolve(next());
  }
  return opts;
}

async function main() {
  const defaults = await loadPoolDefaults(repoRoot);
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.inDir) opts.inDir = defaults.outDir;
  if (!opts.out) opts.out = path.join(opts.inDir, "kpi-report.json");

  const kpiPath = path.join(
    repoRoot,
    "src/convex/blockBlast/convex/service/seedPool/blockBlastExperienceKpi.ts"
  );
  const { evaluateExperienceGates, summarizePoolHealth, softPTargetsForProfile } = await import(
    pathToFileURL(kpiPath).href
  );

  const indexPath = path.join(opts.inDir, "index.json");
  const raw = await readFile(indexPath, "utf8");
  const index = JSON.parse(raw);
  const entries = Array.isArray(index.entries) ? index.entries : [];

  const profile = opts.profile === "probe" ? "probe" : "prod";
  const perSeed = [];
  const warnCounts = {};
  const failCounts = {};

  for (const e of entries) {
    const m = e.metrics ?? {};
    const hasExp =
      typeof m.mediumBurstRate === "number" && typeof m.experienceScore === "number";
    if (!hasExp) {
      perSeed.push({
        seedId: e.seedId,
        tier: e.tier,
        missingExperienceMetrics: true,
      });
      continue;
    }
    const { hardRejects, warnings } = evaluateExperienceGates(m, profile);
    for (const w of warnings) {
      warnCounts[w.id] = (warnCounts[w.id] ?? 0) + 1;
    }
    for (const h of hardRejects) {
      failCounts[h.id] = (failCounts[h.id] ?? 0) + 1;
    }
    perSeed.push({
      seedId: e.seedId,
      tier: e.tier,
      experienceScore: m.experienceScore,
      playerEaseScore: m.playerEaseScore,
      mediumBurstRate: m.mediumBurstRate,
      jackpotRate: m.jackpotRate,
      lateGameReachRate: m.lateGameReachRate,
      timeUpRate: m.timeUpRate,
      softPPassCount: m.softPPassCount,
      hardRejectIds: hardRejects.map((x) => x.id),
      warningIds: warnings.map((x) => x.id),
    });
  }

  const withMetrics = entries.filter(
    (e) => typeof e.metrics?.experienceScore === "number"
  );
  const health = summarizePoolHealth(withMetrics, profile);

  const byExp = [...perSeed]
    .filter((s) => typeof s.experienceScore === "number")
    .sort((a, b) => b.experienceScore - a.experienceScore);
  const byEase = [...perSeed]
    .filter((s) => typeof s.playerEaseScore === "number")
    .sort((a, b) => b.playerEaseScore - a.playerEaseScore);

  const report = {
    generatedAt: new Date().toISOString(),
    poolVersion: index.poolVersion,
    profile,
    softPTargets: softPTargetsForProfile(profile),
    health,
    warnCounts,
    failCounts,
    topByExperience: byExp.slice(0, 10),
    bottomByExperience: byExp.slice(-10).reverse(),
    topByEase: byEase.slice(0, 5).map((s) => s.seedId),
    experienceVsEaseDivergence: {
      topExpNotInTopEase: byExp
        .slice(0, 10)
        .filter((s) => !byEase.slice(0, 10).some((e) => e.seedId === s.seedId))
        .map((s) => s.seedId),
    },
    seedsMissingMetrics: perSeed.filter((s) => s.missingExperienceMetrics).length,
  };

  await writeFile(opts.out, JSON.stringify(report, null, 2), "utf8");
  console.log(`kpi report → ${opts.out}`);
  console.log(
    `seeds=${health.seedCount} gatePassRate=${health.gatePassRate.toFixed(3)} meanTimeUp=${health.meanTimeUpRate.toFixed(3)} meanMediumBurst=${health.meanMediumBurstRate.toFixed(3)} meanJackpot=${health.meanJackpotRate.toFixed(3)} meanLateReach=${health.meanLateGameReachRate.toFixed(3)} meanExp=${health.meanExperienceScore.toFixed(3)}`
  );
  if (Object.keys(failCounts).length) {
    console.log(`prod-hard fail counts: ${JSON.stringify(failCounts)}`);
  }
  if (Object.keys(warnCounts).length) {
    console.log(`warn counts: ${JSON.stringify(warnCounts)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
