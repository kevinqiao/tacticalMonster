#!/usr/bin/env node
/**
 * Apply a partner config from partners/*.json (SSO + Portal + shop + staff).
 *
 * Dry-run: omit --apply (prints plan only, no writes).
 * Prod:    --apply --prod
 *
 * Usage:
 *   npm run op:apply -- --partner=demo-partner
 *   npm run op:apply -- --partner=demo-partner --apply
 *   npm run op:apply -- --partner=demo-partner --apply --prod
 *   npm run op:apply -- --partner=demo-partner --apply --only-shop-settings
 */
import { execSync } from "node:child_process";

import { runConvexSso, SSO_CONVEX_PROJECT_DIR } from "../platform/run-convex-sso.mjs";
import { hashWebPassword } from "../platform/web-password.mjs";
import { platformStaffUidForAccount } from "../platform/platform-uid.mjs";
import {
  parseCommonArgs,
  convexProdArgs,
  wantStep,
  needsPortalBridge,
} from "./lib/args.mjs";
import {
  loadPartnerConfig,
  partnerLobbyPath,
  partnerLobbyAltPath,
} from "./lib/config.mjs";
import {
  portalGcOpsUpsert,
  portalLobbyUpsert,
  portalLobbiesList,
  portalShopSkuUpsert,
  portalShopSettingsUpsert,
  resolvePortalTarget,
} from "./lib/portalHttp.mjs";

const DEV_EMBED_SECRET = "dev-local-partner-embed-bootstrap";
const DEV_PLATFORM_SECRET = "dev-local-platform-bootstrap";

