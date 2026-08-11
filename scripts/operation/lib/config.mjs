import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const OPERATION_ROOT = path.resolve(__dirname, "..");
export const PARTNERS_DIR = path.join(OPERATION_ROOT, "partners");

const KNOWN_GAMES = ["solitaire", "block_blast", "match_3", "tower_arena", "yatz"];

/**
 * Free solo+multi tournament ids for a game (coin tables are opt-in).
 * Keep in sync with portalLobbyConfig.defaultOfferingsForGames.
 */
export function defaultOfferingsForGames(games) {
  const offerings = [];
  let order = 0;
  for (const gameType of games) {
    if (!KNOWN_GAMES.includes(gameType)) {
      throw new Error(`unknown_game:${gameType}`);
    }
    for (const suffix of [`portal_solo_p75_${gameType}`, `portal_multi_${gameType}`]) {
      offerings.push({ tournamentId: suffix, sortOrder: order++, enabled: true });
    }
  }
  return offerings;
}

/**
 * Canonical player URL (matches portalLobbyPath):
 * default lobby → /gc/{partner}; named → /gc/{partner}/{lobbySlug}.
 * When isDefault but slug ≠ "default" (e.g. CrazyGames vanity), both resolve;
 * canonical print still prefers /gc/{partner}.
 */
export function partnerLobbyPath(partnerSlug, lobby) {
  const slug = lobby?.slug;
  if (lobby?.isDefault || !slug || slug === "default") {
    return `/gc/${partnerSlug}`;
  }
  return `/gc/${partnerSlug}/${slug}`;
}

/** Extra vanity path when default lobby uses a non-"default" slug. */
export function partnerLobbyAltPath(partnerSlug, lobby) {
  const slug = lobby?.slug;
  if (lobby?.isDefault && slug && slug !== "default") {
    return `/gc/${partnerSlug}/${slug}`;
  }
  return null;
}

/**
 * Lobby offering rewardsOverride (portalLobbyMutations offeringValidator shape).
 * Pass-through only — does not invent defaults.
 */
