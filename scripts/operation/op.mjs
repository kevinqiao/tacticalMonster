#!/usr/bin/env node
/**
 * Unified ops CLI entry: partner / economy / seeds / platform.
 *
 *   npm run op -- help
 *   npm run op -- partner apply --partner=demo-partner --apply
 *   npm run op -- economy sync
 *   npm run op -- seeds bootstrap
 *   npm run op -- platform status get
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { wantsHelp } from "./lib/args.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

function runNodeStatus(scriptRel, args) {
  const script = path.join(REPO_ROOT, scriptRel);
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  return r.status ?? 1;
}

function runNode(scriptRel, args) {
  process.exit(runNodeStatus(scriptRel, args));
}

function runNpx(binArgs) {
  const r = spawnSync("npx", binArgs, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  process.exit(r.status ?? 1);
}

function printHelp() {
  console.log(`Unified ops CLI — Partner + economy + seeds + platform

Usage: npm run op -- <domain> <command> [args…]
       npm run op -- <domain> help
       npm run op -- <domain> <command> --help

Domains:
  partner     Partner JSON SSOT (scripts/operation/partners/*.json)
  economy     Shared play + Mayfield town economy SSOTs (scripts/portal/economy/)
  seeds       Portal seed pools
  platform    Platform staff / maintenance / brand / vouchers

Partner:
  list | apply | status | new | wipe | launch | deploy
  play-entry | lobby-econ | gc-ops | profile | town-config

Economy:
  balance | sync | check

Seeds:
  bootstrap | import

Platform:
  staff bootstrap | staff list
  status get | status set --mode=normal|pre_notice|maintenance
  brand sync --partner=<slug> --url=<https://…>
  vouchers list|confirm|reject|void|redeem --partner=<slug>

Examples:
  npm run op -- partner apply --partner=demo-partner --apply
  npm run op -- economy sync
  npm run op -- seeds bootstrap
  npm run op -- seeds clear --game=solitaire
  npm run op -- platform status get
  npm run op -- platform staff bootstrap --apply

Legacy npm aliases still work: op:apply, portal:economy:sync, portal:seed-pool:bootstrap`);
}

function printPartnerHelp() {
  console.log(`Partner ops — SSOT: scripts/operation/partners/<slug>.json

Commands:
  list                          list local partner JSON configs
  new --partner= --pid=         scaffold from _template.json
  apply --partner= [--apply]    sync JSON → SSO + Portal [--prune]
  status --partner=             live Portal (+ SSO peek) + drift
  play-entry --partner=         ticket/ad entry on|off|null
  lobby-econ --partner=         lobbyOpsMode / quotaScope
  gc-ops --partner=             free/ad/ticket caps & replay knobs
  profile --partner=            name / host / playerAuth / capabilities
  town-config --partner=        town title / branding / template / wallet seed
  wipe --partner= [--apply]     wipe Portal+SSO partner config
  launch --partner= [--apply]   wipe → platform admin → apply
  deploy [--apply]              convex deploy order (+ optional frontend)

Examples:
  npm run op -- partner list
  npm run op -- partner apply --partner=demo-partner --apply
  npm run op -- partner gc-ops --help
  npm run op -- partner profile --partner=demo --name="Demo" --apply
  npm run op -- partner town-config --partner=demo --title="Saloon Row" --apply`);
}

function printEconomyHelp() {
  console.log(`Economy ops — two SSOTs under scripts/portal/economy/

  portal-economy.json          shared play + platform (Town and Lobby)
  mayfield-zone-economy.json   Mayfield zone / mayor / district only

Commands:
  balance     read-only reports (shared play + Mayfield zones)
  sync        write portalEconomyGenerated.ts + townEconomyGenerated.ts
  check       fail if either generated file drifts from JSON

Examples:
  npm run op -- economy balance
  npm run op -- economy sync
  npm run op -- economy check

After sync: deploy / convex dev Portal.
Partner overrides → npm run op -- partner gc-ops|apply (not these files).`);
}

function printSeedsHelp() {
  console.log(`Seeds ops — import / clear game seed pools on Portal Convex

Commands:
  bootstrap                 import all known game pools
  import --game=<type>      import one game (solitaire|block_blast|match_3|…)
  clear --game=<type>       delete pools (omit --pool-version = all versions)

Examples:
  npm run op -- seeds bootstrap
  npm run op -- seeds import --game=solitaire
  npm run op -- seeds import --game=solitaire --clear-first
  npm run op -- seeds import --game=solitaire --append
  npm run op -- seeds clear --game=solitaire
  npm run op -- seeds clear --game=solitaire --apply
  npm run op -- seeds clear --game=solitaire --pool-version=v6 --apply
  npm run op -- seeds import --help

Duplicate / re-run behavior:
  • bootstrap / full import upsert by gameType+poolVersion+seedId
    (re-run does NOT create duplicate rows for the same seedId)
  • bootstrap does NOT --clear-first: seeds removed from the index may linger
  • --clear-first  wipe that poolVersion then re-import (clean replace)
  • --append       skip seedIds already in DB (add-only; use --update-existing to overwrite)

Clear:
  • omit --pool-version (or pass empty) → clear ALL versions for that game
  • default dry-run; --apply required to delete
  • partner wipe does NOT delete seed pools`);
}

const PARTNER_CMDS = {
  list: "scripts/operation/list-partners.mjs",
  apply: "scripts/operation/apply-partner.mjs",
  status: "scripts/operation/status-partner.mjs",
  new: "scripts/operation/new-partner.mjs",
  wipe: "scripts/operation/wipe-partner.mjs",
  launch: "scripts/operation/launch-partner.mjs",
  deploy: "scripts/operation/deploy.mjs",
  "play-entry": "scripts/operation/set-play-entry.mjs",
  "lobby-econ": "scripts/operation/set-lobby-econ.mjs",
  "gc-ops": "scripts/operation/set-gc-ops.mjs",
  profile: "scripts/operation/set-partner-profile.mjs",
  "town-config": "scripts/operation/set-town-config.mjs",
};

function main() {
  const argv = process.argv.slice(2);
  // `op` / `op help` / `op --help`
  if (argv.length === 0 || (argv.length === 1 && wantsHelp(argv))) {
    printHelp();
    return;
  }

  const domain = argv[0];
  const rest = argv.slice(1);

  if (domain === "partner") {
    const cmd = rest[0];
    const args = rest.slice(1);
    if (!cmd || cmd === "help" || cmd === "-h" || cmd === "--help") {
      printPartnerHelp();
      process.exit(0);
    }
    if (!PARTNER_CMDS[cmd]) {
      console.error(`Unknown partner command: ${cmd}`);
      printPartnerHelp();
      process.exit(1);
    }
    // Ensure --help reaches the script even as bare "help"
    const forward = wantsHelp(args) && !args.includes("--help") && !args.includes("-h")
      ? ["--help", ...args.filter((a) => a !== "help")]
      : args.map((a) => (a === "help" ? "--help" : a));
    runNode(PARTNER_CMDS[cmd], forward);
    return;
  }

  if (domain === "economy") {
    const cmd = rest[0] ?? "help";
    const args = rest.slice(1);
    if (cmd === "help" || cmd === "-h" || cmd === "--help") {
      printEconomyHelp();
      return;
    }
    if (cmd === "balance") {
      if (wantsHelp(args)) {
        runNode("scripts/portal/economy/balance.mjs", ["--help"]);
        return;
      }
      const shared = runNodeStatus("scripts/portal/economy/balance.mjs", args);
      const town = runNodeStatus("scripts/portal/economy/zone-balance.mjs", args);
      process.exit(shared || town);
      return;
    }
    if (cmd === "sync") {
      runNode("scripts/portal/economy/sync-all.mjs", wantsHelp(args) ? ["--help"] : args);
      return;
    }
    if (cmd === "check") {
      if (wantsHelp(args)) {
        runNode("scripts/portal/economy/sync-all.mjs", ["--help"]);
        return;
      }
      runNode("scripts/portal/economy/sync-all.mjs", ["--check", ...args]);
      return;
    }
    console.error(`Unknown economy command: ${cmd}`);
    printEconomyHelp();
    process.exit(1);
  }

  if (domain === "seeds" || domain === "seed") {
    const cmd = rest[0] ?? "help";
    const args = rest.slice(1);
    if (cmd === "help" || cmd === "-h" || cmd === "--help") {
      printSeedsHelp();
      return;
    }
    if (cmd === "bootstrap") {
      runNpx([
        "tsx",
        "scripts/portal/bootstrap-seed-pools.mjs",
        ...(wantsHelp(args) ? ["--help"] : args),
      ]);
      return;
    }
    if (cmd === "import") {
      if (wantsHelp(args) || args.length === 0) {
        runNpx(["tsx", "scripts/portal/import-seed-pool.mjs", "--help"]);
        return;
      }
      const gameEq = args.find((a) => a.startsWith("--game="));
      const gameFlagIdx = args.indexOf("--game");
      let forward = args.filter(
        (a) => a !== "--game" && !a.startsWith("--game=")
      );
      let game =
        gameEq?.slice("--game=".length) ??
        (gameFlagIdx >= 0 ? args[gameFlagIdx + 1] : undefined);
      if (game && gameFlagIdx >= 0) {
        forward = forward.filter((a) => a !== game);
      }
      if (game) forward = [game, ...forward];
      runNpx(["tsx", "scripts/portal/import-seed-pool.mjs", ...forward]);
      return;
    }
    if (cmd === "clear" || cmd === "delete" || cmd === "rm") {
      if (wantsHelp(args) || args.length === 0) {
        runNpx(["tsx", "scripts/portal/clear-seed-pool.mjs", "--help"]);
        return;
      }
      const gameEq = args.find((a) => a.startsWith("--game="));
      const gameFlagIdx = args.indexOf("--game");
      let forward = args.filter(
        (a) => a !== "--game" && !a.startsWith("--game=")
      );
      let game =
        gameEq?.slice("--game=".length) ??
        (gameFlagIdx >= 0 ? args[gameFlagIdx + 1] : undefined);
      if (game && gameFlagIdx >= 0) {
        forward = forward.filter((a) => a !== game);
      }
      if (game) forward = [game, ...forward];
      runNpx(["tsx", "scripts/portal/clear-seed-pool.mjs", ...forward]);
      return;
    }
    console.error(`Unknown seeds command: ${cmd}`);
    printSeedsHelp();
    process.exit(1);
  }

  if (domain === "platform") {
    runNode("scripts/operation/platform/cli.mjs", rest.length ? rest : ["help"]);
    return;
  }

  // Shorthand: npm run op -- apply … → partner apply
  if (PARTNER_CMDS[domain]) {
    const forward = wantsHelp(rest) && !rest.includes("--help")
      ? ["--help", ...rest.filter((a) => a !== "help")]
      : rest.map((a) => (a === "help" ? "--help" : a));
    runNode(PARTNER_CMDS[domain], forward);
    return;
  }

  console.error(`Unknown domain: ${domain}`);
  printHelp();
  process.exit(1);
}

main();
