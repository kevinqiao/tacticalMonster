#!/usr/bin/env node
/**
 * Block Blast L1 迭代编排：preset → 小集 create → report → 试玩清单（可选 load）。
 *
 * 人仍负责：改关键帧 JSON、单人挑战评节奏、决定下一轮。
 * 脚本负责：注入 L1、生成独立池、KPI 报告、落盘 checklist / meta。
 *
 *   npm run blockblast:l1:iter -- export-baseline
 *   npm run blockblast:l1:iter -- run --preset scripts/blockblast/presets/v6-baseline.json --iter iter01
 *   npm run blockblast:l1:iter -- run --preset .../my.json --iter iter02 --load
 *   npm run blockblast:l1:iter -- checklist --out scripts/blockblast/output/pool-l1-iter01
 */
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const PRESETS_DIR = path.join(__dirname, "presets");
const BASELINE_PRESET = path.join(PRESETS_DIR, "v6-baseline.json");

function printHelp() {
  console.log(`
Block Blast L1 iteration helper

Commands:
  run              preset → create (probe) → report → playtest checklist [→ load]
  export-baseline  dump current code KEYFRAMES into presets/v6-baseline.json
  checklist        rewrite playtest-checklist.md for an existing --out
  help

run options:
  --preset <path>           L1 preset JSON (required)
  --iter <tag>              iteration id (default: preset.poolVersion or timestamp)
  --out <dir>               default scripts/blockblast/output/pool-l1-<iter>
  --pool-version <v>        override poolVersion / seed id namespace
  --policy-version <v>      override metrics policyVersion
  --count <n>               default 40
  --rollouts <n>            default 24
  --think-time-scale <n>    default 0.6 (~1s/step vs personas; freeze L2 while tuning L1)
  --kpi-profile <p>         default probe
  --oversample-factor <n>   default 1
  --load                    after report, import into Portal (dev; clears active catalog)
  --skip-create             only report + checklist
  --skip-report             skip KPI report
  --resume                  pass --resume to create

Loop reminder:
  1) copy/edit preset keyframes (one change)
  2) run this script
  3) Solo playtest using checklist (L3 still hard+p90 — judge rhythm only)
  4) next iter with new --iter / --out
`);
}

function parseArgs(argv) {
  const cmd = argv[0] && !argv[0].startsWith("-") ? argv[0] : "help";
  const flags = cmd === "help" ? argv.slice(0) : argv.slice(1);
  const opts = {
    cmd,
    preset: "",
    iter: "",
    out: "",
    poolVersion: "",
    policyVersion: "",
    count: 40,
    rollouts: 24,
    thinkTimeScale: 0.6,
    kpiProfile: "probe",
    oversampleFactor: 1,
    load: false,
    skipCreate: false,
    skipReport: false,
    resume: false,
  };
  for (let i = 0; i < flags.length; i++) {
    const a = flags[i];
    const next = () => flags[++i];
    if (a === "--preset") opts.preset = path.resolve(next());
    else if (a === "--iter") opts.iter = next();
    else if (a === "--out") opts.out = path.resolve(next());
    else if (a === "--pool-version") opts.poolVersion = next();
    else if (a === "--policy-version") opts.policyVersion = next();
    else if (a === "--count") opts.count = Number(next());
    else if (a === "--rollouts") opts.rollouts = Number(next());
    else if (a === "--think-time-scale") opts.thinkTimeScale = Number(next());
    else if (a === "--kpi-profile") opts.kpiProfile = next();
    else if (a === "--oversample-factor") opts.oversampleFactor = Number(next());
    else if (a === "--load") opts.load = true;
    else if (a === "--skip-create") opts.skipCreate = true;
    else if (a === "--skip-report") opts.skipReport = true;
    else if (a === "--resume") opts.resume = true;
    else if (a === "--help" || a === "help") opts.cmd = "help";
  }
  return opts;
}

function runNpmScript(scriptName, args) {
  const isWin = process.platform === "win32";
  const npm = isWin ? "npm.cmd" : "npm";
  console.log(`\n→ npm run ${scriptName} -- ${args.join(" ")}\n`);
  const r = spawnSync(npm, ["run", scriptName, "--", ...args], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: isWin,
  });
  if (r.status !== 0) {
    throw new Error(`${scriptName} failed with exit ${r.status ?? "null"}`);
  }
}