function normalizeRewardsOverride(raw) {
  if (!raw || typeof raw !== "object") return undefined;
  const out = {};
  if (raw.soloPoints && typeof raw.soloPoints === "object") {
    const sp = raw.soloPoints;
    const fail = Number(sp.fail);
    const a = sp.ritual_a;
    const b = sp.transition_b;
    const c = sp.merged_c;
    if (
      Number.isFinite(fail) &&
      a &&
      typeof a === "object" &&
      Number.isFinite(Number(a.clear)) &&
      Number.isFinite(Number(a.bonus)) &&
      b &&
      typeof b === "object" &&
      Number.isFinite(Number(b.clear)) &&
      Number.isFinite(Number(b.bonus)) &&
      c &&
      typeof c === "object" &&
      Number.isFinite(Number(c.p75)) &&
      Number.isFinite(Number(c.p90))
    ) {
      out.soloPoints = {
        fail,
        ritual_a: { clear: Number(a.clear), bonus: Number(a.bonus) },
        transition_b: { clear: Number(b.clear), bonus: Number(b.bonus) },
        merged_c: { p75: Number(c.p75), p90: Number(c.p90) },
      };
    } else {
      const success = Number(sp.success);
      if (Number.isFinite(success) && Number.isFinite(fail)) {
        out.soloPoints = { success, fail };
      }
    }
  }
  if (raw.rankPoints && typeof raw.rankPoints === "object") {
    const rankPoints = {};
    for (const [k, v] of Object.entries(raw.rankPoints)) {
      const n = Number(v);
      if (Number.isFinite(n)) rankPoints[String(k)] = n;
    }
    if (Object.keys(rankPoints).length > 0) out.rankPoints = rankPoints;
  }
  if (raw.coins && typeof raw.coins === "object") {
    const coins = {};
    if (typeof raw.coins.soloSuccess === "number") {
      coins.soloSuccess = raw.coins.soloSuccess;
    }
    if (typeof raw.coins.soloFail === "number") {
      coins.soloFail = raw.coins.soloFail;
    }
    if (raw.coins.rankCoins && typeof raw.coins.rankCoins === "object") {
      const rankCoins = {};
      for (const [k, v] of Object.entries(raw.coins.rankCoins)) {
        const n = Number(v);
        if (Number.isFinite(n)) rankCoins[String(k)] = n;
      }
      if (Object.keys(rankCoins).length > 0) coins.rankCoins = rankCoins;
    }
    if (Object.keys(coins).length > 0) out.coins = coins;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function expandLobby(lobby) {
  if (!lobby || typeof lobby !== "object") {
    throw new Error("lobby_invalid");
  }
  const slug = String(lobby.slug ?? "").trim().toLowerCase();
  if (!slug) throw new Error("lobby_slug_required");

  // Lobby ≠ game. Content is offerings (tournamentIds). `offeringGames` / deprecated
  // `games` only expand to free solo+multi tournaments for those gameTypes.
  let offerings = lobby.offerings;
  if (!Array.isArray(offerings) || offerings.length === 0) {
    const offeringGames = Array.isArray(lobby.offeringGames)
      ? lobby.offeringGames
      : Array.isArray(lobby.games)
        ? lobby.games
        : [];
    if (offeringGames.length === 0) {
      throw new Error(`lobby_offerings_required:${slug}`);
    }
    offerings = defaultOfferingsForGames(offeringGames);
  }

  const normalizedOfferings = offerings.map((o, i) => {
    const out = {
      tournamentId: o.tournamentId,
      sortOrder: typeof o.sortOrder === "number" ? o.sortOrder : i,
      enabled: o.enabled !== false,
      ...(o.titleOverride ? { titleOverride: o.titleOverride } : {}),
    };
    if (o.rewardsOverride && typeof o.rewardsOverride === "object") {
      out.rewardsOverride = normalizeRewardsOverride(o.rewardsOverride);
    }
    const unlockLvl = Number(o.unlockSeasonLevel);
    if (Number.isFinite(unlockLvl) && unlockLvl >= 2) {
      out.unlockSeasonLevel = Math.floor(unlockLvl);
    }
    return out;
  });

  return {
    slug,
    title: String(lobby.title ?? slug).trim() || slug,
    isDefault: lobby.isDefault === true,
    enabled: lobby.enabled !== false,
    branding:
      lobby.branding && typeof lobby.branding === "object" ? lobby.branding : undefined,
    offerings: normalizedOfferings,
    derivedGameTypes: [
      ...new Set(
        normalizedOfferings
          .map((o) => {
            const id = o.tournamentId ?? "";
            // multi_coin before multi — otherwise multi_coin_* → coin_<game>
            const m = id.match(/^portal_(?:solo_p75|multi_coin|multi)_(.+)$/);
            return m?.[1] ?? null;
          })
          .filter(Boolean)
      ),
    ],
    quotaScope: lobby.quotaScope === undefined ? undefined : lobby.quotaScope,
    seasonHonorMode:
      lobby.seasonHonorMode === undefined ? undefined : lobby.seasonHonorMode,
    soloSuccessDailyEnabled:
      lobby.soloSuccessDailyEnabled === undefined
        ? undefined
        : lobby.soloSuccessDailyEnabled,
    soloSuccessDailyCap:
      lobby.soloSuccessDailyCap === undefined
        ? undefined
        : lobby.soloSuccessDailyCap,
    soloSuccessAfterCapMode:
      lobby.soloSuccessAfterCapMode === undefined
        ? undefined
        : lobby.soloSuccessAfterCapMode,
    soloSuccessAllowPlayAfterCap:
      lobby.soloSuccessAllowPlayAfterCap === undefined
        ? undefined
        : lobby.soloSuccessAllowPlayAfterCap,
  };
}

const SKU_ID_TAIL_RE = /^[a-z0-9][a-z0-9_-]{0,47}$/;

/**
 * Partner-owned SKU id must be `partner_{pid}_{virtual|voucher}_…`.
 * Config may use short `id` (auto-prefixed) or full `skuId`.
 */
export function expandShopSku(raw, partnerId) {
  if (!raw || typeof raw !== "object") throw new Error("shop_sku_invalid");
  const kind = raw.kind === "voucher" ? "voucher" : raw.kind === "virtual" ? "virtual" : null;
  if (!kind) throw new Error("shop_sku_kind_required");

  const prefix = `partner_${partnerId}_${kind}_`;
  let skuId = typeof raw.skuId === "string" ? raw.skuId.trim() : "";
  if (!skuId) {
    const shortId = String(raw.id ?? "")
      .trim()
      .toLowerCase();
    if (!SKU_ID_TAIL_RE.test(shortId)) {
      throw new Error(`shop_sku_id_invalid:${raw.id ?? ""}`);
    }
    skuId = `${prefix}${shortId}`;
  } else if (!skuId.startsWith(prefix)) {
    throw new Error(`shop_sku_id_prefix:${skuId} (expected ${prefix}…)`);
  }

  const title = String(raw.title ?? "").trim();
  if (!title) throw new Error(`shop_sku_title_required:${skuId}`);

  const priceCoins = Number(raw.priceCoins);
  if (!Number.isInteger(priceCoins) || priceCoins < 0) {
    throw new Error(`shop_sku_price_invalid:${skuId}`);
  }

  const out = {
    kind,
    skuId,
    title,
    priceCoins,
    active: raw.active !== false,
  };

  if (typeof raw.description === "string") out.description = raw.description;
  if (typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder)) {
    out.sortOrder = Math.floor(raw.sortOrder);
  }
  if (raw.weeklyPurchaseLimit === null) {
    out.weeklyPurchaseLimit = null;
  } else if (
    typeof raw.weeklyPurchaseLimit === "number" &&
    Number.isFinite(raw.weeklyPurchaseLimit)
  ) {
    out.weeklyPurchaseLimit = Math.floor(raw.weeklyPurchaseLimit);
  }

  if (kind === "virtual") {
    const grant = Number(raw.grantTicketCount ?? raw.grantReplayTokenCount ?? 0);
    if (!Number.isInteger(grant) || grant < 0) {
      throw new Error(`shop_sku_grant_invalid:${skuId}`);
    }
    out.grantTicketCount = grant;
  } else {
    if (typeof raw.voucherRewardText === "string") {
      out.voucherRewardText = raw.voucherRewardText;
    }
    if (raw.voucherValidityDays === null) {
      out.voucherValidityDays = null;
    } else if (
      typeof raw.voucherValidityDays === "number" &&
      Number.isFinite(raw.voucherValidityDays)
    ) {
      out.voucherValidityDays = Math.floor(raw.voucherValidityDays);
    }
    if (typeof raw.listInShop === "boolean") out.listInShop = raw.listInShop;
  }

  return out;
}

const STAFF_ROLES = new Set(["owner", "admin", "developer", "viewer"]);

const PLAYER_AUTH_MODES = new Set(["clerk", "embed", "embed_then_clerk"]);
const EMBED_AUTH_METHODS = new Set([
  "jwt_local",
  "crazygames_jwt",
  "code_exchange",
  "session_introspect",
]);

/**
 * SSO playerAuth SoT. Omit → embed + embed.method (op:apply historical default).
 *
 *   "playerAuth": { "mode": "clerk" }
 *   "playerAuth": { "mode": "embed_then_clerk", "embed": { "method": "jwt_local" } }
 */
function expandPlayerAuth(raw, embedMethodFallback, filePath) {
  if (raw == null) {
    return { mode: "embed", embed: { method: embedMethodFallback } };
  }
  if (typeof raw !== "object") {
    throw new Error(`player_auth_invalid: ${filePath}`);
  }
  const mode = String(raw.mode ?? "").trim();
  if (!PLAYER_AUTH_MODES.has(mode)) {
    throw new Error(
      `player_auth_mode_invalid:${mode || "(empty)"} (clerk|embed|embed_then_clerk)`
    );
  }
  if (mode === "clerk") {
    return { mode: "clerk" };
  }
  const methodRaw = raw.embed?.method ?? embedMethodFallback;
  const method = String(methodRaw ?? "").trim();
  if (!EMBED_AUTH_METHODS.has(method)) {
    throw new Error(
      `player_auth_embed_method_invalid:${method || "(empty)"}`
    );
  }
  return { mode, embed: { method } };
}

function expandStaff(raw) {
  if (!raw || typeof raw !== "object") throw new Error("staff_invalid");
  const account = String(raw.account ?? "").trim();
  if (!account) throw new Error("staff_account_required");
  const role = String(raw.role ?? "owner").trim();
  if (!STAFF_ROLES.has(role)) {
    throw new Error(`staff_role_invalid:${role}`);
  }
  const passwordEnv =
    typeof raw.passwordEnv === "string" && raw.passwordEnv.trim()
      ? raw.passwordEnv.trim()
      : null;
  const password =
    typeof raw.password === "string" && raw.password.length > 0
      ? raw.password
      : null;
  if (!passwordEnv && !password) {
    throw new Error(`staff_password_required:${account} (set passwordEnv or password)`);
  }
  return { account, role, passwordEnv, password };
}

function expandNonNegIntArray(raw, label) {
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) {
    throw new Error(`shop_settings_checkin_rewards_invalid:${label}`);
  }
  return raw.map((n, i) => {
    const v = Number(n);
    if (!Number.isInteger(v) || v < 0) {
      throw new Error(`shop_settings_checkin_rewards_invalid:${label}[${i}]`);
    }
    return v;
  });
}

