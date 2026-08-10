#!/usr/bin/env node
/**
 * Build an onboarding-ready Block Blast pool from an existing index (no re-sim).
 *
 *   npx tsx scripts/blockblast/annotate-onboarding-from-pool.mjs \
 *     --in scripts/blockblast/output/pool-v7 \
 *     --out scripts/blockblast/output/pool-onb1 \
 *     --pool-version onb1 --count 200
 *
 * Formula must stay in sync with computeBlockBlastOnboardingScore in
 * blockBlastSeedDifficulty.ts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Keep in sync with blockBlastSeedDifficulty.computeBlockBlastOnboardingScore */
function computeBlockBlastOnboardingScore(input) {
  const limit = input.matchTimeLimitSec > 0 ? input.matchTimeLimitSec : 300;
  const p25Norm = Math.min(1, Math.max(0, input.survivalTimeP25 / limit));
  const p50Norm = Math.min(1, Math.max(0, input.survivalTimeP50 / limit));
  const spreadPenalty = Math.min(1, Math.max(0, input.survivalTimeSpread / limit)) * 120;
  const scoreFloorBonus = Math.min(80, Math.max(0, input.scoreMin ?? 0)) * 0.5;
  return Math.round(
    input.experienceScore +
      input.earlyClearRate * 40 +
      p25Norm * 320 +
      p50Norm * 80 -
      spreadPenalty +
      scoreFloorBonus
  );
}

function scoreP50Of(e) {
  return e.metrics?.scoreP50 ?? e.metrics?.scoreQuantiles?.p50 ?? Number.POSITIVE_INFINITY;
}

/**
 * Ritual easy: high onboarding first, then prefer lower scoreP50 inside the
 * friendliness band so force-easy is not dominated by high-threshold seeds.
 */
function assignTiersByOnboarding(entries, fractions) {
  const sorted = [...entries].sort((a, b) => {
    const ao = a.metrics?.onboardingScore ?? 0;
    const bo = b.metrics?.onboardingScore ?? 0;
    if (bo !== ao) return bo - ao;
    const d = scoreP50Of(a) - scoreP50Of(b);
    if (d !== 0) return d;
    return String(a.seedId).localeCompare(String(b.seedId));
  });
  const n = sorted.length;
  const easyCut = Math.floor(n * fractions.easy);
  const mediumCut = Math.floor(n * (fractions.easy + fractions.medium));

  const easyBand = sorted.slice(0, Math.min(n, Math.max(easyCut * 2, easyCut)));
  const easyIds = new Set(
    [...easyBand]
      .sort((a, b) => {
        const d = scoreP50Of(a) - scoreP50Of(b);
        if (d !== 0) return d;
        return (b.metrics?.onboardingScore ?? 0) - (a.metrics?.onboardingScore ?? 0);
      })
      .slice(0, easyCut)
      .map((e) => e.seedId)
  );

  const rest = sorted.filter((e) => !easyIds.has(e.seedId));
  const mediumIds = new Set(rest.slice(0, Math.max(0, mediumCut - easyCut)).map((e) => e.seedId));

  return sorted.map((e) => ({
    ...e,
    tier: easyIds.has(e.seedId) ? "easy" : mediumIds.has(e.seedId) ? "medium" : "hard",
  }));
}

