#!/usr/bin/env node
/**
 * Toggle partner ticket / ad entry (portal play-entry), keep JSON + DB in sync.
 *
 * Usage:
 *   npm run op:play-entry -- --partner=demo-partner --ticket=off --ad=on --apply
 */
import {
  getArg,
  labelToggle,
  parseCommonArgs,
  parseToggle,
} from "./lib/args.mjs";
import { loadPartnerConfig, patchPartnerJson } from "./lib/config.mjs";
import {
  portalGcOpsGet,
  portalGcOpsUpsert,
  resolvePortalTarget,
} from "./lib/portalHttp.mjs";

function printHelp() {
  console.log(`Usage:
  npm run op -- partner play-entry --partner=<slug> [--ticket=on|off|null] [--ad=on|off|null] [--apply] [--prod]

Aliases: --ticket-entry, --ad-entry
  --no-json  skip rewriting partners/*.json (Portal only)
Values: on|off|true|false|1|0|null|default|clear`);
}

async function main() {
  const argv = process.argv.slice(2);
  const flags = parseCommonArgs(argv);
  if (flags.help || !flags.partner) {
    printHelp();
    process.exit(flags.help ? 0 : 1);
  }

  const ticketEntry = parseToggle(getArg(argv, ["--ticket", "--ticket-entry"]));
  const adEntry = parseToggle(getArg(argv, ["--ad", "--ad-entry"]));
  const writeJson = !flags.noJson;

  if (ticketEntry === undefined && adEntry === undefined) {
    console.error("Provide at least one of --ticket / --ad");
    printHelp();
    process.exit(1);
  }

  const cfg = loadPartnerConfig(flags.partner);
  const target = resolvePortalTarget({ prod: flags.prod });
  const patch = {
    ...(ticketEntry !== undefined ? { ticketEntryEnabled: ticketEntry } : {}),
    ...(adEntry !== undefined ? { adEntryEnabled: adEntry } : {}),
  };

  console.log("== operation set-play-entry ==");
  console.log(`  partner: pid=${cfg.pid} slug=${cfg.slug}`);
  console.log(`  config: ${cfg.filePath}`);
  console.log(`  portal: ${target.siteUrl} (${flags.prod ? "prod" : "dev"})`);
  console.log(`  ticket entry → ${labelToggle(ticketEntry)}`);
  console.log(`  ad entry     → ${labelToggle(adEntry)}`);
  console.log(`  write JSON:  ${flags.apply && writeJson ? "yes" : "no"}`);
  console.log(`  mode: ${flags.apply ? "APPLY" : "dry-run"}`);

  let liveBefore = null;
  try {
    liveBefore = await portalGcOpsGet(target, cfg.pid);
  } catch (e) {
    console.warn("  (could not read live GC ops)", e instanceof Error ? e.message : e);
  }
  if (liveBefore) {
    console.log("\n[live before]");
    console.log(
      JSON.stringify(
        {
          ticketEntryEnabled: liveBefore.ticketEntryEnabled ?? null,
          adEntryEnabled: liveBefore.adEntryEnabled ?? null,
        },
        null,
        2
      )
    );
  }

  if (!flags.apply) {
    console.log("\nDry-run only. Re-run with --apply to write JSON + Portal.");
    return;
  }

  if (writeJson) {
    patchPartnerJson(cfg.filePath, { portal: patch });
    console.log(`\n[JSON] updated ${cfg.filePath}`);
  }

  console.log("\n[Portal GC ops] upsert play-entry…");
  await portalGcOpsUpsert(target, cfg.pid, patch);
  const liveAfter = await portalGcOpsGet(target, cfg.pid);
  console.log("\n[live after]");
  console.log(
    JSON.stringify(
      {
        ticketEntryEnabled: liveAfter.ticketEntryEnabled ?? null,
        adEntryEnabled: liveAfter.adEntryEnabled ?? null,
      },
      null,
      2
    )
  );
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("set-play-entry failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