function expandCheckinRewards(raw, label) {
  if (raw == null) return {};
  if (typeof raw !== "object") {
    throw new Error(`shop_settings_checkin_rewards_invalid:${label}`);
  }
  const out = {};
  if (raw.baseTickets != null) {
    const v = Number(raw.baseTickets);
    if (!Number.isInteger(v) || v < 0) {
      throw new Error(`shop_settings_checkin_rewards_invalid:${label}.baseTickets`);
    }
    out.baseTickets = v;
  }
  if (raw.baseCoins != null) {
    const v = Number(raw.baseCoins);
    if (!Number.isInteger(v) || v < 0) {
      throw new Error(`shop_settings_checkin_rewards_invalid:${label}.baseCoins`);
    }
    out.baseCoins = v;
  }
  const tickets = expandNonNegIntArray(
    raw.streakBonusTickets,
    `${label}.streakBonusTickets`
  );
  if (tickets) out.streakBonusTickets = tickets;
  const coins = expandNonNegIntArray(
    raw.streakBonusCoins,
    `${label}.streakBonusCoins`
  );
  if (coins) out.streakBonusCoins = coins;
  return out;
}

function expandCheckinRewardKind(raw) {
  if (raw === "coins" || raw === "both" || raw === "tickets") return raw;
  return "tickets";
}

