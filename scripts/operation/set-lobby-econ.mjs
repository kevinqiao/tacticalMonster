#!/usr/bin/env node
/**
 * Set partner lobby economy relationship (wallet partition + play-entry quota scope).
 *
 * Usage:
 *   npm run op:lobby-econ -- --partner=demo-partner --ops=shared --quota=mode --apply
 *   npm run op:lobby-econ -- --partner=demo-partner --lobby=default --quota=tournament --apply
 */
import {
  getArg,
  labelToggle,
  parseCommonArgs,
  parseNullableEnum,
} from "./lib/args.mjs";
import { loadPartnerConfig, patchPartnerJson } from "./lib/config.mjs";
import {
  portalGcOpsGet,
  portalGcOpsUpsert,
  portalLobbiesList,
  portalLobbyUpsert,
  resolvePortalTarget,
} from "./lib/portalHttp.mjs";

const OPS_MODES = new Set(["shared", "isolated"]);
const QUOTA_SCOPES = new Set(["mode", "lobby", "tournament"]);

function parseOpsMode(raw) {
  if (raw === undefined) return undefined;
  const v = String(raw).trim().toLowerCase();
  if (v === "share") return "shared";
  if (v === "isolate" || v === "iso") return "isolated";
  return parseNullableEnum(raw, OPS_MODES, "ops");
}

function parseSeasonEpoch(raw) {
  if (raw === undefined) return undefined;
  const v = String(raw).trim();
  const lower = v.toLowerCase();
  if (lower === "null" || lower === "default" || lower === "clear" || lower === "inherit" || v === "") {
    return null;
  }
  if (!/^w:\d{4}-\d{2}-\d{2}$/.test(v)) {
    throw new Error(`season_epoch_invalid:${raw} (w:YYYY-MM-DD|null)`);
  }
  return v;
}

function printHelp() {
  console.log(`Usage:
  npm run op -- partner lobby-econ --partner=<slug> [--ops=shared|isolated|null]
                           [--quota=mode|lobby|tournament|null] [--lobby=<slug>]
                           [--season-epoch=w:YYYY-MM-DD|null] [--apply] [--prod]

  --ops     wallet/shop/ad-replay: shared | isolated
  --quota   free/ad/ticket pools (partner base, or --lobby override)`);
}

