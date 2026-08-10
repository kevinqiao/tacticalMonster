#!/usr/bin/env node
/**
 * 对已有 index.json 批量检查可解性，结果写入独立 solvability.json（默认不改 index）。
 * 加 --merge-index 时，把 solvable* 写回 index.json 的 entry（便于 import 入库）。
 *
 *   npx tsx scripts/solitaire/annotate-solvability.mjs --in scripts/solitaire/output/pool-v6
 *   npx tsx scripts/solitaire/annotate-solvability.mjs --in ... --merge-index --resume
 */
import { access, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadPoolDefaults } from "./solitaire-pool-defaults.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

function usage() {
  console.log(`Write solvability report (default: does NOT modify index.json)

Usage:
  npx tsx scripts/solitaire/annotate-solvability.mjs --in <poolDir>
  npx tsx scripts/solitaire/annotate-solvability.mjs --index <index.json>

Options:
  --out <path>            输出文件（默认 <indexDir>/solvability.json）
  --merge-index           把 solvable* 写回 index.json entry
  --resume                跳过输出文件中已有 seedId（默认开启）
  --force                 重算全部（关闭 resume）
  --limit <n>             最多新处理 n 条（调试）
  --offset <n>            从 index 第 n 条开始（0-based）
  --algorithm greedy|bfs|dfs  默认 greedy
  --max-nodes <n>         默认 200000
  --timeout-ms <n>        默认 30000
  --complete              完备搜索（可证明 unsolvable；极慢）
  --allow-foundation-pull 允许 foundation→tableau
  --no-prefer-foundation  关闭「有 foundation 着法时只走 foundation」
  --checkpoint-every <n>  每 n 条原子写回输出文件（默认 10）
  --json-summary          结束时打印计数 JSON
`);
}

function parseArgs(argv) {
  const opts = {
    inDir: "",
    index: "",
    out: "",
    mergeIndex: false,
    resume: true,
    force: false,
    limit: 0,
    offset: 0,
    algorithm: "greedy",
    maxNodes: 200_000,
    timeoutMs: 30_000,
    allowFoundationToTableau: false,
    preferFoundation: true,
    checkpointEvery: 10,
    jsonSummary: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--in") opts.inDir = path.resolve(next());
    else if (a === "--index") opts.index = path.resolve(next());
    else if (a === "--out") opts.out = path.resolve(next());
    else if (a === "--merge-index") opts.mergeIndex = true;
    else if (a === "--resume") opts.resume = true;
    else if (a === "--force") {
      opts.force = true;
      opts.resume = false;
    } else if (a === "--limit") opts.limit = Number(next());
    else if (a === "--offset") opts.offset = Number(next());
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
    else if (a === "--checkpoint-every") opts.checkpointEvery = Number(next());
    else if (a === "--json-summary") opts.jsonSummary = true;
  }
  return opts;
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function atomicWriteJson(filePath, data) {
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, filePath);
}

function buildReport({
  poolVersion,
  indexPath,
  outPath,
  solveOpts,
  bySeedId,
  generatedAt,
}) {
  const entries = [...bySeedId.values()].sort((a, b) =>
    a.seedId.localeCompare(b.seedId)
  );
  const counts = {
    total: entries.length,
    solvable: 0,
    unsolvable: 0,
    unknown: 0,
    empirical: 0,
    searched: 0,
  };
  for (const e of entries) {
    counts[e.status] = (counts[e.status] ?? 0) + 1;
    if (e.source === "empirical_completed") counts.empirical += 1;
    if (e.source === "search") counts.searched += 1;
  }
  return {
    poolVersion,
    sourceIndex: indexPath,
    outPath,
    generatedAt: generatedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    solveOptions: solveOpts,
    counts,
    entries,
  };
}