function expandShopSettingsBlock(raw, label) {
  if (!raw || typeof raw !== "object") {
    throw new Error(`shop_settings_invalid:${label}`);
  }
  const assortmentMode =
    raw.assortmentMode === "allowlist" ? "allowlist" : "all_shared";
  return {
    enabled: raw.enabled !== false,
    giftCardsEnabled: raw.giftCardsEnabled !== false,
    virtualEnabled: raw.virtualEnabled !== false,
    vouchersEnabled: raw.vouchersEnabled !== false,
    adCoinEnabled: raw.adCoinEnabled !== false,
    iapEnabled: raw.iapEnabled !== false,
    checkinEnabled: raw.checkinEnabled !== false,
    checkinRewardKind: expandCheckinRewardKind(raw.checkinRewardKind),
    checkinRewards: expandCheckinRewards(raw.checkinRewards, `${label}.checkinRewards`),
    assortmentMode,
    skuIds: Array.isArray(raw.skuIds)
      ? raw.skuIds.filter((id) => typeof id === "string")
      : [],
    excludeSkuIds: Array.isArray(raw.excludeSkuIds)
      ? raw.excludeSkuIds.filter((id) => typeof id === "string")
      : [],
    overrides:
      raw.overrides && typeof raw.overrides === "object" ? raw.overrides : {},
  };
}

