#!/usr/bin/env node
/**
 * Regenerate seed pools under the unified segment-A onboardingScore strategy.
 *
 *   npx tsx scripts/seed-catalog/regen-onboarding-pools.mjs              # all games
 *   npx tsx scripts/seed-catalog/regen-onboarding-pools.mjs match3 yatz
 *   npx tsx scripts/seed-catalog/regen-onboarding-pools.mjs --dry-run
 *
 * Does NOT auto-load into Convex (run each game's pool:load after QA).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const POOL_VERSION = "onb1";

const GAMES = {
  match3: {
    label: "Match3",
    args: [
      "run",
      "match3:pool:create",
      "--",
      "--version",
      POOL_VERSION,
      "--count",
      "200",
      "--rollouts",
      "60",
      "--out",
      path.join(repoRoot, "scripts/match3/output", `pool-${POOL_VERSION}`),
    ],
  },
  yatz: {
    label: "Yatz",
    args: [
      "run",
      "yatz:pool:create",
      "--",
      "--version",
      POOL_VERSION,
      "--count",
      "200",
      "--rollouts",
      "40",
      "--out",
      path.join(repoRoot, "scripts/yatz/output", `pool-${POOL_VERSION}`),
    ],
  },
  blockblast: {
    label: "Block Blast (annotate from pool-v7 after L1 v7 create)",
    // Prefer: create pool-v7 with policy v7, then annotate into onb1.
    args: [
      path.join(repoRoot, "scripts/blockblast/annotate-onboarding-from-pool.mjs"),
      "--in",
      path.join(repoRoot, "scripts/blockblast/output/pool-v7"),
      "--out",
      path.join(repoRoot, "scripts/blockblast/output", `pool-${POOL_VERSION}`),
      "--pool-version",
      POOL_VERSION,
      "--count",
      "200",
      "--min-survival-p25",
      "38",
      "--max-survival-spread",
      "90",
      "--max-score-p50",
      "280",
      "--max-collapsed-gap",
      "8",
    ],
    viaNode: true,
  },
  solitaire: {
    label: "Solitaire (casual; annotate solvability after)",
    // oversample 3 yields ~50/200 under foundation gates; 20 is needed for ~200 keeps.
    args: [
      "run",
      "solitaire:pool:create:casual",
      "--",
      "--pool-version",
      POOL_VERSION,
      "--out",
      path.join(repoRoot, "scripts/solitaire/output", `pool-${POOL_VERSION}`),
      "--count",
      "200",
      "--oversample-factor",
      "20",
    ],
  },
};

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const names = argv.filter((a) => a !== "--dry-run" && !a.startsWith("-"));
  const selected = names.length > 0 ? names : Object.keys(GAMES);
  for (const n of selected) {
    if (!GAMES[n]) {
      console.error(`Unknown game: ${n}. Valid: ${Object.keys(GAMES).join(", ")}`);
      process.exit(1);
    }
  }
  return { dryRun, selected };
}

function main() {
  const { dryRun, selected } = parseArgs(process.argv.slice(2));
  console.log(`onboarding pool regen · version=${POOL_VERSION}`);
  console.log(`games: ${selected.join(", ")}${dryRun ? " (dry-run)" : ""}`);
  console.log(`
After create:
  - Solitaire: annotate solvability + merge so onboardingScore=clearEase
      npm run solitaire:annotate-solvability -- --in scripts/solitaire/output/pool-${POOL_VERSION} --merge-index --resume
  - Block Blast: create pool-v7 (policy v7 gentle opening), then annotate → onb1
      npm run blockblast:pool:create -- --pool-version v7 --count 200 --kpi-profile probe --min-survival-p25 40 --min-survival-p50 70
      npm run blockblast:pool:annotate-onboarding -- --in scripts/blockblast/output/pool-v7 --out scripts/blockblast/output/pool-${POOL_VERSION} --pool-version ${POOL_VERSION} --count 200
  - Load each pool when QA ok:
      npm run match3:pool:load -- --pool-version ${POOL_VERSION} --index scripts/match3/output/pool-${POOL_VERSION}/index.json
      (similar for yatz / blockblast / solitaire)
`);

  for (const name of selected) {
    const g = GAMES[name];
    console.log(`\n=== ${g.label} ===`);
    if (dryRun) {
      console.log(g.viaNode ? `node ${g.args.join(" ")}` : `npm ${g.args.join(" ")}`);
      continue;
    }
    const res = g.viaNode
      ? spawnSync(process.execPath, g.args, {
          cwd: repoRoot,
          stdio: "inherit",
        })
      : spawnSync("npm", g.args, {
          cwd: repoRoot,
          stdio: "inherit",
          shell: process.platform === "win32",
        });
    if (res.status !== 0) {
      console.error(`${name} failed with status ${res.status}`);
      process.exit(res.status ?? 1);
    }
  }
  console.log("\nDone creating local pools. Load into Convex after QA.");
}

main();
