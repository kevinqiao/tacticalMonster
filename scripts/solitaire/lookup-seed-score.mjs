#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

function parseArgs(argv) {
  const opts = {
    seed: "",
    score: NaN,
    index: path.join(repoRoot, "scripts/solitaire/output/pool-v2-smoke/index.json"),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--seed") opts.seed = next();
    else if (a === "--score") opts.score = Number(next());
    else if (a === "--index") opts.index = path.resolve(next());
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.seed || !Number.isFinite(opts.score)) {
    console.error("Usage: lookup-seed-score.mjs --seed <seedId> --score <number> [--index path]");
    process.exit(1);
  }

  const lookupPath = path.join(
    repoRoot,
    "src/convex/solitaireArena/convex/service/seedPool/solitaireSeedScoreLookup.ts"
  );
  const { resolvePlayerSeedScore } = await import(pathToFileURL(lookupPath).href);

  const raw = await readFile(opts.index, "utf8");
  const index = JSON.parse(raw);
  const entry = (index.entries ?? []).find((e) => e.seedId === opts.seed);
  if (!entry) {
    console.error(`seed not found: ${opts.seed}`);
    process.exit(1);
  }

  const result = resolvePlayerSeedScore(entry, opts.score);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
