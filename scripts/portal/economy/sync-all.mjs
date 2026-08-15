#!/usr/bin/env node
/**
 * Run both economy generators:
 *   portal-economy.json          → portalEconomyGenerated.ts  (shared play + platform)
 *   mayfield-zone-economy.json   → townEconomyGenerated.ts    (Mayfield zone / mayor)
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function printHelp() {
  console.log(`Usage:
  npm run portal:economy:sync
  npm run portal:economy:sync:check
  npm run op -- economy sync
  npm run op -- economy check

Runs:
  1) sync.mjs       portal-economy.json → portalEconomyGenerated.ts
     Shared play + platform defaults (Town and Lobby). Not Lobby-only.
  2) sync-town.mjs  mayfield-zone-economy.json → townEconomyGenerated.ts
     Mayfield zone / mayor / district only.

Flags:
  --check      fail on drift (no write)
  --dry-run    print whether write would happen`);
}

function run(script) {
  const r = spawnSync(process.execPath, [join(__dirname, script), ...args], {
    stdio: "inherit",
  });
  return r.status ?? 1;
}

if (args.some((a) => a === "help" || a === "-h" || a === "--help")) {
  printHelp();
  process.exit(0);
}

const shared = run("sync.mjs");
const town = run("sync-town.mjs");
process.exit(shared || town);