function playtestChecklistMarkdown({ iter, outDir, poolVersion, policyVersion, presetPath, notes }) {
  return `# L1 playtest checklist — ${iter}

Generated: ${new Date().toISOString()}

## Frozen (do not change this round)

- L2 thinkTimeScale / personas: freeze
- L3 Solo: still **hard + p90** (judge **rhythm**, not pass-rate)
- Preset: \`${presetPath}\`
- poolVersion: \`${poolVersion}\`
- policyVersion: \`${policyVersion}\`
- out: \`${outDir}\`

${notes ? `## Preset notes\n\n${notes}\n` : ""}
## After load / point Solo at this pool

Play **5–10** Solo games. Score only rhythm:

| # | Opening 60s (闷/正常/太松) | Mid-game clear space | After ~2min (加压/必挂) | Big-block spam? | Want another run? | Notes |
|---|---------------------------|----------------------|-------------------------|-----------------|-------------------|-------|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |

## Next L1 tweak (pick one)

| Feeling | Next keyframe change |
|---------|----------------------|
| Opening stifling | t≈0: ↓p5, ↑p3–p4 |
| Opening too soft | t≈0: ↑p4–p5 |
| Mid/late always die | climax/late: ↑p1–p2 or ↓p5 |
| Alive but dull | mid: keep p3–p4; shift when p5 appears |
| Curve tail unused | shorten progressFull or move pressure earlier |

## Stop L1 loop when

- Opening acceptable for 2 rounds
- Late pressure feels progressive (not instant death / pure RNG)
- Then consider L3 unlock (tier weights / p75) — **not** in this loop

## Commands

\`\`\`bash
# re-report
npm run blockblast:pool:report -- --out ${outDir} --kpi-profile probe

# load this iter pool (dev)
npm run blockblast:pool:load -- --out ${outDir} --pool-version ${poolVersion}

# next iter
npm run blockblast:l1:iter -- run --preset <edited.json> --iter <next>
\`\`\`
`;
}