function expandShopSettings(raw) {
  if (raw == null) return null;
  if (typeof raw !== "object") throw new Error("shop_settings_invalid");
  const base = expandShopSettingsBlock(raw, "base");
  const lobbyOverlays = Array.isArray(raw.lobbyOverlays)
    ? raw.lobbyOverlays.map((row, i) => {
        const lobbySlug = String(row?.lobbySlug ?? "")
          .trim()
          .toLowerCase();
        if (!lobbySlug) throw new Error(`shop_settings_lobby_slug_required:${i}`);
        return {
          lobbySlug,
          ...expandShopSettingsBlock(row, `lobby:${lobbySlug}`),
        };
      })
    : [];
  return { ...base, lobbyOverlays };
}

/** Known partner `portal.*` GC / play-entry keys (pass-through to Portal upsert). */
export const PORTAL_GC_OPS_KEYS = new Set([
  "lobbyOpsMode",
  "quotaScope",
  "seasonEpochWeekKey",
  "adReplayDailyCap",
  "maxReplaysPerMatch",
  "adReplayEnabled",
  "ticketReplayEnabled",
  "ticketReplayPriceTickets",
  "freePlaySoloDailyCap",
  "freePlayMultiDailyCap",
  "adEntryEnabled",
  "adEntrySoloDailyCap",
  "adEntryMultiDailyCap",
  "ticketEntryEnabled",
  "ticketEntrySoloPriceTickets",
  "ticketEntrySoloDailyCap",
  "ticketEntryMultiPriceTickets",
  "ticketEntryMultiDailyCap",
  "soloSuccessDailyEnabled",
  "soloSuccessDailyCap",
  "soloSuccessAfterCapMode",
  "soloSuccessAllowPlayAfterCap",
]);

/**
 * Patch partners/*.json in place.
 * @param {string} filePath
 * @param {{ portal?: Record<string, unknown>, lobbyPatches?: Array<{ slug: string, quotaScope?: string|null, seasonHonorMode?: string|null }> }} patch
 */
export function patchPartnerJson(filePath, patch) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!raw.portal || typeof raw.portal !== "object") raw.portal = {};

  if (patch.portal && typeof patch.portal === "object") {
    for (const [key, value] of Object.entries(patch.portal)) {
      if (value === undefined) continue;
      if (!PORTAL_GC_OPS_KEYS.has(key)) {
        console.warn(`[config] unknown portal key ignored: ${key}`);
        continue;
      }
      raw.portal[key] = value;
    }
  }

  if (Array.isArray(patch.lobbyPatches) && patch.lobbyPatches.length) {
    if (!Array.isArray(raw.lobbies)) {
      throw new Error("lobbies_missing_in_json");
    }
    for (const lp of patch.lobbyPatches) {
      const slug = String(lp.slug ?? "").trim().toLowerCase();
      const idx = raw.lobbies.findIndex(
        (l) => String(l?.slug ?? "").trim().toLowerCase() === slug
      );
      if (idx < 0) throw new Error(`lobby_not_in_json:${slug}`);
      if (lp.quotaScope !== undefined) {
        if (lp.quotaScope === null) delete raw.lobbies[idx].quotaScope;
        else raw.lobbies[idx].quotaScope = lp.quotaScope;
      }
      if (lp.seasonHonorMode !== undefined) {
        if (lp.seasonHonorMode === null) delete raw.lobbies[idx].seasonHonorMode;
        else raw.lobbies[idx].seasonHonorMode = lp.seasonHonorMode;
      }
    }
  }

  writePartnerConfig(filePath, raw);
  return raw;
}

