#!/usr/bin/env node
/**
 * Clear Portal/catalog seed pools by gameType (+ optional poolVersion).
 *
 *   npx tsx scripts/seed-catalog/clear-seed-pool.mjs solitaire --apply
 *   npx tsx scripts/seed-catalog/clear-seed-pool.mjs solitaire --pool-version=v6 --apply
 *   SEED_CATALOG_CONVEX_DIR=src/convex/portal npx tsx … solitaire --apply --prod
 */
import {
  clearSeedPoolsForGame,
  listPoolVersionsForGame,
} from "./run-convex-catalog.mjs";
import {
  gameAliasHelp,
  normalizeGameAlias,
} from "./default-pool-index.mjs";

const CATALOG_GAMES = new Set([
  "solitaire",
  "block_blast",
  "match_3",
  "tower_arena",
  "yatz",
]);

function printHelp() {
  console.log(`Usage:
  npm run op -- seeds clear --game=<type> [--pool-version=<v>] [--apply] [--prod]

  --game / positional     ${gameAliasHelp()}
  --pool-version / -v     omit or empty = clear ALL versions for that game
  --apply                 required to delete (default dry-run lists targets)
  --prod                  Portal/catalog production deployment

Examples:
  npm run op -- seeds clear --game=solitaire
  npm run op -- seeds clear --game=solitaire --apply
  npm run op -- seeds clear --game=solitaire --pool-version=v6 --apply
  npm run op -- seeds clear --game=solitaire --apply --prod`);
}

function parseArgs(argv) {
  const opts = {
    gameType: "",
    poolVersion: undefined,
    apply: argv.includes("--apply"),
    help: argv.some((a) => a === "help" || a === "-h" || a === "--help"),
    convexArgs: argv.includes("--prod") ? ["--prod"] : [],
  };
  const flags = [...argv];
  if (flags.length > 0 && !flags[0].startsWith("-")) {
    opts.gameType = flags.shift();
  }
  for (let i = 0; i < flags.length; i++) {
    const a = flags[i];
    const next = () => flags[++i];
    if (a === "--game" || a === "--game-type") opts.gameType = next();
    else if (a.startsWith("--game=")) opts.gameType = a.slice("--game=".length);
    else if (a === "--pool-version" || a === "-v" || a === "--version") {
      opts.poolVersion = next();
    } else if (a.startsWith("--pool-version=")) {
      opts.poolVersion = a.slice("--pool-version=".length);
    } else if (a === "--apply" || a === "--prod" || a === "help" || a === "-h" || a === "--help") {
      // handled above / ignore
    }
  }
  // Explicit empty string → all versions
  if (opts.poolVersion === "") opts.poolVersion = null;
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.gameType) {
    printHelp();
    process.exit(opts.help || opts.gameType ? 0 : 1);
  }

  const gameType = normalizeGameAlias(opts.gameType);
  if (!CATALOG_GAMES.has(gameType)) {
    console.error(`unknown gameType: ${opts.gameType} (want ${gameAliasHelp()})`);
    process.exit(1);
  }

  const versionLabel =
    opts.poolVersion == null || opts.poolVersion === undefined
      ? "(all versions)"
      : opts.poolVersion;

  console.log("== clear seed pool ==");
  console.log(`  gameType: ${gameType}`);
  console.log(`  poolVersion: ${versionLabel}`);
  console.log(`  target: ${opts.convexArgs.includes("--prod") ? "prod" : "dev"}`);
  console.log(`  mode: ${opts.apply ? "APPLY" : "dry-run"}`);

  const listed = await listPoolVersionsForGame(gameType, {
    convexArgs: opts.convexArgs,
  });
  const allVersions = listed?.poolVersions ?? [];
  const clearAll =
    opts.poolVersion == null || opts.poolVersion === undefined;
  const targets = clearAll ? allVersions : [opts.poolVersion];

  console.log("\n[live meta]");
  console.log(
    JSON.stringify(
      {
        poolVersions: allVersions,
        pools: listed?.pools ?? [],
        willClear: targets,
      },
      null,
      2
    )
  );

  if (!opts.apply) {
    console.log("\nDry-run only. Re-run with --apply to delete.");
    return;
  }

  if (
    (opts.poolVersion == null || opts.poolVersion === undefined) &&
    targets.length === 0
  ) {
    console.log("\nNothing to clear.");
    return;
  }

  const result = await clearSeedPoolsForGame(gameType, opts.poolVersion ?? null, {
    convexArgs: opts.convexArgs,
  });
  console.log("\nDone:", JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
