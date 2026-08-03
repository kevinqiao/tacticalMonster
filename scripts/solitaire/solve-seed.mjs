#!/usr/bin/env node
/**
 * Solitaire 可解性搜索 CLI
 *
 *   npx tsx scripts/solitaire/solve-seed.mjs --index 379
 *   npx tsx scripts/solitaire/solve-seed.mjs --seed solitaire-pool:v6:379
 *   npx tsx scripts/solitaire/solve-seed.mjs --index 0 --algorithm bfs --max-nodes 50000
 *   npx tsx scripts/solitaire/solve-seed.mjs --index 0,1,2 --json
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadPoolDefaults } from "./solitaire-pool-defaults.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

function usage() {
  console.log(`Solitaire solvability search

Usage:
  npx tsx scripts/solitaire/solve-seed.mjs --index <n>[,n...]
  npx tsx scripts/solitaire/solve-seed.mjs --seed <seedId>

Options:
  --pool <v>              poolVersion（默认随 policy，如 v6）
  --algorithm greedy|bfs|dfs  默认 greedy
  --max-nodes <n>         默认 200000
  --timeout-ms <n>        默认 30000
  --complete              完备搜索（可证明 unsolvable；极慢）
  --allow-foundation-pull 允许 foundation→tableau
  --no-prefer-foundation  关闭强制优先 foundation
  --json                  只输出 JSON
  --path                  打印完整着法路径
`);
}

function parseArgs(argv) {
  const opts = {
    indices: [],
    seeds: [],
    pool: "",
    algorithm: "greedy",
    maxNodes: 200_000,
    timeoutMs: 30_000,
    allowFoundationToTableau: false,
    preferFoundation: true,
    json: false,
    showPath: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--index") {
      const raw = next() ?? "";
      for (const part of raw.split(",")) {
        const n = Number(part.trim());
        if (Number.isFinite(n)) opts.indices.push(Math.floor(n));
      }
    } else if (a === "--seed") opts.seeds.push(next());
    else if (a === "--pool") opts.pool = next();
    else if (a === "--algorithm") opts.algorithm = next();
    else if (a === "--max-nodes") opts.maxNodes = Number(next());
    else if (a === "--timeout-ms") opts.timeoutMs = Number(next());
    else if (a === "--complete") {
      opts.allowFoundationToTableau = true;
      opts.preferFoundation = false;
      if (opts.algorithm === "greedy") opts.algorithm = "dfs";
    } else if (a === "--allow-foundation-pull") opts.allowFoundationToTableau = true;
    else if (a === "--no-foundation-pull") opts.allowFoundationToTableau = false;
    else if (a === "--no-prefer-foundation") opts.preferFoundation = false;
    else if (a === "--json") opts.json = true;
    else if (a === "--path") opts.showPath = true;
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  usage();
  process.exit(0);
}

const defaults = await loadPoolDefaults(repoRoot);
const poolVersion = opts.pool || defaults.poolVersion || "v6";

const solverPath = path.join(
  repoRoot,
  "src/convex/solitaireArena/convex/service/seedPool/solitaireSolver.ts"
);
const runnerPath = path.join(
  repoRoot,
  "src/convex/solitaireArena/convex/service/seedPool/solitaireSeedPoolRunner.ts"
);

const { solveSolitaireSeed } = await import(pathToFileURL(solverPath).href);
const { makeSeedId } = await import(pathToFileURL(runnerPath).href);

const seedIds = [
  ...opts.seeds,
  ...opts.indices.map((i) => makeSeedId(poolVersion, i)),
];

if (seedIds.length === 0) {
  usage();
  console.error("\nNeed --index or --seed");
  process.exit(1);
}

const solveOpts = {
  algorithm:
    opts.algorithm === "bfs" || opts.algorithm === "dfs" || opts.algorithm === "greedy"
      ? opts.algorithm
      : "greedy",
  maxNodes: opts.maxNodes,
  timeoutMs: opts.timeoutMs,
  allowFoundationToTableau: opts.allowFoundationToTableau,
  preferFoundation: opts.preferFoundation,
};

const rows = [];
for (const seedId of seedIds) {
  const result = solveSolitaireSeed(seedId, solveOpts);
  const row = {
    seedId,
    status: result.status,
    pathLength: result.pathLength ?? null,
    nodesExpanded: result.nodesExpanded,
    uniqueStates: result.uniqueStates,
    elapsedMs: result.elapsedMs,
    reason: result.reason ?? null,
    ...(opts.showPath && result.path ? { path: result.path } : {}),
  };
  rows.push(row);
  if (!opts.json) {
    const mark =
      result.status === "solvable" ? "✓" : result.status === "unsolvable" ? "✗" : "?";
    console.log(
      `${mark} ${seedId}  ${result.status}` +
        (result.pathLength != null ? `  path=${result.pathLength}` : "") +
        `  nodes=${result.nodesExpanded}  states=${result.uniqueStates}  ${result.elapsedMs}ms` +
        (result.reason ? `  (${result.reason})` : "")
    );
    if (opts.showPath && result.path?.length) {
      for (const [i, op] of result.path.entries()) {
        console.log(
          `  ${String(i + 1).padStart(3)}. ${
            op.op === "move" ? `move ${op.rank}${op.suit[0]} ${op.from}→${op.to}` : op.op
          }`
        );
      }
    }
  }
}

if (opts.json) {
  console.log(JSON.stringify(rows.length === 1 ? rows[0] : rows, null, 2));
}