/** Write partner JSON with stable 2-space formatting. */
export function writePartnerConfig(filePath, raw) {
  fs.writeFileSync(filePath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
}

/**
 * Scaffold a new partner JSON from `_template.json`.
 */
export function scaffoldPartnerConfig({
  pid,
  slug,
  name,
  host = "http://localhost:3000",
}) {
  const templatePath = path.join(PARTNERS_DIR, "_template.json");
  if (!fs.existsSync(templatePath)) {
    throw new Error(`template_missing: ${templatePath}`);
  }
  const raw = JSON.parse(fs.readFileSync(templatePath, "utf8"));
  const key = String(slug).trim().toLowerCase();
  raw.pid = Math.floor(Number(pid));
  raw.slug = key;
  raw.name = String(name ?? key).trim() || key;
  raw.host = String(host).trim() || "http://localhost:3000";
  if (raw.embed && typeof raw.embed === "object") {
    raw.embed.allowedOrigins = [raw.host];
  }
  if (Array.isArray(raw.staff)) {
    for (const s of raw.staff) {
      if (s?.passwordEnv) {
        s.passwordEnv = `PARTNER_STAFF_PASSWORD_${key
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_")}`;
      }
    }
  }
  const filePath = path.join(PARTNERS_DIR, `${key}.json`);
  if (fs.existsSync(filePath)) {
    throw new Error(`partner_config_exists: ${filePath}`);
  }
  writePartnerConfig(filePath, raw);
  return filePath;
}

/**
 * Load partner config by slug / filename (without .json).
 */
export function loadPartnerConfig(partnerKey) {
  if (!partnerKey || typeof partnerKey !== "string") {
    throw new Error("partner_required (pass --partner=<slug>)");
  }
  const key = partnerKey.trim().replace(/\.json$/i, "");
  const filePath = path.join(PARTNERS_DIR, `${key}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`partner_config_missing: ${filePath}`);
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return normalizePartnerConfig(raw, filePath);
}

export function listPartnerConfigKeys() {
  if (!fs.existsSync(PARTNERS_DIR)) return [];
  return fs
    .readdirSync(PARTNERS_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => f.replace(/\.json$/i, ""))
    .sort();
}

export function normalizePartnerConfig(raw, filePath = "(memory)") {
  if (!raw || typeof raw !== "object") {
    throw new Error(`partner_config_invalid: ${filePath}`);
  }
  const pid = Number(raw.pid);
  if (!Number.isFinite(pid) || pid < 0) {
    throw new Error(`partner_pid_invalid: ${filePath}`);
  }
  const slug = String(raw.slug ?? "").trim().toLowerCase();
  if (!slug) throw new Error(`partner_slug_required: ${filePath}`);

  const capabilities = {
    portalGames: raw.capabilities?.portalGames !== false,
    campaignOps: raw.capabilities?.campaignOps === true,
  };

  const embed = {
    method: raw.embed?.method ?? "jwt_local",
    jwtSecret: raw.embed?.jwtSecret,
    allowedOrigins: Array.isArray(raw.embed?.allowedOrigins)
      ? raw.embed.allowedOrigins
      : undefined,
  };

  const playerAuth = expandPlayerAuth(raw.playerAuth, embed.method, filePath);

  const portal =
    raw.portal && typeof raw.portal === "object" ? { ...raw.portal } : {};

  const partnerId = Math.floor(pid);

  const lobbies = Array.isArray(raw.lobbies)
    ? raw.lobbies.map(expandLobby)
    : [];

  const shopSkus = Array.isArray(raw.shopSkus)
    ? raw.shopSkus.map((sku) => expandShopSku(sku, partnerId))
    : [];

  const shopSettings = expandShopSettings(raw.shopSettings);
  const staff = Array.isArray(raw.staff) ? raw.staff.map(expandStaff) : [];

  return {
    filePath,
    pid: partnerId,
    name: String(raw.name ?? slug).trim() || slug,
    slug,
    host: String(raw.host ?? "http://localhost:3000").trim(),
    capabilities,
    embed,
    playerAuth,
    portal,
    lobbies,
    shopSkus,
    shopSettings,
    staff,
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
  };
}
