#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { clearSeedPoolFully } from "./run-convex-match3.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runNode(script, extra = []) {
  const res = spawnSync(process.execPath, ["--import", "tsx", path.join(__dirname, script), ...extra], {
    stdio: "inherit",
    cwd: path.resolve(__dirname, "../.."),
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

const cmd = process.argv[2];
const rest = process.argv.slice(3);

async function main() {
  if (cmd === "create") {
    runNode("generate-seed-pool.mjs", rest);
  } else if (cmd === "load") {
    const clearFirst = !rest.includes("--no-clear");
    const args = [...rest.filter((x) => x !== "--no-clear")];
    if (clearFirst) {
      try {
        await clearSeedPoolFully("v1");
      } catch {
        /* pool may not exist yet */
      }
    }
    runNode("import-seed-pool-to-convex.mjs", ["--clear-first", ...args]);
  } else if (cmd === "help" || !cmd) {
    console.log(`Match-3 seed pool CLI

  npx tsx scripts/match3/seed-pool.mjs create [--count 50]
  npx tsx scripts/match3/seed-pool.mjs load [--no-clear]
`);
  } else {
    console.error(`unknown command: ${cmd}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
