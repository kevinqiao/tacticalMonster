#!/usr/bin/env node
/**
 * Edit partner town branding/meta in partners/*.json and sync to Portal.
 *
 * Usage:
 *   npm run op -- partner town-config --partner=demo-partner --title="Saloon Row" --apply
 *   npm run op -- partner town-config --partner=demo --town=mayfield --title-override="Wild West" --apply
 *   npm run op -- partner town-config --partner=demo --wallet-seed-coins=5000 --enabled=on --apply
 */
import {
  getArg,
  labelToggle,
  parseCommonArgs,
  parseToggle,
  parseNullableInt,
} from "./lib/args.mjs";
import { loadPartnerConfig, patchPartnerJson } from "./lib/config.mjs";
import {
  portalTownUpsert,
  portalTownsList,
  resolvePortalTarget,
} from "./lib/portalHttp.mjs";

function printHelp() {
  console.log(`Usage:
  npm run op -- partner town-config --partner=<slug> [--town=mayfield]
    [--title=<display title>]
    [--title-override=<branding title>]
    [--logo-url=<https://…>]
    [--map-theme=<skin id>]
    [--template=mayfield_standard]
    [--wallet-seed-coins=<n>|null]
    [--enabled=on|off]
    [--default]
    [--apply] [--prod] [--no-json]

Updates partners/<slug>.json towns[] and upserts portal_towns.`);
}

async function main() {
  const argv = process.argv.slice(2);
  const flags = parseCommonArgs(argv);
  if (flags.help || !flags.partner) {
    printHelp();
    process.exit(flags.help ? 0 : 1);
  }

  const townSlug = String(getArg(argv, ["--town", "--town-slug"]) ?? "mayfield")
    .trim()
    .toLowerCase();
  const titleRaw = getArg(argv, ["--title"]);
  const titleOverrideRaw = getArg(argv, ["--title-override", "--titleOverride"]);
  const logoUrlRaw = getArg(argv, ["--logo-url", "--logoUrl"]);
  const mapThemeRaw = getArg(argv, ["--map-theme", "--mapThemeId"]);
  const templateRaw = getArg(argv, ["--template", "--template-id"]);
  const walletSeed = parseNullableInt(
    getArg(argv, ["--wallet-seed-coins", "--walletSeedCoins"]),
    "wallet-seed-coins"
  );
  const enabled = parseToggle(getArg(argv, ["--enabled"]));
  const setDefault = argv.includes("--default");
  const writeJson = !flags.noJson;

  if (
    titleRaw === undefined &&
    titleOverrideRaw === undefined &&
    logoUrlRaw === undefined &&
    mapThemeRaw === undefined &&
    templateRaw === undefined &&
    walletSeed === undefined &&
    enabled === undefined &&
    !setDefault
  ) {
    console.error("Provide at least one town field to change.");
    printHelp();
    process.exit(1);
  }

  const cfg = loadPartnerConfig(flags.partner);
  const cfgTown = cfg.towns.find((t) => t.slug === townSlug);
  if (!cfgTown) {
    throw new Error(
      `town_not_in_config:${townSlug} (add towns[] to partners/${cfg.slug}.json first)`
    );
  }

  const target = resolvePortalTarget({ prod: flags.prod });
  const brandingPatch = {};
  if (titleOverrideRaw !== undefined) {
    brandingPatch.titleOverride = String(titleOverrideRaw).trim();
  }
  if (logoUrlRaw !== undefined) {
    brandingPatch.logoUrl = String(logoUrlRaw).trim();
  }
  if (mapThemeRaw !== undefined) {
    brandingPatch.mapThemeId = String(mapThemeRaw).trim();
  }

  const townPatch = {
    slug: townSlug,
    ...(titleRaw !== undefined ? { title: String(titleRaw).trim() } : {}),
    ...(templateRaw !== undefined ? { templateId: String(templateRaw).trim() } : {}),
    ...(walletSeed !== undefined ? { walletSeedCoins: walletSeed } : {}),
    ...(enabled !== undefined ? { enabled: enabled !== false } : {}),
    ...(setDefault ? { isDefault: true } : {}),
    ...(Object.keys(brandingPatch).length ? { branding: brandingPatch } : {}),
  };

  const nextTown = {
    ...cfgTown,
    ...townPatch,
    branding: {
      ...(cfgTown.branding ?? {}),
      ...(townPatch.branding ?? {}),
    },
  };

  console.log("== operation set-town-config ==");
  console.log(`  partner: pid=${cfg.pid} slug=${cfg.slug}`);
  console.log(`  town: ${townSlug}`);
  console.log(`  portal: ${target.siteUrl} (${flags.prod ? "prod" : "dev"})`);
  console.log(`  title          → ${titleRaw ?? "(unchanged)"}`);
  console.log(`  titleOverride  → ${titleOverrideRaw ?? "(unchanged)"}`);
  console.log(`  logoUrl        → ${logoUrlRaw ?? "(unchanged)"}`);
  console.log(`  mapThemeId     → ${mapThemeRaw ?? "(unchanged)"}`);
  console.log(`  templateId     → ${templateRaw ?? "(unchanged)"}`);
  console.log(`  walletSeed     → ${labelToggle(walletSeed)}`);
  console.log(`  enabled        → ${labelToggle(enabled)}`);
  console.log(`  isDefault      → ${setDefault ? "yes" : "(unchanged)"}`);
  console.log(`  write JSON:    ${flags.apply && writeJson ? "yes" : "no"}`);
  console.log(`  mode: ${flags.apply ? "APPLY" : "dry-run"}`);

  let liveBefore = null;
  try {
    const listed = await portalTownsList(target, cfg.pid);
    liveBefore = (listed.towns ?? []).find((t) => t.slug === townSlug) ?? null;
  } catch (e) {
    console.warn("  (could not read live towns)", e instanceof Error ? e.message : e);
  }
  if (liveBefore) {
    console.log("\n[live before]");
    console.log(JSON.stringify(liveBefore, null, 2));
  }

  if (!flags.apply) {
    console.log("\nDry-run only. Re-run with --apply to write JSON + Portal.");
    return;
  }

  if (writeJson) {
    patchPartnerJson(cfg.filePath, { townPatches: [townPatch] });
    console.log(`\n[JSON] updated ${cfg.filePath}`);
  }

  console.log("\n[Portal town] upsert…");
  const out = await portalTownUpsert(target, cfg.pid, nextTown);
  console.log("  → ok", out.townId ?? out);

  const listed = await portalTownsList(target, cfg.pid);
  const liveAfter = (listed.towns ?? []).find((t) => t.slug === townSlug);
  console.log("\n[live after]");
  console.log(JSON.stringify(liveAfter ?? out, null, 2));
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("set-town-config failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
