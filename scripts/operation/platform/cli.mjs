#!/usr/bin/env node
/**
 * Platform ops: staff / maintenance / brand / vouchers.
 * Invoked via: npm run op -- platform …
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getArg,
  parseCommonArgs,
  parseNullableEnum,
  wantsHelp,
} from "../lib/args.mjs";
import { loadPartnerConfig } from "../lib/config.mjs";
import {
  portalVoucherOp,
  portalVouchersList,
  resolvePortalTarget,
} from "../lib/portalHttp.mjs";
import {
  getPlatformStatusPublic,
  listPlatformTeamOps,
  resolvePlatformBootstrapSecret,
  setPlatformStatusOps,
  syncPartnerBrandOps,
} from "../lib/ssoOps.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

const STATUS_MODES = new Set(["normal", "pre_notice", "maintenance"]);

function printHelp() {
  console.log(`Platform ops:

  staff bootstrap [--email] [--password] [--apply] [--prod]
  staff list [--prod]
  status get [--prod]
  status set --mode=normal|pre_notice|maintenance [--title] [--message] [--apply] [--prod]
  brand sync --partner=<slug> --url=<https://…> [--apply] [--prod]
  vouchers list --partner=<slug> [--prod]
  vouchers confirm|reject|void --partner=<slug> --id=<itemId> [--apply] [--prod]
  vouchers redeem --partner=<slug> --code=<code> [--apply] [--prod]

Examples:
  npm run op -- platform staff list
  npm run op -- platform status get
  npm run op -- platform vouchers list --partner=demo-partner
  npm run op -- platform vouchers --help`);
}

function printStaffHelp() {
  console.log(`Platform staff:

  bootstrap [--email] [--password] [--apply] [--prod]
      Seed /platform/admin login (wraps bootstrap-platform-admin.mjs).
      Dry-run without --apply.

  list [--prod]
      List platform_staff via bootstrap secret.

Examples:
  npm run op -- platform staff bootstrap --apply
  npm run op -- platform staff list`);
}

function printStatusHelp() {
  console.log(`Platform maintenance status:

  get [--prod]
      Read current mode (normal|pre_notice|maintenance).

  set --mode=normal|pre_notice|maintenance [--title] [--message] [--apply] [--prod]
      Set status and sync to Portal. Requires --apply to write.

Examples:
  npm run op -- platform status get
  npm run op -- platform status set --mode=maintenance --title="Down" --apply`);
}

function printBrandHelp() {
  console.log(`Platform brand:

  sync --partner=<slug> --url=<https://…> [--apply] [--prod]
      Fetch theme from URL into SSO brand draft. Requires --apply to write.

Example:
  npm run op -- platform brand sync --partner=demo-partner --url=https://example.com --apply`);
}

function printVouchersHelp() {
  console.log(`Platform vouchers (Portal redemption inbox):

  list --partner=<slug> [--prod]
  confirm --partner=<slug> --id=<itemId> [--apply] [--prod]
  reject  --partner=<slug> --id=<itemId> [--apply] [--prod]
  void    --partner=<slug> --id=<itemId> [--apply] [--prod]
  redeem  --partner=<slug> --code=<code> [--apply] [--prod]

Writes require --apply (except list).

Examples:
  npm run op -- platform vouchers list --partner=demo-partner
  npm run op -- platform vouchers confirm --partner=demo-partner --id=… --apply`);
}

function staffBootstrap(argv) {
  if (wantsHelp(argv)) {
    printStaffHelp();
    return;
  }
  const script = path.join(
    REPO_ROOT,
    "scripts/platform/bootstrap-platform-admin.mjs"
  );
  const r = spawnSync(process.execPath, [script, ...argv], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  process.exit(r.status ?? 1);
}

async function staffList(argv) {
  if (wantsHelp(argv)) {
    printStaffHelp();
    return;
  }
  const flags = parseCommonArgs(argv);
  const { secret, source } = resolvePlatformBootstrapSecret(flags.prod);
  console.log("== platform staff list ==");
  console.log(`  secret: ${source}  target: ${flags.prod ? "prod" : "dev"}`);
  const out = listPlatformTeamOps(secret, { prod: flags.prod });
  console.log(JSON.stringify(out, null, 2));
}

async function statusGet(argv) {
  if (wantsHelp(argv)) {
    printStatusHelp();
    return;
  }
  const flags = parseCommonArgs(argv);
  console.log("== platform status get ==");
  console.log(`  target: ${flags.prod ? "prod" : "dev"}`);
  const out = getPlatformStatusPublic({ prod: flags.prod });
  console.log(JSON.stringify(out, null, 2));
}

async function statusSet(argv) {
  if (wantsHelp(argv)) {
    printStatusHelp();
    return;
  }
  const flags = parseCommonArgs(argv);
  const mode = parseNullableEnum(
    getArg(argv, ["--mode"]),
    STATUS_MODES,
    "mode"
  );
  if (!mode) {
    console.error("--mode=normal|pre_notice|maintenance required");
    printStatusHelp();
    process.exit(1);
  }
  const title = getArg(argv, ["--title"]);
  const message = getArg(argv, ["--message"]);
  console.log("== platform status set ==");
  console.log(`  mode=${mode}`);
  console.log(`  target: ${flags.prod ? "prod" : "dev"}`);
  console.log(`  mode: ${flags.apply ? "APPLY" : "dry-run"}`);
  if (!flags.apply) {
    console.log("\nDry-run only. Re-run with --apply.");
    return;
  }
  const { secret } = resolvePlatformBootstrapSecret(flags.prod);
  const out = setPlatformStatusOps(
    secret,
    {
      mode,
      ...(title !== undefined ? { title } : {}),
      ...(message !== undefined ? { message } : {}),
    },
    { prod: flags.prod }
  );
  console.log(JSON.stringify(out, null, 2));
}

async function brandSync(argv) {
  if (wantsHelp(argv)) {
    printBrandHelp();
    return;
  }
  const flags = parseCommonArgs(argv);
  const url = getArg(argv, ["--url", "--source-url", "--sourceUrl"]);
  if (!flags.partner || !url) {
    console.error("--partner=<slug> and --url=<https://…> required");
    printBrandHelp();
    process.exit(1);
  }
  const cfg = loadPartnerConfig(flags.partner);
  console.log("== platform brand sync ==");
  console.log(`  partner pid=${cfg.pid} slug=${cfg.slug}`);
  console.log(`  url=${url}`);
  console.log(`  mode: ${flags.apply ? "APPLY" : "dry-run"}`);
  if (!flags.apply) {
    console.log("\nDry-run only. Re-run with --apply.");
    return;
  }
  const { secret } = resolvePlatformBootstrapSecret(flags.prod);
  const out = syncPartnerBrandOps(
    secret,
    { partnerId: cfg.pid, sourceUrl: url },
    { prod: flags.prod }
  );
  console.log(JSON.stringify(out, null, 2));
}

async function vouchers(cmd, argv) {
  if (wantsHelp([cmd, ...argv]) || cmd === "help" || cmd === "-h" || cmd === "--help") {
    printVouchersHelp();
    return;
  }
  const flags = parseCommonArgs(argv);
  if (!flags.partner) {
    console.error("--partner=<slug> required");
    printVouchersHelp();
    process.exit(1);
  }
  const cfg = loadPartnerConfig(flags.partner);
  const target = resolvePortalTarget({ prod: flags.prod });
  console.log(`== platform vouchers ${cmd} ==`);
  console.log(`  partner pid=${cfg.pid} slug=${cfg.slug}`);
  console.log(`  portal: ${target.siteUrl}`);

  if (cmd === "list") {
    const out = await portalVouchersList(target, cfg.pid);
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (cmd === "redeem") {
    const code = getArg(argv, ["--code"]);
    if (!code) {
      console.error("--code required");
      printVouchersHelp();
      process.exit(1);
    }
    console.log(`  mode: ${flags.apply ? "APPLY" : "dry-run"}`);
    if (!flags.apply) {
      console.log("\nDry-run only. Re-run with --apply.");
      return;
    }
    const out = await portalVoucherOp(target, cfg.pid, "redeem", { code });
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (cmd === "confirm" || cmd === "reject" || cmd === "void") {
    const id = getArg(argv, ["--id", "--itemId", "--item-id"]);
    if (!id) {
      console.error("--id=<itemId> required");
      printVouchersHelp();
      process.exit(1);
    }
    console.log(`  itemId=${id}`);
    console.log(`  mode: ${flags.apply ? "APPLY" : "dry-run"}`);
    if (!flags.apply) {
      console.log("\nDry-run only. Re-run with --apply.");
      return;
    }
    const out = await portalVoucherOp(target, cfg.pid, cmd, { itemId: id });
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  console.error(`Unknown vouchers command: ${cmd}`);
  printVouchersHelp();
  process.exit(1);
}

async function main() {
  const argv = process.argv.slice(2);
  const area = argv[0];
  const rest = argv.slice(1);

  if (!area || area === "help" || area === "-h" || area === "--help") {
    printHelp();
    return;
  }

  if (area === "staff") {
    const cmd = rest[0];
    if (!cmd || wantsHelp([cmd]) || cmd === "help") {
      printStaffHelp();
      process.exit(cmd && cmd !== "help" && !wantsHelp([cmd]) ? 1 : 0);
    }
    if (cmd === "bootstrap") {
      staffBootstrap(rest.slice(1));
      return;
    }
    if (cmd === "list") {
      await staffList(rest.slice(1));
      return;
    }
    console.error(`Unknown staff command: ${cmd}`);
    printStaffHelp();
    process.exit(1);
  }

  if (area === "status") {
    const cmd = rest[0];
    if (!cmd || wantsHelp([cmd]) || cmd === "help") {
      printStatusHelp();
      process.exit(cmd && cmd !== "help" && !wantsHelp([cmd]) ? 1 : 0);
    }
    if (cmd === "get") {
      await statusGet(rest.slice(1));
      return;
    }
    if (cmd === "set") {
      await statusSet(rest.slice(1));
      return;
    }
    console.error(`Unknown status command: ${cmd}`);
    printStatusHelp();
    process.exit(1);
  }

  if (area === "brand") {
    const cmd = rest[0];
    if (!cmd || wantsHelp([cmd]) || cmd === "help") {
      printBrandHelp();
      process.exit(cmd && cmd !== "help" && !wantsHelp([cmd]) ? 1 : 0);
    }
    if (cmd === "sync") {
      await brandSync(rest.slice(1));
      return;
    }
    console.error(`Unknown brand command: ${cmd}`);
    printBrandHelp();
    process.exit(1);
  }

  if (area === "vouchers" || area === "voucher") {
    const cmd = rest[0];
    if (!cmd || wantsHelp([cmd]) || cmd === "help") {
      printVouchersHelp();
      process.exit(0);
    }
    await vouchers(cmd, rest.slice(1));
    return;
  }

  console.error(`Unknown platform area: ${area}`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error("platform ops failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
