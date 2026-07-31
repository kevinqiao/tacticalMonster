#!/usr/bin/env node
/**
 * List partner configs under scripts/operation/partners/.
 */
import { listPartnerConfigKeys, loadPartnerConfig } from "./lib/config.mjs";

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
