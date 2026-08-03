#!/usr/bin/env node
/**
 * Read live Portal (+ optional SSO) state for a partner config.
 *
 * Usage:
 *   npm run op:status -- --partner=crazygames
 *   npm run op:status -- --partner=crazygames --prod
 */
import { parseCommonArgs } from "./lib/args.mjs";
import { loadPartnerConfig } from "./lib/config.mjs";
import {
  portalGcOpsGet,
  portalLobbiesList,
  portalShopSkusList,
  portalShopSettingsGet,
  resolvePortalTarget,
} from "./lib/portalHttp.mjs";
import { resolveEmbedBootstrapSecret, runSso } from "./lib/ssoOps.mjs";

function summarizeSettings(settings) {
  if (!settings) return null;
  return {
    enabled: settings.enabled,
    giftCardsEnabled: settings.giftCardsEnabled,
    virtualEnabled: settings.virtualEnabled,
    vouchersEnabled: settings.vouchersEnabled,
    adCoinEnabled: settings.adCoinEnabled,
    assortmentMode: settings.assortmentMode,
    skuIds: settings.skuIds ?? [],
    excludeSkuIds: settings.excludeSkuIds ?? [],
  };
}

async function main() {
  const flags = parseCommonArgs(process.argv.slice(2));
  if (flags.help || !flags.partner) {
    console.log(`Usage:
  npm run op -- partner status --partner=<slug> [--prod]

Shows SSO peek, Portal GC ops (incl. entry caps), lobbies, shop SKUs/settings, drift.`);
    process.exit(flags.help ? 0 : 1);
  }

  const cfg = loadPartnerConfig(flags.partner);
  const target = resolvePortalTarget({ prod: flags.prod });

  console.log("== operation status-partner ==");
  console.log(`  config: pid=${cfg.pid} slug=${cfg.slug}`);
  console.log(`  portal: ${target.siteUrl} (${flags.prod ? "prod" : "dev"})`);

  try {
    const { secret } = resolveEmbedBootstrapSecret(flags.prod);
    const ssoPeek = runSso(
      "service/partner/partnerEmbedBootstrap:peekPartnerOps",
      { bootstrapSecret: secret, pid: cfg.pid, partnerSlug: cfg.slug },
      { prod: flags.prod }
    );
    if (ssoPeek && typeof ssoPeek === "object") {
      console.log("\n[SSO peek]");
      console.log(JSON.stringify(ssoPeek, null, 2));
    }
  } catch (e) {
    console.log("\n[SSO peek] skipped:", e instanceof Error ? e.message : e);
  }

  const gc = await portalGcOpsGet(target, cfg.pid);
  console.log("\n[GC ops]");
  console.log(
    JSON.stringify(
      {
        lobbyOpsMode: gc.lobbyOpsMode,
        lobbyOpsModeEffective: gc.lobbyOpsModeEffective,
        adReplayDailyCap: gc.adReplayDailyCap,
        adReplayDailyCapEffective: gc.adReplayDailyCapEffective,
        maxReplaysPerMatch: gc.maxReplaysPerMatch,
        adReplayEnabled: gc.adReplayEnabled,
        ticketReplayEnabled: gc.ticketReplayEnabled,
        ticketReplayPriceTickets: gc.ticketReplayPriceTickets ?? null,
        freePlaySoloDailyCap: gc.freePlaySoloDailyCap,
        freePlayMultiDailyCap: gc.freePlayMultiDailyCap,
        adEntryEnabled: gc.adEntryEnabled ?? null,
        adEntrySoloDailyCap: gc.adEntrySoloDailyCap ?? null,
        adEntryMultiDailyCap: gc.adEntryMultiDailyCap ?? null,
        ticketEntryEnabled: gc.ticketEntryEnabled ?? null,
        ticketEntrySoloPriceTickets: gc.ticketEntrySoloPriceTickets ?? null,
        ticketEntrySoloDailyCap: gc.ticketEntrySoloDailyCap ?? null,
        ticketEntryMultiPriceTickets: gc.ticketEntryMultiPriceTickets ?? null,
        ticketEntryMultiDailyCap: gc.ticketEntryMultiDailyCap ?? null,
        quotaScope: gc.quotaScope,
        seasonEpochWeekKey: gc.seasonEpochWeekKey,
      },
      null,
      2
    )
  );

  const listed = await portalLobbiesList(target, cfg.pid);
  const lobbies = listed.lobbies ?? [];
  console.log(`\n[Lobbies] ${lobbies.length}`);
  for (const l of lobbies) {
    const offerings = Array.isArray(l.offerings) ? l.offerings.length : "?";
    const q =
      l.quotaScope === "mode" ||
      l.quotaScope === "lobby" ||
      l.quotaScope === "tournament"
        ? l.quotaScope
        : "inherit";
    console.log(
      `  - ${l.slug}  default=${l.isDefault === true}  enabled=${l.enabled !== false}  quota=${q}  offerings=${offerings}  id=${l.lobbyId ?? l._id ?? "?"}`
    );
  }

  const liveSlugs = new Set(lobbies.map((l) => l.slug));
  const missingLobbies = cfg.lobbies.filter((l) => !liveSlugs.has(l.slug));
  const orphanLobbies = lobbies.filter((l) => !cfg.lobbies.some((c) => c.slug === l.slug));
  if (missingLobbies.length) {
    console.log("\n[Drift] config lobbies not in Portal:");
    for (const m of missingLobbies) console.log(`  - ${m.slug}`);
  }
  if (orphanLobbies.length) {
    console.log("\n[Drift] Portal lobbies not in config (use --prune on apply):");
    for (const m of orphanLobbies) console.log(`  - ${m.slug}`);
  }
  if (!missingLobbies.length && !orphanLobbies.length && cfg.lobbies.length) {
    console.log("\n[Drift] lobbies: in sync");
  }

  const skuListed = await portalShopSkusList(target, cfg.pid);
  const skus = skuListed.skus ?? [];
  console.log(`\n[Shop SKUs] live=${skus.length} config=${cfg.shopSkus.length}`);
  for (const s of skus) {
    console.log(
      `  - ${s.skuId} kind=${s.skuKind} price=${s.priceCoins} active=${s.active}`
    );
  }

  const liveSkuIds = new Set(skus.map((s) => s.skuId));
  const missingSkus = cfg.shopSkus.filter((s) => !liveSkuIds.has(s.skuId));
  const orphanSkus = skus.filter((s) => !cfg.shopSkus.some((c) => c.skuId === s.skuId));
  if (missingSkus.length) {
    console.log("\n[Drift] config shopSkus not in Portal:");
    for (const m of missingSkus) console.log(`  - ${m.skuId}`);
  }
  if (orphanSkus.length) {
    console.log("\n[Drift] Portal shopSkus not in config (use --prune on apply):");
    for (const m of orphanSkus) console.log(`  - ${m.skuId}`);
  }
  if (!missingSkus.length && !orphanSkus.length && cfg.shopSkus.length) {
    console.log("\n[Drift] shopSkus: in sync");
  }

  const shopGet = await portalShopSettingsGet(target, cfg.pid);
  console.log("\n[Shop settings] partner base");
  console.log(JSON.stringify(summarizeSettings(shopGet.settings), null, 2));

  if (cfg.shopSettings) {
    const live = summarizeSettings(shopGet.settings);
    const want = summarizeSettings(cfg.shopSettings);
    const modeOk = live?.assortmentMode === want.assortmentMode;
    const enabledOk = live?.enabled === want.enabled;
    console.log(
      `\n[Drift] shopSettings base: assortment=${modeOk ? "ok" : "DIFF"} enabled=${enabledOk ? "ok" : "DIFF"}`
    );
    for (const overlay of cfg.shopSettings.lobbyOverlays) {
      const lobby = lobbies.find((l) => l.slug === overlay.lobbySlug);
      if (!lobby) {
        console.log(`  overlay ${overlay.lobbySlug}: lobby missing`);
        continue;
      }
      const lobbyId = lobby.lobbyId ?? lobby._id;
      const ov = await portalShopSettingsGet(target, cfg.pid, lobbyId);
      console.log(
        `  overlay ${overlay.lobbySlug}:`,
        JSON.stringify(summarizeSettings(ov.settings))
      );
    }
  }

  if (cfg.staff.length) {
    console.log("\n[Staff] config:");
    for (const s of cfg.staff) {
      console.log(`  - ${s.account} role=${s.role}`);
    }
  }
}

main().catch((err) => {
  console.error("status-partner failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