function parseArgs(argv) {
  const opts = {
    inDir: path.resolve(__dirname, "output/pool-v7"),
    outDir: path.resolve(__dirname, "output/pool-onb1"),
    poolVersion: "onb1",
    count: 200,
    tierEasy: 0.3,
    tierMedium: 0.4,
    /** scale0.6 仿真下 p25≥45 极少；38 为 v7 可达的严格档 */
    minSurvivalP25: 38,
    maxSurvivalSpread: 90,
    minScoreMin: 24,
    /** 0 = off. Caps how hard the success line can feel on ritual p50. */
    maxScoreP50: 280,
    /** Reject flat upper half (p90−p50 ≤ gap). 0 = off. */
    maxCollapsedGap: 8,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--in") opts.inDir = path.resolve(next());
    else if (a === "--out") opts.outDir = path.resolve(next());
    else if (a === "--pool-version") opts.poolVersion = next();
    else if (a === "--count") opts.count = Number(next());
    else if (a === "--tier-easy") opts.tierEasy = Number(next());
    else if (a === "--tier-medium") opts.tierMedium = Number(next());
    else if (a === "--min-survival-p25") opts.minSurvivalP25 = Number(next());
    else if (a === "--max-survival-spread") opts.maxSurvivalSpread = Number(next());
    else if (a === "--min-score-min") opts.minScoreMin = Number(next());
    else if (a === "--max-score-p50") opts.maxScoreP50 = Number(next());
    else if (a === "--max-collapsed-gap") opts.maxCollapsedGap = Number(next());
    else if (a === "--no-max-score-p50") opts.maxScoreP50 = 0;
    else if (a === "--no-reject-collapsed") opts.maxCollapsedGap = 0;
    else if (a === "--help" || a === "-h") {
      console.log(`annotate-onboarding-from-pool.mjs
  --in <dir>                 source pool (default pool-v7)
  --out <dir>                output pool dir
  --pool-version <v>         target poolVersion / seed id namespace
  --count <n>                keep top-n by onboardingScore (default 200)
  --min-survival-p25 <n>     filter (default 38)
  --max-survival-spread <n>  filter (default 90)
  --min-score-min <n>        filter scoreMin (default 24)
  --max-score-p50 <n>        filter scoreP50 (default 280; 0/off)
  --max-collapsed-gap <n>    reject if p90-p50 ≤ n (default 8; 0/off)
`);
      process.exit(0);
    }
  }
  return opts;
}

function rewriteSeedId(seedId, poolVersion) {
  const parts = String(seedId).split(":");
  if (parts.length >= 3 && parts[0] === "blockblast-pool") {
    const idx = parts[parts.length - 1];
    return `blockblast-pool:${poolVersion}:${idx}`;
  }
  return String(seedId).replace(/:v\d[^:]*:/, `:${poolVersion}:`);
}