async function main() {
  const argv = process.argv.slice(2);
  const flags = parseCommonArgs(argv);
  if (flags.help || !flags.partner) {
    printHelp();
    process.exit(flags.help ? 0 : 1);
  }

  const opsMode = parseOpsMode(getArg(argv, ["--ops", "--lobby-ops"]));
  const quotaScope = parseNullableEnum(
    getArg(argv, ["--quota", "--quota-scope"]),
    QUOTA_SCOPES,
    "quota"
  );
  const lobbySlugRaw = getArg(argv, ["--lobby", "--lobby-slug"]);
  const lobbySlug = lobbySlugRaw
    ? String(lobbySlugRaw).trim().toLowerCase()
    : undefined;
  const seasonEpoch = parseSeasonEpoch(
    getArg(argv, ["--season-epoch", "--seasonEpochWeekKey"])
  );
  const writeJson = !flags.noJson;

  if (
    opsMode === undefined &&
    quotaScope === undefined &&
    seasonEpoch === undefined
  ) {
    console.error("Provide at least one of --ops / --quota / --season-epoch");
    printHelp();
    process.exit(1);
  }
  if (lobbySlug && quotaScope === undefined) {
    console.error("With --lobby, also pass --quota=mode|lobby|tournament|null");
    process.exit(1);
  }

  const cfg = loadPartnerConfig(flags.partner);
  const target = resolvePortalTarget({ prod: flags.prod });

  const portalPatch = {
    ...(opsMode !== undefined ? { lobbyOpsMode: opsMode } : {}),
    ...(seasonEpoch !== undefined ? { seasonEpochWeekKey: seasonEpoch } : {}),
    ...(!lobbySlug && quotaScope !== undefined ? { quotaScope } : {}),
  };
  const lobbyQuota = lobbySlug !== undefined ? quotaScope : undefined;

  console.log("== operation set-lobby-econ ==");
  console.log(`  partner: pid=${cfg.pid} slug=${cfg.slug}`);
  console.log(`  portal: ${target.siteUrl} (${flags.prod ? "prod" : "dev"})`);
  console.log(`  lobbyOpsMode → ${labelToggle(opsMode)}`);
  if (lobbySlug) {
    console.log(`  quotaScope   → lobby:${lobbySlug} = ${labelToggle(lobbyQuota)}`);
  } else {
    console.log(`  quotaScope   → partner base = ${labelToggle(quotaScope)}`);
  }
  console.log(`  seasonEpoch  → ${labelToggle(seasonEpoch)}`);
  console.log(`  write JSON:  ${flags.apply && writeJson ? "yes" : "no"}`);
  console.log(`  mode: ${flags.apply ? "APPLY" : "dry-run"}`);

  let liveBefore = null;
  try {
    liveBefore = await portalGcOpsGet(target, cfg.pid);
  } catch (e) {
    console.warn("  (could not read live GC ops)", e instanceof Error ? e.message : e);
  }
  if (liveBefore) {
    console.log("\n[live before · partner]");
    console.log(
      JSON.stringify(
        {
          lobbyOpsMode: liveBefore.lobbyOpsMode ?? null,
          lobbyOpsModeEffective: liveBefore.lobbyOpsModeEffective ?? null,
          quotaScope: liveBefore.quotaScope ?? null,
          seasonEpochWeekKey: liveBefore.seasonEpochWeekKey ?? null,
        },
        null,
        2
      )
    );
  }

  if (lobbySlug) {
    const listed = await portalLobbiesList(target, cfg.pid);
    const liveLobby = (listed.lobbies ?? []).find(
      (l) => String(l.slug ?? "").toLowerCase() === lobbySlug
    );
    const cfgLobby = cfg.lobbies.find((l) => l.slug === lobbySlug);
    console.log("\n[live before · lobby]");
    console.log(
      JSON.stringify(
        {
          slug: lobbySlug,
          inConfig: Boolean(cfgLobby),
          inPortal: Boolean(liveLobby),
          liveQuotaScope: liveLobby?.quotaScope ?? null,
          configQuotaScope: cfgLobby?.quotaScope ?? null,
        },
        null,
        2
      )
    );
    if (!cfgLobby) {
      throw new Error(
        `lobby_not_in_config:${lobbySlug} (add lobby to partners/${cfg.slug}.json first)`
      );
    }
  }

  if (!flags.apply) {
    console.log("\nDry-run only. Re-run with --apply to write JSON + Portal.");
    return;
  }

  if (writeJson) {
    patchPartnerJson(cfg.filePath, {
      portal: portalPatch,
      lobbyPatches:
        lobbySlug && lobbyQuota !== undefined
          ? [{ slug: lobbySlug, quotaScope: lobbyQuota }]
          : undefined,
    });
    console.log(`\n[JSON] updated ${cfg.filePath}`);
  }

  if (Object.keys(portalPatch).length > 0) {
    console.log("\n[Portal GC ops] upsert partner economy…");
    const out = await portalGcOpsUpsert(target, cfg.pid, portalPatch);
    console.log("  → ok", {
      lobbyOpsMode: out.lobbyOpsMode ?? out.lobbyOpsModeEffective,
      quotaScope: out.quotaScope,
      seasonEpochWeekKey: out.seasonEpochWeekKey,
    });
  }

  if (lobbySlug && lobbyQuota !== undefined) {
    const cfgLobby = cfg.lobbies.find((l) => l.slug === lobbySlug);
    if (!cfgLobby) throw new Error(`lobby_not_in_config:${lobbySlug}`);
    console.log(`\n[Portal lobby] upsert quotaScope for ${lobbySlug}…`);
    const out = await portalLobbyUpsert(target, cfg.pid, {
      ...cfgLobby,
      quotaScope: lobbyQuota,
    });
    console.log("  → ok", out.lobbyId ?? out);
  }

  const liveAfter = await portalGcOpsGet(target, cfg.pid);
  console.log("\n[live after · partner]");
  console.log(
    JSON.stringify(
      {
        lobbyOpsMode: liveAfter.lobbyOpsMode ?? null,
        lobbyOpsModeEffective: liveAfter.lobbyOpsModeEffective ?? null,
        quotaScope: liveAfter.quotaScope ?? null,
        seasonEpochWeekKey: liveAfter.seasonEpochWeekKey ?? null,
      },
      null,
      2
    )
  );

  if (lobbySlug) {
    const listed = await portalLobbiesList(target, cfg.pid);
    const liveLobby = (listed.lobbies ?? []).find(
      (l) => String(l.slug ?? "").toLowerCase() === lobbySlug
    );
    console.log("\n[live after · lobby]");
    console.log(
      JSON.stringify(
        { slug: lobbySlug, quotaScope: liveLobby?.quotaScope ?? null },
        null,
        2
      )
    );
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("set-lobby-econ failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