function mergeSolvabilityIntoIndex(raw, bySeedId, computeClearEaseScore) {
  let merged = 0;
  const entries = (raw.entries ?? []).map((e) => {
    const row = bySeedId.get(e.seedId);
    if (!row) return e;
    merged += 1;
    const clearEaseScore =
      typeof computeClearEaseScore === "function"
        ? computeClearEaseScore({
            openingMoveCount: e.metrics?.openingMoveCount ?? 0,
            solvable: row.status,
            solvableSource: row.source,
            pathLength: row.pathLength,
            nodesExpanded: row.nodesExpanded,
          })
        : e.metrics?.clearEaseScore ?? 0;
    return {
      ...e,
      solvable: row.status,
      solvableSource: row.source,
      solvableReason: row.reason ?? null,
      metrics: {
        ...(e.metrics ?? {}),
        clearEaseScore,
        /** Platform segment-A semantic (Solitaire ritual = clearEase). */
        onboardingScore: clearEaseScore,
      },
    };
  });
  return {
    next: { ...raw, entries, solvabilityMergedAt: new Date().toISOString() },
    merged,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    usage();
    process.exit(0);
  }

  const defaults = await loadPoolDefaults(repoRoot);
  const indexPath =
    opts.index ||
    (opts.inDir
      ? path.join(opts.inDir, "index.json")
      : path.join(defaults.outDir, "index.json"));
  const outPath =
    opts.out || path.join(path.dirname(indexPath), "solvability.json");

  if (path.resolve(outPath) === path.resolve(indexPath)) {
    console.error("Refusing to write solvability over index.json; use a separate --out path.");
    process.exit(1);
  }

  const solverPath = path.join(
    repoRoot,
    "src/convex/solitaireArena/convex/service/seedPool/solitaireSolver.ts"
  );
  const difficultyPath = path.join(
    repoRoot,
    "src/convex/solitaireArena/convex/service/seedPool/solitaireSeedDifficulty.ts"
  );
  const { resolveSeedSolvability } = await import(pathToFileURL(solverPath).href);
  const { computeClearEaseScore } = await import(pathToFileURL(difficultyPath).href);

  const raw = JSON.parse(await readFile(indexPath, "utf8"));
  const indexEntries = raw.entries ?? [];
  const poolVersion = raw.poolVersion ?? defaults.poolVersion ?? "v6";

  /** @type {Map<string, object>} */
  const bySeedId = new Map();
  let generatedAt;
  if (await fileExists(outPath)) {
    const prev = JSON.parse(await readFile(outPath, "utf8"));
    generatedAt = prev.generatedAt;
    for (const e of prev.entries ?? []) {
      if (e?.seedId) bySeedId.set(e.seedId, e);
    }
  }

  const start = Math.max(0, opts.offset);
  const end =
    opts.limit > 0 ? Math.min(indexEntries.length, start + opts.limit) : indexEntries.length;

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

  const session = {
    skipped: 0,
    empirical: 0,
    solvable: 0,
    unsolvable: 0,
    unknown: 0,
    searched: 0,
    processed: 0,
  };

  let dirty = 0;

  console.log(
    `solvability report\n` +
      `  index=${indexPath}\n` +
      `  out=${outPath}\n` +
      `  mergeIndex=${opts.mergeIndex}\n` +
      `  range=[${start}, ${end})  resume=${opts.resume}  maxNodes=${opts.maxNodes}  timeoutMs=${opts.timeoutMs}`
  );

  for (let i = start; i < end; i++) {
    const entry = indexEntries[i];
    if (!entry?.seedId) continue;

    if (opts.resume && bySeedId.has(entry.seedId)) {
      session.skipped += 1;
      continue;
    }

    const annotatedAt = new Date().toISOString();
    const ann = resolveSeedSolvability({
      seedId: entry.seedId,
      hasAnyCompleted: entry.metrics?.hasAnyCompleted,
      rolloutSummaries: entry.rolloutSummaries,
      solveOpts,
    });

    const row = {
      seedId: entry.seedId,
      status: ann.solvable,
      source: ann.solvableSource,
      nodesExpanded: ann.nodesExpanded ?? null,
      uniqueStates: ann.uniqueStates ?? null,
      elapsedMs: ann.elapsedMs ?? null,
      pathLength: ann.pathLength ?? null,
      reason: ann.solvableReason,
      annotatedAt,
    };
    if (ann.solvableSource === "empirical_completed") {
      session.empirical += 1;
      session.solvable += 1;
    } else {
      session.searched += 1;
      session[ann.solvable] += 1;
    }

    bySeedId.set(entry.seedId, row);
    dirty += 1;
    session.processed += 1;

    const mark =
      row.status === "solvable" ? "✓" : row.status === "unsolvable" ? "✗" : "?";
    console.log(
      `${mark} [${i + 1}/${indexEntries.length}] ${entry.seedId}  ${row.status}` +
        `  via=${row.source}` +
        (row.pathLength != null ? `  path=${row.pathLength}` : "") +
        (row.source === "search" && row.nodesExpanded != null
          ? `  nodes=${row.nodesExpanded}  ${row.elapsedMs}ms`
          : "") +
        (row.reason ? `  (${row.reason})` : "")
    );

    if (dirty >= opts.checkpointEvery) {
      await atomicWriteJson(
        outPath,
        buildReport({
          poolVersion,
          indexPath,
          outPath,
          solveOpts,
          bySeedId,
          generatedAt,
        })
      );
      dirty = 0;
      console.log(`  checkpoint → ${outPath} (processed=${session.processed} stored=${bySeedId.size})`);
    }
  }

  const report = buildReport({
    poolVersion,
    indexPath,
    outPath,
    solveOpts,
    bySeedId,
    generatedAt,
  });
  if (!generatedAt) report.generatedAt = report.updatedAt;
  await atomicWriteJson(outPath, report);

  if (opts.mergeIndex) {
    const { next, merged } = mergeSolvabilityIntoIndex(raw, bySeedId, computeClearEaseScore);
    await atomicWriteJson(indexPath, next);
    console.log(`merged solvable* into index: ${merged} entries → ${indexPath}`);
  }

  console.log(
    `done: processed=${session.processed} skipped=${session.skipped} ` +
      `solvable=${session.solvable} (empirical=${session.empirical}) ` +
      `unsolvable=${session.unsolvable} unknown=${session.unknown} searched=${session.searched} ` +
      `stored=${bySeedId.size} → ${outPath}`
  );
  if (opts.jsonSummary) {
    console.log(JSON.stringify({ session, reportCounts: report.counts }, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
