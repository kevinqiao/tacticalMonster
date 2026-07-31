#!/usr/bin/env node
/**
 * Deploy Portal/Partner backends in order (SSO → Portal → Arenas).
 * Optional frontend: Netlify production deploy.
 *
 * Dry-run by default. --apply runs convex deploy (production deployment for each project).
 *
 * Usage:
 *   npm run op:deploy
 *   npm run op:deploy -- --apply
 *   npm run op:deploy -- --apply --games=solitaire,block_blast
 *   npm run op:deploy -- --apply --frontend
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const ARENA_BY_GAME = {
  solitaire: "src/convex/solitaireArena",
  block_blast: "src/convex/blockBlast",
  match_3: "src/convex/match3Arena",
  tower_arena: "src/convex/towerArena",
  yatz: "src/convex/yatzArena",
};

function parseArgs(argv) {
  const get = (name) => {
    const prefixed = argv.find((a) => a.startsWith(`${name}=`));
    if (prefixed) return prefixed.slice(name.length + 1);
    const idx = argv.indexOf(name);
    if (idx === -1 || idx + 1 >= argv.length) return undefined;
    return argv[idx + 1];
  };
  const gamesRaw = get("--games");
  const games = gamesRaw
    ? gamesRaw
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean)
    : Object.keys(ARENA_BY_GAME);
  return {
    apply: argv.includes("--apply"),
    frontend: argv.includes("--frontend"),
    games,
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

function run(cmd, args, cwd) {
  console.log(`\n$ ${cmd} ${args.join(" ")}  (cwd=${path.relative(root, cwd) || "."})`);
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(`command_failed:${cmd} ${args.join(" ")}`);
  }
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log(`Usage:
  node scripts/operation/deploy.mjs [--apply] [--frontend] [--games=solitaire,block_blast]
Order: sso → portal → arenas → (optional) build + netlify:deploy:prod`);
    process.exit(0);
  }

  const steps = [
    { name: "sso", cwd: path.join(root, "src/convex/sso") },
    { name: "portal", cwd: path.join(root, "src/convex/portal") },
  ];
  for (const game of flags.games) {
    const rel = ARENA_BY_GAME[game];
    if (!rel) throw new Error(`unknown_game:${game}`);
    steps.push({ name: `arena:${game}`, cwd: path.join(root, rel) });
  }
  if (flags.frontend) {
    steps.push({ name: "frontend:build", kind: "frontend" });
  }

  console.log("== operation deploy ==");
  console.log(`  mode: ${flags.apply ? "APPLY" : "dry-run"}`);
  console.log(`  games: ${flags.games.join(", ")}`);
  console.log(`  frontend: ${flags.frontend}`);
  console.log("  plan:");
  for (const s of steps) {
    if (s.kind === "frontend") {
      console.log("    - npm run build && npm run netlify:deploy:prod");
    } else {
      console.log(`    - npx convex deploy  (${s.name})`);
    }
  }

  if (!flags.apply) {
    console.log("\nDry run only. Re-run with --apply to deploy.");
    return;
  }

  for (const s of steps) {
    if (s.kind === "frontend") {
      run("npm", ["run", "build"], root);
      run("npm", ["run", "netlify:deploy:prod"], root);
    } else {
      run("npx", ["convex", "deploy"], s.cwd);
    }
  }

  console.log("\nDeploy finished. Next: npm run op:status -- --partner=<slug> --prod");
}

try {
  main();
} catch (err) {
  console.error("deploy failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