async function cmdExportBaseline() {
  const catalogPath = path.join(
    repoRoot,
    "src/convex/blockBlast/convex/service/blockBlastShapeCatalog.ts"
  );
  const typesPath = path.join(
    repoRoot,
    "src/convex/blockBlast/convex/service/seedPool/blockBlastRecordedOpTypes.ts"
  );
  const catalog = await import(pathToFileURL(catalogPath).href);
  const types = await import(pathToFileURL(typesPath).href);

  const keyframes = catalog.BLOCK_BLAST_WEIGHT_KEYFRAMES.map((kf) => ({
    t: kf.t,
    weights: Object.fromEntries(
      [1, 2, 3, 4, 5].map((c) => [String(c), kf.weights[c]])
    ),
  }));
  const doc = {
    policyVersion: types.BLOCK_BLAST_POLICY_VERSION,
    poolVersion: "l1-v6-baseline",
    progressFull: catalog.BLOCK_BLAST_PROGRESS_FULL_SHAPE_INDEX,
    notes: "Exported from current code KEYFRAMES. Copy → edit → l1-iter run.",
    keyframes,
  };
  await mkdir(PRESETS_DIR, { recursive: true });
  await writeFile(BASELINE_PRESET, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  console.log(`wrote ${BASELINE_PRESET}`);
}

async function resolveRunContext(opts) {
  if (!opts.preset && opts.cmd === "run" && !opts.skipCreate) {
    throw new Error("--preset <path> is required for run (or use --skip-create with --out)");
  }
  let presetDoc = null;
  if (opts.preset) {
    presetDoc = JSON.parse(await readFile(opts.preset, "utf8"));
  }
  const iter =
    opts.iter ||
    presetDoc?.poolVersion ||
    `iter-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
  // --iter 优先决定命名空间，避免基线 preset 的 poolVersion 盖住本轮 iter
  const poolVersion =
    opts.poolVersion ||
    (opts.iter ? `l1-${opts.iter}` : null) ||
    presetDoc?.poolVersion ||
    `l1-${iter}`;
  const policyVersion =
    opts.policyVersion ||
    (opts.iter ? `block-blast-stochastic-${poolVersion}` : null) ||
    presetDoc?.policyVersion ||
    `block-blast-stochastic-${poolVersion}`;
  const outDir = opts.out || path.join(repoRoot, "scripts/blockblast/output", `pool-l1-${iter}`);
  return { iter, poolVersion, policyVersion, outDir, presetDoc };
}

async function writeChecklist(ctx, opts) {
  const md = playtestChecklistMarkdown({
    iter: ctx.iter,
    outDir: ctx.outDir,
    poolVersion: ctx.poolVersion,
    policyVersion: ctx.policyVersion,
    presetPath: opts.preset || path.join(ctx.outDir, "l1-preset.json"),
    notes: ctx.presetDoc?.notes ?? null,
  });
  await mkdir(ctx.outDir, { recursive: true });
  const checklistPath = path.join(ctx.outDir, "playtest-checklist.md");
  await writeFile(checklistPath, md, "utf8");
  console.log(`wrote ${checklistPath}`);
  return checklistPath;
}

async function cmdRun(opts) {
  const ctx = await resolveRunContext(opts);
  console.log("== L1 iter run ==");
  console.log(
    JSON.stringify(
      {
        iter: ctx.iter,
        out: ctx.outDir,
        poolVersion: ctx.poolVersion,
        policyVersion: ctx.policyVersion,
        preset: opts.preset || null,
        count: opts.count,
        rollouts: opts.rollouts,
        thinkTimeScale: opts.thinkTimeScale,
        load: opts.load,
      },
      null,
      2
    )
  );

  if (!opts.skipCreate) {
    if (!opts.preset) throw new Error("--preset required unless --skip-create");
    const createArgs = [
      "--kpi-profile",
      opts.kpiProfile,
      "--count",
      String(opts.count),
      "--rollouts",
      String(opts.rollouts),
      "--think-time-scale",
      String(opts.thinkTimeScale),
      "--oversample-factor",
      String(opts.oversampleFactor),
      "--out",
      ctx.outDir,
      "--pool-version",
      ctx.poolVersion,
      "--l1-preset",
      opts.preset,
      "--policy-version",
      ctx.policyVersion,
    ];
    if (opts.resume) createArgs.push("--resume");
    runNpmScript("blockblast:pool:create", createArgs);
  }

  if (!opts.skipReport) {
    runNpmScript("blockblast:pool:report", [
      "--out",
      ctx.outDir,
      "--kpi-profile",
      opts.kpiProfile === "probe" ? "probe" : "prod",
    ]);
  }

  await writeChecklist(ctx, opts);

  const summaryPath = path.join(ctx.outDir, "l1-iter-summary.json");
  await writeFile(
    summaryPath,
    `${JSON.stringify(
      {
        iter: ctx.iter,
        out: ctx.outDir,
        poolVersion: ctx.poolVersion,
        policyVersion: ctx.policyVersion,
        preset: opts.preset || null,
        thinkTimeScale: opts.thinkTimeScale,
        count: opts.count,
        rollouts: opts.rollouts,
        finishedAt: new Date().toISOString(),
        nextHumanStep: "Solo playtest with playtest-checklist.md; edit preset; re-run with new --iter",
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  console.log(`wrote ${summaryPath}`);

  if (opts.load) {
    console.log("\n== load (dev): Portal — will clear/replace active Block Blast catalog ==");
    runNpmScript("blockblast:pool:load", [
      "--out",
      ctx.outDir,
      "--pool-version",
      ctx.poolVersion,
    ]);
  } else {
    console.log(`\nDone. Playtest checklist: ${path.join(ctx.outDir, "playtest-checklist.md")}`);
    console.log(
      `To load for Solo: npm run blockblast:pool:load -- --out ${ctx.outDir} --pool-version ${ctx.poolVersion}`
    );
  }
}

async function cmdChecklist(opts) {
  if (!opts.out) throw new Error("checklist requires --out <dir>");
  let presetDoc = null;
  const presetInOut = path.join(opts.out, "l1-preset.json");
  try {
    presetDoc = JSON.parse(await readFile(opts.preset || presetInOut, "utf8"));
  } catch {
    // optional
  }
  let meta = null;
  try {
    meta = JSON.parse(await readFile(path.join(opts.out, "l1-iter-meta.json"), "utf8"));
  } catch {
    // optional
  }
  const ctx = {
    iter: opts.iter || path.basename(opts.out).replace(/^pool-l1-/, "") || "unknown",
    outDir: opts.out,
    poolVersion: opts.poolVersion || meta?.poolVersion || presetDoc?.poolVersion || "unknown",
    policyVersion:
      opts.policyVersion || meta?.policyVersion || presetDoc?.policyVersion || "unknown",
    presetDoc,
  };
  await writeChecklist(ctx, { preset: opts.preset || presetInOut });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.cmd === "help") {
    printHelp();
    return;
  }
  if (opts.cmd === "export-baseline") {
    await cmdExportBaseline();
    return;
  }
  if (opts.cmd === "checklist") {
    await cmdChecklist(opts);
    return;
  }
  if (opts.cmd === "run") {
    await cmdRun(opts);
    return;
  }
  console.error(`Unknown command: ${opts.cmd}`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});