function passesRitualGates(m, opts) {
  const p25 = m.survivalTimeP25 ?? 0;
  const spread = m.survivalTimeSpread ?? Number.POSITIVE_INFINITY;
  const scoreMin = m.scoreMin ?? 0;
  const scoreP50 = m.scoreP50 ?? m.scoreQuantiles?.p50 ?? 0;
  const p90 = m.scoreQuantiles?.p90 ?? m.scoreP90 ?? scoreP50;
  if (opts.minSurvivalP25 > 0 && p25 < opts.minSurvivalP25) return false;
  if (opts.maxSurvivalSpread > 0 && spread > opts.maxSurvivalSpread) return false;
  if (opts.minScoreMin > 0 && scoreMin < opts.minScoreMin) return false;
  if (opts.maxScoreP50 > 0 && scoreP50 > opts.maxScoreP50) return false;
  if (opts.maxCollapsedGap > 0 && p90 - scoreP50 <= opts.maxCollapsedGap) return false;
  return true;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const indexPath = path.join(opts.inDir, "index.json");
  const raw = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const entries = Array.isArray(raw.entries) ? raw.entries : [];
  if (entries.length === 0) {
    console.error(`no entries in ${indexPath}`);
    process.exit(1);
  }

  const rejected = [];
  const scored = [];
  for (const e of entries) {
    const m = e.metrics ?? {};
    if (!passesRitualGates(m, opts)) {
      rejected.push({
        seedId: e.seedId,
        reason: "ritual_survival_gate",
        detail: `p25=${m.survivalTimeP25 ?? "n/a"} spread=${m.survivalTimeSpread ?? "n/a"} scoreMin=${m.scoreMin ?? "n/a"} scoreP50=${m.scoreP50 ?? m.scoreQuantiles?.p50 ?? "n/a"}`,
      });
      continue;
    }
    const onboardingScore = computeBlockBlastOnboardingScore({
      experienceScore: m.experienceScore ?? 0,
      earlyClearRate: m.earlyClearRate ?? 0,
      survivalTimeP25: m.survivalTimeP25 ?? 0,
      survivalTimeP50: m.survivalTimeP50 ?? 0,
      survivalTimeSpread: m.survivalTimeSpread ?? 0,
      matchTimeLimitSec: m.matchTimeLimitSec ?? 300,
      scoreMin: m.scoreMin ?? 0,
    });
    scored.push({
      ...e,
      seedId: rewriteSeedId(e.seedId, opts.poolVersion),
      poolVersion: opts.poolVersion,
      metrics: { ...m, onboardingScore },
    });
  }

  scored.sort((a, b) => {
    const d = (b.metrics.onboardingScore ?? 0) - (a.metrics.onboardingScore ?? 0);
    if (d !== 0) return d;
    return scoreP50Of(a) - scoreP50Of(b);
  });

  if (scored.length === 0) {
    console.error(
      `no entries passed ritual gates (minSurvivalP25=${opts.minSurvivalP25} maxSpread=${opts.maxSurvivalSpread} minScoreMin=${opts.minScoreMin} maxScoreP50=${opts.maxScoreP50} collapsedGap=${opts.maxCollapsedGap})`
    );
    process.exit(1);
  }

  const kept = scored.slice(0, Math.max(1, opts.count));
  const retiered = assignTiersByOnboarding(kept, {
    easy: opts.tierEasy,
    medium: opts.tierMedium,
  });

  fs.mkdirSync(opts.outDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const index = {
    poolVersion: opts.poolVersion,
    policyVersion: raw.policyVersion ?? "block-blast-stochastic-v7",
    generatedAt,
    source: `annotated-from:${path.basename(opts.inDir)}`,
    rollouts: entries[0]?.metrics?.rolloutCount,
    entries: retiered,
  };
  fs.writeFileSync(path.join(opts.outDir, "index.json"), JSON.stringify(index, null, 2));

  const byTier = { easy: [], medium: [], hard: [] };
  for (const e of retiered) {
    (byTier[e.tier] ??= []).push(e.seedId);
  }
  fs.writeFileSync(
    path.join(opts.outDir, "tier-index.json"),
    JSON.stringify({ poolVersion: opts.poolVersion, generatedAt, tiers: byTier }, null, 2)
  );
  fs.writeFileSync(
    path.join(opts.outDir, "rejected.json"),
    JSON.stringify({ poolVersion: opts.poolVersion, entries: rejected }, null, 2)
  );

  const obs = retiered.map((e) => e.metrics.onboardingScore).sort((a, b) => a - b);
  const surv = retiered.map((e) => e.metrics.survivalTimeP25 ?? 0).sort((a, b) => a - b);
  const easyP50 = retiered
    .filter((e) => e.tier === "easy")
    .map((e) => scoreP50Of(e))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor((arr.length - 1) * p))];
  console.log(
    JSON.stringify(
      {
        out: opts.outDir,
        kept: retiered.length,
        sourceEntries: entries.length,
        rejectedGates: rejected.length,
        gates: {
          minSurvivalP25: opts.minSurvivalP25,
          maxSurvivalSpread: opts.maxSurvivalSpread,
          minScoreMin: opts.minScoreMin,
          maxScoreP50: opts.maxScoreP50,
          maxCollapsedGap: opts.maxCollapsedGap,
        },
        onboarding: {
          min: obs[0],
          p25: pct(obs, 0.25),
          p50: pct(obs, 0.5),
          p75: pct(obs, 0.75),
          max: obs[obs.length - 1],
        },
        survivalP25: {
          min: surv[0],
          p50: pct(surv, 0.5),
          max: surv[surv.length - 1],
        },
        easyScoreP50:
          easyP50.length > 0
            ? { min: easyP50[0], p50: pct(easyP50, 0.5), max: easyP50[easyP50.length - 1] }
            : null,
        tiers: retiered.reduce((a, e) => {
          a[e.tier] = (a[e.tier] || 0) + 1;
          return a;
        }, {}),
      },
      null,
      2
    )
  );
}

main();