function fetchSsoEnv(name) {
  const out = execSync(`npx convex env get ${name} --prod`, {
    cwd: SSO_CONVEX_PROJECT_DIR,
    encoding: "utf8",
    shell: true,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const secret = String(out).trim();
  if (!secret) throw new Error(`${name} empty`);
  return secret;
}

function resolveSecret(envName, prod, defaultValue) {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) return { secret: fromEnv, source: "env" };
  if (prod) {
    return { secret: fetchSsoEnv(envName), source: "convex-prod-env" };
  }
  return { secret: defaultValue, source: "default" };
}

function resolveStaffPassword(row) {
  if (row.passwordEnv) {
    const v = process.env[row.passwordEnv]?.trim();
    if (!v) {
      throw new Error(
        `staff_password_env_missing:${row.account} (set ${row.passwordEnv})`
      );
    }
    return v;
  }
  return row.password;
}

function printPlan(cfg, flags, portalTarget) {
  console.log("== operation apply-partner ==");
  console.log(`  config: ${cfg.filePath}`);
  console.log(`  pid=${cfg.pid} slug=${cfg.slug} name=${cfg.name}`);
  console.log(`  host: ${cfg.host}`);
  console.log(
    `  capabilities: portalGames=${cfg.capabilities.portalGames} campaignOps=${cfg.capabilities.campaignOps}`
  );
  console.log(`  embed.method: ${cfg.embed.method}`);
  console.log(
    `  playerAuth: mode=${cfg.playerAuth.mode}` +
      (cfg.playerAuth.embed?.method
        ? ` embed.method=${cfg.playerAuth.embed.method}`
        : "")
  );
  console.log(`  lobbies: ${cfg.lobbies.length} (named lobbies → offerings → gameTypes)`);
  for (const l of cfg.lobbies) {
    const url = partnerLobbyPath(cfg.slug, l);
    const alt = partnerLobbyAltPath(cfg.slug, l);
    const urlLabel = alt ? `${url} | ${alt}` : url;
    console.log(
      `    - slug=${l.slug} default=${l.isDefault} offerings=${l.offerings.length} derivedGames=[${(l.derivedGameTypes ?? []).join(",")}] url=${urlLabel}`
    );
  }
  console.log(`  shopSkus: ${cfg.shopSkus.length}`);
  for (const s of cfg.shopSkus) {
    console.log(
      `    - ${s.skuId} kind=${s.kind} price=${s.priceCoins} active=${s.active}`
    );
  }
  if (cfg.shopSettings) {
    console.log(
      `  shopSettings: mode=${cfg.shopSettings.assortmentMode} enabled=${cfg.shopSettings.enabled} overlays=${cfg.shopSettings.lobbyOverlays.length}`
    );
  } else {
    console.log("  shopSettings: (none)");
  }
  console.log(`  staff: ${cfg.staff.length}`);
  for (const s of cfg.staff) {
    console.log(
      `    - ${s.account} role=${s.role} password=${s.passwordEnv ? `env:${s.passwordEnv}` : "(inline)"}`
    );
  }
  console.log(`  portal fields: ${Object.keys(cfg.portal).join(", ") || "(none)"}`);
  console.log(`  mode: ${flags.apply ? "APPLY" : "dry-run"}`);
  console.log(`  target: ${flags.prod ? "PROD" : "dev"}`);
  if (portalTarget) {
    console.log(`  portal site: ${portalTarget.siteUrl} (${portalTarget.siteSource})`);
    console.log(`  bridge secret: (${portalTarget.secretSource})`);
  }
  if (cfg.notes) console.log(`  notes: ${cfg.notes}`);
}

async function applySso(cfg, flags) {
  const { secret, source } = resolveSecret(
    "PARTNER_EMBED_BOOTSTRAP_SECRET",
    flags.prod,
    DEV_EMBED_SECRET
  );
  console.log(`\n[SSO] upsert partner embed… (secret=${source})`);

  const embedMethod =
    cfg.playerAuth.embed?.method ?? cfg.embed.method ?? "jwt_local";
  const allowedOrigins =
    cfg.embed.allowedOrigins ??
    (embedMethod === "crazygames_jwt"
      ? ["https://www.crazygames.com", "https://games.crazygames.com"]
      : ["http://localhost:3000", "http://127.0.0.1:3000"]);

  const out = runConvexSso(
    "service/partner/partnerEmbedBootstrap:bootstrapDevPartnerEmbed",
    {
      bootstrapSecret: secret,
      pid: cfg.pid,
      name: cfg.name,
      host: cfg.host,
      embedMethod,
      playerAuth: cfg.playerAuth,
      portalGames: cfg.capabilities.portalGames,
      campaignOps: cfg.capabilities.campaignOps,
      partnerSlug: cfg.slug,
      allowedOrigins,
      ...(cfg.embed.jwtSecret ? { jwtSecret: cfg.embed.jwtSecret } : {}),
      ...(typeof cfg.portal.adReplayDailyCap === "number"
        ? { adReplayDailyCap: cfg.portal.adReplayDailyCap }
        : {}),
    },
    convexProdArgs(flags.prod)
  );
  console.log("  →", out);
  return out;
}

async function applyPortalOps(cfg, target) {
  if (!cfg.portal || Object.keys(cfg.portal).length === 0) {
    console.log("\n[Portal GC ops] skip (no portal block in config)");
    return null;
  }
  console.log("\n[Portal GC ops] upsert…");
  const out = await portalGcOpsUpsert(target, cfg.pid, { ...cfg.portal });
  console.log("  → ok", {
    lobbyOpsMode: out.lobbyOpsMode ?? out.lobbyOpsModeEffective,
    adReplayDailyCap: out.adReplayDailyCap ?? out.adReplayDailyCapEffective,
  });
  return out;
}

async function applyLobbies(cfg, target) {
  if (cfg.lobbies.length === 0) {
    console.log("\n[Lobbies] skip (none in config)");
    return [];
  }
  console.log(`\n[Lobbies] upsert ${cfg.lobbies.length}…`);
  const results = [];
  for (const lobby of cfg.lobbies) {
    const out = await portalLobbyUpsert(target, cfg.pid, lobby);
    console.log(`  → ${lobby.slug}`, out.lobbyId ?? out);
    results.push(out);
  }
  return results;
}

async function applyShopSkus(cfg, target) {
  if (cfg.shopSkus.length === 0) {
    console.log("\n[Shop SKUs] skip (none in config)");
    return [];
  }
  console.log(`\n[Shop SKUs] upsert ${cfg.shopSkus.length}…`);
  const results = [];
  for (const sku of cfg.shopSkus) {
    const out = await portalShopSkuUpsert(target, cfg.pid, sku);
    console.log(`  → ${sku.skuId}`, out.ok === true ? "ok" : out);
    results.push(out);
  }
  return results;
}

async function applyShopSettings(cfg, target) {
  if (!cfg.shopSettings) {
    console.log("\n[Shop settings] skip (none in config)");
    return null;
  }
  console.log("\n[Shop settings] upsert partner base…");
  const baseOut = await portalShopSettingsUpsert(target, cfg.pid, cfg.shopSettings);
  console.log("  → base ok", baseOut.settings?.assortmentMode ?? "ok");

  const overlays = cfg.shopSettings.lobbyOverlays;
  if (!overlays.length) return baseOut;

  const listed = await portalLobbiesList(target, cfg.pid);
  const bySlug = new Map(
    (listed.lobbies ?? []).map((l) => [l.slug, l.lobbyId ?? l._id])
  );

  for (const overlay of overlays) {
    const lobbyId = bySlug.get(overlay.lobbySlug);
    if (!lobbyId) {
      throw new Error(
        `shop_settings_lobby_missing:${overlay.lobbySlug} (apply lobbies first)`
      );
    }
    console.log(`  → lobby overlay ${overlay.lobbySlug}…`);
    await portalShopSettingsUpsert(target, cfg.pid, overlay, lobbyId);
  }
  return baseOut;
}

async function applyStaff(cfg, flags) {
  if (cfg.staff.length === 0) {
    console.log("\n[Staff] skip (none in config)");
    return [];
  }
  const { secret, source } = resolveSecret(
    "PLATFORM_BOOTSTRAP_SECRET",
    flags.prod,
    DEV_PLATFORM_SECRET
  );
  console.log(`\n[Staff] upsert ${cfg.staff.length}… (secret=${source})`);
  const results = [];
  for (const row of cfg.staff) {
    const password = resolveStaffPassword(row);
    const out = runConvexSso(
      "service/partner/platformAdminBootstrap:bootstrapPartnerStaffAccount",
      {
        bootstrapSecret: secret,
        partnerId: cfg.pid,
        passwordHash: hashWebPassword(password),
        accountId: row.account,
        platformUid: platformStaffUidForAccount(row.account),
        role: row.role,
      },
      convexProdArgs(flags.prod)
    );
    console.log(`  → ${row.account}`, out);
    results.push(out);
  }
  return results;
}

async function main() {
  const flags = parseCommonArgs(process.argv.slice(2));
  if (flags.help || !flags.partner) {
    console.log(`Usage:
  node scripts/operation/apply-partner.mjs --partner=<slug> [--apply] [--prod]
  Flags: --skip-sso --skip-portal --skip-lobbies --skip-shop-skus
         --skip-shop-settings --skip-staff
         --only-sso --only-portal --only-lobbies --only-shop-skus
         --only-shop-settings --only-staff`);
    process.exit(flags.help ? 0 : 1);
  }

  const cfg = loadPartnerConfig(flags.partner);
  const portalTarget = needsPortalBridge(flags)
    ? resolvePortalTarget({ prod: flags.prod })
    : null;

  printPlan(cfg, flags, portalTarget);

  if (!flags.apply) {
    console.log("\nDry run only. Re-run with --apply to write.");
    return;
  }

  const run = async (step, fn, skipLabel) => {
    if (wantStep(flags, step)) await fn();
    else console.log(`\n[${skipLabel}] skipped`);
  };

  await run("sso", () => applySso(cfg, flags), "SSO");
  await run("portal", () => applyPortalOps(cfg, portalTarget), "Portal GC ops");
  await run("lobbies", () => applyLobbies(cfg, portalTarget), "Lobbies");
  await run("shopSkus", () => applyShopSkus(cfg, portalTarget), "Shop SKUs");
  await run(
    "shopSettings",
    () => applyShopSettings(cfg, portalTarget),
    "Shop settings"
  );
  await run("staff", () => applyStaff(cfg, flags), "Staff");

  console.log("\n================ READY ================");
  console.log(`Partner: pid=${cfg.pid} slug=${cfg.slug}`);
  for (const l of cfg.lobbies) {
    const mark = l.isDefault ? " (default lobby)" : "";
    console.log(`  ${partnerLobbyPath(cfg.slug, l)}${mark}`);
  }
  if (cfg.shopSkus.length) {
    console.log(`  shopSkus: ${cfg.shopSkus.map((s) => s.skuId).join(", ")}`);
  }
  if (cfg.staff.length) {
    console.log(`  staff: ${cfg.staff.map((s) => s.account).join(", ")}`);
  }
  console.log("=======================================");
}

main().catch((err) => {
  console.error("apply-partner failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
