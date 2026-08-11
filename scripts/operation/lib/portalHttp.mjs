import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTAL_CONVEX_DIR = path.resolve(__dirname, "../../../src/convex/portal");

/** Must match Portal `npx convex dev` (.env.local CONVEX_SITE_URL). Prod is loyal-starfish-697. */
const DEV_PORTAL_SITE_URL = "https://merry-skunk-952.convex.site";
const DEV_PORTAL_BRIDGE_SECRET = "dev-local-portal-bridge";

function toSiteUrl(raw) {
  const t = String(raw).trim().replace(/\/+$/, "");
  if (t.includes(".convex.cloud")) {
    return t.replace(".convex.cloud", ".convex.site");
  }
  return t;
}

function envGet(name) {
  const v = process.env[name]?.trim();
  return v || undefined;
}

function fetchConvexEnv(name, prod) {
  const flag = prod ? " --prod" : "";
  const out = execSync(`npx convex env get ${name}${flag}`, {
    cwd: PORTAL_CONVEX_DIR,
    encoding: "utf8",
    shell: true,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return String(out).trim();
}

/**
 * Resolve Portal .convex.site URL + bridge secret for ops scripts.
 */
export function resolvePortalTarget({ prod = false } = {}) {
  let siteUrl =
    envGet("PORTAL_SITE_URL") ??
    envGet("PORTAL_CONVEX_URL") ??
    envGet("VITE_CONVEX_URL_PORTAL");

  let bridgeSecret =
    envGet("PORTAL_GAME_BRIDGE_SECRET") ??
    envGet("CASUAL_GAME_BRIDGE_SECRET") ??
    envGet("PORTAL_BRIDGE_SECRET");

  let siteSource = siteUrl ? "env" : "default";
  let secretSource = bridgeSecret ? "env" : "default";

  if (!siteUrl && prod) {
    try {
      // Prefer explicit site URL; fall back to deployment cloud URL → .site
      const fromEnv =
        fetchConvexEnv("PORTAL_SITE_URL", true) ||
        fetchConvexEnv("CONVEX_SITE_URL", true);
      if (fromEnv) {
        siteUrl = fromEnv;
        siteSource = "convex-prod-env";
      }
    } catch {
      // ignore — caller may still have VITE_ / PORTAL_SITE_URL
    }
  }

  if (!bridgeSecret && prod) {
    try {
      const fromEnv =
        fetchConvexEnv("PORTAL_GAME_BRIDGE_SECRET", true) ||
        fetchConvexEnv("CASUAL_GAME_BRIDGE_SECRET", true);
      if (fromEnv) {
        bridgeSecret = fromEnv;
        secretSource = "convex-prod-env";
      }
    } catch (e) {
      const detail = e?.stderr?.toString?.() || e?.message || String(e);
      throw new Error(
        `--prod requires PORTAL_GAME_BRIDGE_SECRET (env or Portal Convex).\n${detail.trim()}`
      );
    }
  }

  siteUrl = toSiteUrl(siteUrl || DEV_PORTAL_SITE_URL);
  bridgeSecret = bridgeSecret || DEV_PORTAL_BRIDGE_SECRET;

  return { siteUrl, bridgeSecret, siteSource, secretSource, prod };
}

async function postPortal(target, pathSuffix, body) {
  const url = `${target.siteUrl}${pathSuffix}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Portal-Bridge-Secret": target.bridgeSecret,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    throw new Error(`portal_http_${response.status}:${pathSuffix}`);
  }
  if (payload.ok === false) {
    throw new Error(
      typeof payload.error === "string" ? payload.error : `portal_${response.status}`
    );
  }
  return payload;
}

export async function portalGcOpsGet(target, partnerId) {
  return postPortal(target, "/internal/partner-gc-ops-settings", {
    operation: "get",
    partnerId,
  });
}

export async function portalGcOpsUpsert(target, partnerId, fields) {
  return postPortal(target, "/internal/partner-gc-ops-settings", {
    operation: "upsert",
    partnerId,
    ...fields,
  });
}

export async function portalLobbiesList(target, partnerId) {
  return postPortal(target, "/internal/partner-lobbies", {
    operation: "list",
    partnerId,
  });
}

export async function portalLobbyUpsert(target, partnerId, lobby) {
  return postPortal(target, "/internal/partner-lobbies", {
    operation: "upsert",
    partnerId,
    slug: lobby.slug,
    title: lobby.title,
    isDefault: lobby.isDefault,
    enabled: lobby.enabled,
    ...(lobby.branding ? { branding: lobby.branding } : {}),
    offerings: lobby.offerings,
    ...(lobby.quotaScope !== undefined ? { quotaScope: lobby.quotaScope } : {}),
    ...(lobby.soloSuccessDailyEnabled !== undefined
      ? { soloSuccessDailyEnabled: lobby.soloSuccessDailyEnabled }
      : {}),
    ...(lobby.soloSuccessDailyCap !== undefined
      ? { soloSuccessDailyCap: lobby.soloSuccessDailyCap }
      : {}),
    ...(lobby.soloSuccessAfterCapMode !== undefined
      ? { soloSuccessAfterCapMode: lobby.soloSuccessAfterCapMode }
      : {}),
    ...(lobby.soloSuccessAllowPlayAfterCap !== undefined
      ? { soloSuccessAllowPlayAfterCap: lobby.soloSuccessAllowPlayAfterCap }
      : {}),
    ...(lobby.seasonHonorMode !== undefined
      ? { seasonHonorMode: lobby.seasonHonorMode }
      : {}),
  });
}

export async function portalLobbyDelete(target, partnerId, lobbyId) {
  return postPortal(target, "/internal/partner-lobbies", {
    operation: "delete",
    partnerId,
    lobbyId,
  });
}

export async function portalShopSkusList(target, partnerId) {
  return postPortal(target, "/internal/partner-shop-skus", {
    operation: "list",
    partnerId,
  });
}

export async function portalShopSkuUpsert(target, partnerId, sku) {
  return postPortal(target, "/internal/partner-shop-skus", {
    operation: "upsert",
    partnerId,
    kind: sku.kind,
    skuId: sku.skuId,
    title: sku.title,
    priceCoins: sku.priceCoins,
    ...(sku.description !== undefined ? { description: sku.description } : {}),
    ...(sku.grantTicketCount !== undefined
      ? { grantTicketCount: sku.grantTicketCount }
      : sku.grantReplayTokenCount !== undefined
        ? { grantTicketCount: sku.grantReplayTokenCount }
        : {}),
    ...(sku.weeklyPurchaseLimit !== undefined
      ? { weeklyPurchaseLimit: sku.weeklyPurchaseLimit }
      : {}),
    ...(sku.sortOrder !== undefined ? { sortOrder: sku.sortOrder } : {}),
    ...(typeof sku.active === "boolean" ? { active: sku.active } : {}),
    ...(sku.voucherRewardText !== undefined
      ? { voucherRewardText: sku.voucherRewardText }
      : {}),
    ...(sku.voucherValidityDays !== undefined
      ? { voucherValidityDays: sku.voucherValidityDays }
      : {}),
    ...(typeof sku.listInShop === "boolean" ? { listInShop: sku.listInShop } : {}),
  });
}

export async function portalShopSkuSetActive(target, partnerId, skuId, active) {
  return postPortal(target, "/internal/partner-shop-skus", {
    operation: "setActive",
    partnerId,
    skuId,
    active: Boolean(active),
  });
}

export async function portalShopSkuDelete(target, partnerId, skuId) {
  return postPortal(target, "/internal/partner-shop-skus", {
    operation: "delete",
    partnerId,
    skuId,
  });
}

export async function portalVouchersList(target, partnerId) {
  return postPortal(target, "/internal/partner-vouchers", {
    operation: "list",
    partnerId,
  });
}

export async function portalVoucherOp(target, partnerId, operation, fields = {}) {
  return postPortal(target, "/internal/partner-vouchers", {
    operation,
    partnerId,
    ...fields,
  });
}

function shopSettingsBody(settings) {
  const kind = settings.checkinRewardKind;
  return {
    enabled: settings.enabled,
    giftCardsEnabled: settings.giftCardsEnabled,
    virtualEnabled: settings.virtualEnabled,
    vouchersEnabled: settings.vouchersEnabled,
    adCoinEnabled: settings.adCoinEnabled,
    iapEnabled: settings.iapEnabled !== false,
    checkinEnabled: settings.checkinEnabled !== false,
    checkinRewardKind:
      kind === "coins" || kind === "both" || kind === "tickets"
        ? kind
        : "tickets",
    checkinRewards:
      settings.checkinRewards && typeof settings.checkinRewards === "object"
        ? settings.checkinRewards
        : {},
    assortmentMode: settings.assortmentMode,
    skuIds: settings.skuIds,
    excludeSkuIds: settings.excludeSkuIds,
    overrides: settings.overrides,
  };
}

export async function portalShopSettingsGet(target, partnerId, lobbyId) {
  return postPortal(target, "/internal/partner-shop-settings", {
    operation: "get",
    partnerId,
    ...(lobbyId ? { lobbyId } : {}),
  });
}

export async function portalShopSettingsUpsert(target, partnerId, settings, lobbyId) {
  return postPortal(target, "/internal/partner-shop-settings", {
    operation: "upsert",
    partnerId,
    ...(lobbyId ? { lobbyId } : {}),
    ...shopSettingsBody(settings),
  });
}

export async function portalShopSettingsClearLobby(target, partnerId, lobbyId) {
  return postPortal(target, "/internal/partner-shop-settings", {
    operation: "clear_lobby",
    partnerId,
    lobbyId,
  });
}

/** Wipe partner-scoped Portal config (lobbies / shop / GC ops). Not seed pools. */
export async function portalWipePartnerConfig(target, partnerId) {
  return postPortal(target, "/internal/partner-wipe-config", { partnerId });
}
