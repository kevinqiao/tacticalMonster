#!/usr/bin/env node
/**
 * Scaffold partners/<slug>.json from _template.json.
 *
 * Usage:
 *   npm run op:new -- --partner=acme --pid=42 --name="Acme Games"
 *   npm run op:new -- --partner=acme --pid=42 --apply
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getArg, parseCommonArgs, parseNullableInt } from "./lib/args.mjs";
import { scaffoldPartnerConfig } from "./lib/config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function printHelp() {
  console.log(`Usage:
  npm run op -- partner new --partner=<slug> --pid=<n> [--name=...] [--host=...] [--apply] [--prod]

Creates scripts/operation/partners/<slug>.json from _template.json.
With --apply, runs partner apply for the new partner.`);
}

async function main() {
  const argv = process.argv.slice(2);
  const flags = parseCommonArgs(argv);
  if (flags.help || !flags.partner) {
    printHelp();
    process.exit(flags.help ? 0 : 1);
  }

  const pid = parseNullableInt(getArg(argv, ["--pid"]), "pid");
  if (pid == null || pid < 0) {
    console.error("--pid=<number> required");
    process.exit(1);
  }
  const name = getArg(argv, ["--name"]) ?? flags.partner;
  const host = getArg(argv, ["--host"]) ?? "http://localhost:3000";

  console.log("== operation new-partner ==");
  console.log(`  slug=${flags.partner} pid=${pid} name=${name}`);
  console.log(`  host=${host}`);
  console.log(`  mode: ${flags.apply ? "scaffold + apply" : "scaffold only"}`);

  const filePath = scaffoldPartnerConfig({
    pid,
    slug: flags.partner,
    name,
    host,
  });
  console.log(`\n[JSON] created ${filePath}`);

  if (!flags.apply) {
    console.log("\nEdit the JSON, then: npm run op:apply -- --partner=" + flags.partner + " --apply");
    return;
  }

  const applyScript = path.join(__dirname, "apply-partner.mjs");
  const applyArgs = [
    applyScript,
    `--partner=${flags.partner}`,
    "--apply",
    ...(flags.prod ? ["--prod"] : []),
  ];
  console.log("\n[apply] launching…");
  const r = spawnSync(process.execPath, applyArgs, {
    cwd: path.resolve(__dirname, "../.."),
    stdio: "inherit",
  });
  process.exit(r.status ?? 1);
}

main().catch((err) => {
  console.error("new-partner failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
