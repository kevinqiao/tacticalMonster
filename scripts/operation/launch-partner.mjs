#!/usr/bin/env node
/**
 * Clean test relaunch: wipe partner config → (optional) platform admin → apply JSON.
 *
 * Steps:
 *   1) wipe Portal + SSO partner config (same as op:wipe)
 *   2) bootstrap platform admin (optional, --skip-platform-admin to omit)
 *   3) op:apply full partner config (SSO embed, GC ops, lobbies, shop, staff)
 *
 * Usage:
 *   npm run op:launch -- --partner=demo-partner
 *   npm run op:launch -- --partner=demo-partner --apply
 *   npm run op:launch -- --partner=crazygames --apply
 *
 * Staff passwords: set PARTNER_STAFF_PASSWORD_* before --apply when config has staff[].
 * Seed pools are never wiped; run portal:seed-pool:bootstrap once separately if needed.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseCommonArgs } from "./lib/args.mjs";
import { loadPartnerConfig } from "./lib/config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function runNode(scriptRel, args) {
  const script = path.join(root, scriptRel);
  console.log(`\n>>> node ${scriptRel} ${args.join(" ")}`);
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`step_failed:${scriptRel}`);
  }
}

function main() {
  const argv = process.argv.slice(2);
  const flags = parseCommonArgs(argv);
  const skipPlatformAdmin = argv.includes("--skip-platform-admin");
  const skipWipe = argv.includes("--skip-wipe");
  const allowProd = argv.includes("--allow-prod");

  if (flags.help || !flags.partner) {
    console.log(`Usage:
  node scripts/operation/launch-partner.mjs --partner=<slug> [--apply] [--prod --allow-prod]
  Flags: --skip-wipe --skip-platform-admin`);
    process.exit(flags.help ? 0 : 1);
  }

  if (flags.prod && flags.apply && !allowProd) {
    console.error(
      "Refusing launch wipe on --prod without --allow-prod.\n" +
        "Test env: omit --prod."
    );
    process.exit(1);
  }

  const cfg = loadPartnerConfig(flags.partner);
  console.log("== operation launch-partner ==");
  console.log(`  partner: ${cfg.slug} pid=${cfg.pid}`);
  console.log(`  mode: ${flags.apply ? "APPLY" : "dry-run"}`);
  console.log(`  target: ${flags.prod ? "PROD" : "dev"}`);
  console.log("  plan:");
  console.log(`    1. wipe${skipWipe ? " (skip)" : ""}`);
  console.log(`    2. platform admin${skipPlatformAdmin ? " (skip)" : ""}`);
  console.log("    3. apply-partner (SSO + portal + lobbies + shop + staff)");

  if (!flags.apply) {
    console.log("\nDry run only — showing child dry-runs:\n");
  }

  const common = [];
  if (flags.apply) common.push("--apply");
  if (flags.prod) common.push("--prod");
  if (allowProd) common.push("--allow-prod");

  if (!skipWipe) {
    runNode("scripts/operation/wipe-partner.mjs", [
      `--partner=${flags.partner}`,
      ...common,
    ]);
  }

  if (!skipPlatformAdmin) {
    const adminArgs = flags.apply ? ["--apply"] : [];
    if (flags.prod) adminArgs.push("--prod");
    runNode("scripts/platform/bootstrap-platform-admin.mjs", adminArgs);
  }

  runNode("scripts/operation/apply-partner.mjs", [
    `--partner=${flags.partner}`,
    ...(flags.apply ? ["--apply"] : []),
    ...(flags.prod ? ["--prod"] : []),
  ]);

  console.log("\n================ LAUNCH READY ================");
  console.log(`Partner: pid=${cfg.pid} slug=${cfg.slug}`);
  const defaultLobby = cfg.lobbies.find((l) => l.isDefault) ?? cfg.lobbies[0];
  if (defaultLobby) {
    const pathUrl =
      defaultLobby.isDefault || defaultLobby.slug === "default"
        ? `/gc/${cfg.slug}`
        : `/gc/${cfg.slug}/${defaultLobby.slug}`;
    console.log(`Lobby entry: ${pathUrl}`);
  }
  console.log("Verify: npm run op:status -- --partner=" + flags.partner);
  console.log("=============================================");
}

try {
  main();
} catch (err) {
  console.error("launch-partner failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
