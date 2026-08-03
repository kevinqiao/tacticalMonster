#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

async function loadRunner() {
  const mod = await import(
    pathToFileURL(
      path.join(repoRoot, "src/convex/yatzArena/convex/service/seedPool/yatzSeedPoolRunner.ts")
    ).href
  );
  return mod;
}

async function loadSimulator() {
  const mod = await import(
    pathToFileURL(
      path.join(repoRoot, "src/convex/yatzArena/convex/service/seedPool/yatzSeedSimulator.ts")
    ).href
  );
  return mod;
}

function toRolloutSummaries(seedId, rolloutCount, simulateRollout) {
  const summaries = [];
  for (let r = 0; r < rolloutCount; r++) {
    const sim = simulateRollout(seedId, r);
    const elapsedMs =
      sim.replayPacingMs?.reduce((a, b) => a + b, 0) ?? sim.ops.length * 500;
    summaries.push({
      rolloutIndex: r,
      finalScore: sim.finalScore,
      moves: sim.ops.filter((o) => o.op === "pick_category").length,
      completed: sim.completed,
      terminalReason: sim.completed ? "completed" : "incomplete",
      elapsedSimSeconds: Math.max(1, Math.round(elapsedMs / 1000)),
      opCount: sim.ops.length,
    });
  }
  return summaries;
}

function parseArgs(argv) {
  const opts = {
    version: "v1",
    count: 50,
    start: 1,
    rollouts: 20,
    out: path.join(repoRoot, "scripts/yatz/output/pool-v1"),
    writeRolloutSummaries: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--version") opts.version = next();
    else if (a === "--count") opts.count = Number(next());
    else if (a === "--start") opts.start = Number(next());
    else if (a === "--rollouts") opts.rollouts = Number(next());
    else if (a === "--out") opts.out = path.resolve(next());
    else if (a === "--index-only") opts.writeRolloutSummaries = false;
    else if (a === "--write-rollout-summaries") opts.writeRolloutSummaries = true;
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { generateSeedPoolBatch } = await loadRunner();
  const result = generateSeedPoolBatch({
    poolVersion: opts.version,
    start: opts.start,
    count: opts.count,
    rolloutCount: opts.rollouts,
  });

  let entries = result.entries;
  if (opts.writeRolloutSummaries) {
    const { simulateRollout } = await loadSimulator();
    entries = entries.map((entry) => ({
      ...entry,
      rolloutSummaries: toRolloutSummaries(entry.seedId, opts.rollouts, simulateRollout),
    }));
  }

  await mkdir(opts.out, { recursive: true });
  const index = {
    poolVersion: opts.version,
    rolloutCount: opts.rollouts,
    generatedAt: new Date().toISOString(),
    entries,
  };
  await writeFile(path.join(opts.out, "index.json"), JSON.stringify(index, null, 2));
  await writeFile(path.join(opts.out, "rejected.json"), JSON.stringify(result.rejected, null, 2));

  const tierIndex = { easy: [], medium: [], hard: [] };
  for (const e of entries) {
    tierIndex[e.tier].push(e.seedId);
  }
  await writeFile(path.join(opts.out, "tier-index.json"), JSON.stringify(tierIndex, null, 2));

  console.log(
    `yatz pool generated: accepted=${entries.length} rejected=${result.rejected.length} summaries=${opts.writeRolloutSummaries} -> ${opts.out}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
