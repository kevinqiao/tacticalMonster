#!/usr/bin/env node
/**
 * Set partner Portal GC / play-entry knobs (caps, prices, replay), JSON + DB.
 *
 * Usage:
 *   npm run op:gc-ops -- --partner=demo-partner --free-solo=3 --ad-replay-cap=10
 *   npm run op:gc-ops -- --partner=demo-partner --ticket-solo-price=1 --apply
 */
import {
  getArg,
  labelToggle,
  parseCommonArgs,
  parseNullableInt,
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
  npm run op -- partner gc-ops --partner=<slug> [flags] [--apply] [--prod] [--no-json]

Flags (omit = unchanged; null/clear = clear override):
  --ad-replay-cap / --adReplayDailyCap
  --max-replays / --maxReplaysPerMatch
  --ad-replay / --adReplayEnabled          on|off
  --ticket-replay / --ticketReplayEnabled  on|off
  --ticket-replay-price
  --free-solo / --freePlaySoloDailyCap
  --free-multi / --freePlayMultiDailyCap
  --ad-entry / --adEntryEnabled            on|off|null
  --ad-solo-cap / --adEntrySoloDailyCap
  --ad-multi-cap / --adEntryMultiDailyCap
  --ticket-entry / --ticketEntryEnabled    on|off|null
  --ticket-solo-price / --ticketEntrySoloPriceTickets
  --ticket-solo-cap / --ticketEntrySoloDailyCap
  --ticket-multi-price / --ticketEntryMultiPriceTickets
  --ticket-multi-cap / --ticketEntryMultiDailyCap
  --solo-success / --soloSuccessDailyEnabled           on|off|null
  --solo-success-cap / --soloSuccessDailyCap
  --solo-success-after-cap / --soloSuccessAfterCapMode zero_all|null
  --solo-success-allow-play / --soloSuccessAllowPlayAfterCap on|off|null`);
}

function buildPatch(argv) {
  const patch = {};
  const setInt = (keys, field) => {
    const v = parseNullableInt(getArg(argv, keys), field);
    if (v !== undefined) patch[field] = v;
  };
  const setToggle = (keys, field) => {
    const v = parseToggle(getArg(argv, keys));
    if (v !== undefined) patch[field] = v;
  };

  setInt(["--ad-replay-cap", "--adReplayDailyCap"], "adReplayDailyCap");
  setInt(["--max-replays", "--maxReplaysPerMatch"], "maxReplaysPerMatch");
  setToggle(["--ad-replay", "--adReplayEnabled"], "adReplayEnabled");
  setToggle(["--ticket-replay", "--ticketReplayEnabled"], "ticketReplayEnabled");
  setInt(["--ticket-replay-price", "--ticketReplayPriceTickets"], "ticketReplayPriceTickets");
  setInt(["--free-solo", "--freePlaySoloDailyCap"], "freePlaySoloDailyCap");
  setInt(["--free-multi", "--freePlayMultiDailyCap"], "freePlayMultiDailyCap");
  setToggle(["--ad-entry", "--adEntryEnabled"], "adEntryEnabled");
  setInt(["--ad-solo-cap", "--adEntrySoloDailyCap"], "adEntrySoloDailyCap");
  setInt(["--ad-multi-cap", "--adEntryMultiDailyCap"], "adEntryMultiDailyCap");
  setToggle(["--ticket-entry", "--ticketEntryEnabled"], "ticketEntryEnabled");
  setInt(
    ["--ticket-solo-price", "--ticketEntrySoloPriceTickets"],
    "ticketEntrySoloPriceTickets"
  );
  setInt(
    ["--ticket-solo-cap", "--ticketEntrySoloDailyCap"],
    "ticketEntrySoloDailyCap"
  );
  setInt(
    ["--ticket-multi-price", "--ticketEntryMultiPriceTickets"],
    "ticketEntryMultiPriceTickets"
  );
  setInt(
    ["--ticket-multi-cap", "--ticketEntryMultiDailyCap"],
    "ticketEntryMultiDailyCap"
  );
  setToggle(
    ["--solo-success", "--soloSuccessDailyEnabled"],
    "soloSuccessDailyEnabled"
  );
  setInt(
    ["--solo-success-cap", "--soloSuccessDailyCap"],
    "soloSuccessDailyCap"
  );
  setToggle(
    ["--solo-success-allow-play", "--soloSuccessAllowPlayAfterCap"],
    "soloSuccessAllowPlayAfterCap"
  );
  const afterCap = getArg(argv, [
    "--solo-success-after-cap",
    "--soloSuccessAfterCapMode",
  ]);
  if (afterCap === "null" || afterCap === "clear") {
    patch.soloSuccessAfterCapMode = null;
  } else if (afterCap === "zero_all") {
    patch.soloSuccessAfterCapMode = "zero_all";
  }
  return patch;
}

async function main() {
  const argv = process.argv.slice(2);
  const flags = parseCommonArgs(argv);
  if (flags.help || !flags.partner) {
    printHelp();
    process.exit(flags.help ? 0 : 1);
  }

  const patch = buildPatch(argv);
  if (Object.keys(patch).length === 0) {
    console.error("Provide at least one GC ops flag");
    printHelp();
    process.exit(1);
  }

  const cfg = loadPartnerConfig(flags.partner);
  const target = resolvePortalTarget({ prod: flags.prod });
  const writeJson = !flags.noJson;

  console.log("== operation set-gc-ops ==");
  console.log(`  partner: pid=${cfg.pid} slug=${cfg.slug}`);
  console.log(`  portal: ${target.siteUrl} (${flags.prod ? "prod" : "dev"})`);
  console.log(`  write JSON: ${flags.apply && writeJson ? "yes" : "no"}`);
  console.log(`  mode: ${flags.apply ? "APPLY" : "dry-run"}`);
  console.log("\n[patch]");
  for (const [k, v] of Object.entries(patch)) {
    console.log(
      `  ${k} → ${typeof v === "boolean" || v === null ? labelToggle(v) : v}`
    );
  }

  let liveBefore = null;
  try {
    liveBefore = await portalGcOpsGet(target, cfg.pid);
  } catch (e) {
    console.warn("  (could not read live)", e instanceof Error ? e.message : e);
  }
  if (liveBefore) {
    console.log("\n[live before]");
    console.log(JSON.stringify(Object.fromEntries(
      Object.keys(patch).map((k) => [k, liveBefore[k] ?? null])
    ), null, 2));
  }

  if (!flags.apply) {
    console.log("\nDry-run only. Re-run with --apply to write JSON + Portal.");
    return;
  }

  if (writeJson) {
    patchPartnerJson(cfg.filePath, { portal: patch });
    console.log(`\n[JSON] updated ${cfg.filePath}`);
  }

  console.log("\n[Portal GC ops] upsert…");
  await portalGcOpsUpsert(target, cfg.pid, patch);
  const liveAfter = await portalGcOpsGet(target, cfg.pid);
  console.log("\n[live after]");
  console.log(JSON.stringify(Object.fromEntries(
    Object.keys(patch).map((k) => [k, liveAfter[k] ?? null])
  ), null, 2));
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("set-gc-ops failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
