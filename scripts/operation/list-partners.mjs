#!/usr/bin/env node
/**
 * List partner configs under scripts/operation/partners/.
 *
 *   npm run op -- partner list
 */
import { wantsHelp } from "./lib/args.mjs";
import { listPartnerConfigKeys, loadPartnerConfig } from "./lib/config.mjs";

function printHelp() {
  console.log(`Usage:
  npm run op -- partner list

Lists scripts/operation/partners/*.json (skips _template).
Shows pid, lobby/sku/shop/staff counts, and name.`);
}

const argv = process.argv.slice(2);
if (wantsHelp(argv)) {
  printHelp();
  process.exit(0);
}

const keys = listPartnerConfigKeys();
if (keys.length === 0) {
  console.log("No partner configs in scripts/operation/partners/");
  process.exit(0);
}

console.log("== operation partners ==");
for (const key of keys) {
  try {
    const cfg = loadPartnerConfig(key);
    console.log(
      `  ${key.padEnd(20)} pid=${String(cfg.pid).padStart(4)}  lobbies=${cfg.lobbies.length}  skus=${cfg.shopSkus.length}  shop=${cfg.shopSettings ? "y" : "n"}  staff=${cfg.staff.length}  ${cfg.name}`
    );
  } catch (e) {
    console.log(`  ${key.padEnd(20)} INVALID: ${e.message}`);
  }
}
