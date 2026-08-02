#!/usr/bin/env node
/**
 * Portal global economy SSOT → generated TS.
 *
 *   npm run portal:economy:sync          # write
 *   npm run portal:economy:sync:check    # fail on drift
 *   node scripts/portal/economy/sync.mjs --dry-run
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
const JSON_PATH = join(__dirname, "portal-economy.json");
const OUT_PATH = join(
  REPO_ROOT,
  "src/convex/portal/convex/data/portalEconomyGenerated.ts"
);

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function assert(cond, msg) {
  if (!cond) fail(msg);
}

function isPosInt(n) {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && Number.isInteger(n);
}

function isPosNumber(n) {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function giftCardPriceCoins(faceValueUsd, coinsPerUsd, scarcity = 1) {
  return Math.round(faceValueUsd * coinsPerUsd * scarcity);
}

function validate(eco) {
  assert(eco && typeof eco === "object", "root must be object");
  assert(eco.version === 1, "version must be 1");

  const g = eco.giftcard;
  assert(g && typeof g === "object", "giftcard required");
  assert(isPosNumber(g.coinsPerUsd), "giftcard.coinsPerUsd > 0");
  assert(isPosNumber(g.targetFaceUsd), "giftcard.targetFaceUsd > 0");
  assert(isPosInt(g.regionLockMs), "giftcard.regionLockMs");
  assert(isPosInt(g.defaultMinAccountAgeDays), "giftcard.defaultMinAccountAgeDays");
  assert(isPosInt(g.rewardLinkCacheMs), "giftcard.rewardLinkCacheMs");
  assert(Array.isArray(g.regions) && g.regions.length > 0, "giftcard.regions");

  const skus = eco.shopCatalog?.skus;
  assert(Array.isArray(skus) && skus.length > 0, "shopCatalog.skus required");
  for (const s of skus) {
    assert(s.skuId && s.skuKind, `sku missing id/kind: ${JSON.stringify(s?.skuId)}`);
    if (s.skuKind === "virtual") {
      assert(isPosInt(s.priceCoins), `virtual priceCoins: ${s.skuId}`);
      const tickets = s.grantTicketCount ?? s.grantReplayTokenCount ?? 0;
      assert(isPosInt(tickets), `virtual grantTicketCount: ${s.skuId}`);
    } else if (s.skuKind === "iap") {
      assert(isPosInt(s.priceCoins), `iap priceCoins: ${s.skuId}`);
      assert(
        typeof s.stripePriceId === "string" && s.stripePriceId.trim().length > 0,
        `iap stripePriceId: ${s.skuId}`
      );
      assert(isPosInt(s.priceCents) && s.priceCents > 0, `iap priceCents: ${s.skuId}`);
      assert(typeof s.currency === "string" && s.currency.trim(), `iap currency: ${s.skuId}`);
      const tickets = s.grantTicketCount ?? s.grantReplayTokenCount ?? 0;
      const coins = s.grantCoinCount ?? 0;
      assert(isPosInt(tickets), `iap grantTicketCount: ${s.skuId}`);
      assert(isPosInt(coins), `iap grantCoinCount: ${s.skuId}`);
      assert(tickets > 0 || coins > 0, `iap must grant tickets or coins: ${s.skuId}`);
    } else if (s.skuKind === "giftcard") {
      assert(isPosNumber(s.faceValueUsd), `giftcard faceValueUsd: ${s.skuId}`);
      assert(
        typeof s.scarcityMultiplier === "number" && s.scarcityMultiplier > 0,
        `giftcard scarcityMultiplier: ${s.skuId}`
      );
    }
  }

  const tr = eco.tournamentRewards;
  assert(tr?.soloPoints?.success != null && tr?.soloPoints?.fail != null, "tournamentRewards.soloPoints");
  assert(tr?.multiRankPoints && typeof tr.multiRankPoints === "object", "tournamentRewards.multiRankPoints");
  assert(isPosInt(tr.multiCoinEntry), "tournamentRewards.multiCoinEntry");
  assert(Array.isArray(tr.rankRates5) && tr.rankRates5.length === 5, "tournamentRewards.rankRates5");

  const sh = eco.seasonHonor;
  assert(typeof sh?.epochWeekKey === "string", "seasonHonor.epochWeekKey");
  assert(isPosInt(sh.seasonWeeks) && sh.seasonWeeks > 0, "seasonHonor.seasonWeeks");
  assert(isPosInt(sh.maxLevel) && sh.maxLevel > 0, "seasonHonor.maxLevel");
  assert(Array.isArray(sh.levelXp) && sh.levelXp.length === sh.maxLevel + 1, "seasonHonor.levelXp length");

  const wl = eco.weeklyLeague;
  assert(typeof wl?.enabled === "boolean", "weeklyLeague.enabled");
  assert(isPosInt(wl.cohortSize) && wl.cohortSize > 0, "weeklyLeague.cohortSize");
  for (const tier of ["bronze", "silver", "gold", "platinum", "diamond"]) {
    const row = wl.projectedCoins?.[tier];
    assert(row && isPosInt(row.r1), `weeklyLeague.projectedCoins.${tier}`);
  }

  const ac = eco.adCoin;
  assert(typeof ac?.enabled === "boolean", "adCoin.enabled");
  assert(isPosInt(ac.rewardAmount), "adCoin.rewardAmount");
  assert(isPosInt(ac.dailyCap), "adCoin.dailyCap");
  assert(Array.isArray(ac.channels) && ac.channels.length > 0, "adCoin.channels");

  const dc = eco.dailyCheckin;
  assert(typeof dc?.enabled === "boolean", "dailyCheckin.enabled");
  assert(isPosInt(dc.baseTickets) && dc.baseTickets > 0, "dailyCheckin.baseTickets");
  assert(
    isPosInt(dc.streakCycleDays) && dc.streakCycleDays > 0,
    "dailyCheckin.streakCycleDays"
  );
  assert(
    Array.isArray(dc.streakBonusTickets) &&
      dc.streakBonusTickets.length === dc.streakCycleDays,
    "dailyCheckin.streakBonusTickets length"
  );
  for (const n of dc.streakBonusTickets) {
    assert(isPosInt(n), "dailyCheckin.streakBonusTickets entries");
  }

  const pd = eco.playDefaults;
  assert(pd?.freePlay && isPosInt(pd.freePlay.solo), "playDefaults.freePlay");
  assert(pd?.adEntry?.solo && pd?.adEntry?.multi, "playDefaults.adEntry");
  assert(pd?.ticketEntry?.solo && pd?.ticketEntry?.multi, "playDefaults.ticketEntry");
  assert(pd?.adReplay && typeof pd.adReplay.enabled === "boolean", "playDefaults.adReplay");
}

function tsStringArray(arr) {
  return `[${arr.map((s) => JSON.stringify(s)).join(", ")}]`;
}

function tsNumberArray(arr) {
  return `[${arr.join(", ")}]`;
}

function formatRecordNumberKeys(obj, indent = "  ") {
  const lines = Object.keys(obj)
    .sort((a, b) => Number(a) - Number(b) || String(a).localeCompare(String(b)))
    .map((k) => `${indent}${k}: ${obj[k]},`);
  return `{\n${lines.join("\n")}\n}`;
}

function formatStringKeyedRecord(obj, indent = "  ") {
  const lines = Object.keys(obj)
    .sort()
    .map((k) => `${indent}${JSON.stringify(k)}: ${obj[k]},`);
  return `{\n${lines.join("\n")}\n}`;
}

function formatProjectedCoins(pc) {
  const tiers = ["bronze", "silver", "gold", "platinum", "diamond"];
  const lines = tiers.map((t) => {
    const r = pc[t];
    return `  ${t}: { r1: ${r.r1}, r2_3: ${r.r2_3}, r4_8: ${r.r4_8}, r9_22: ${r.r9_22} },`;
  });
  return `{\n${lines.join("\n")}\n}`;
}

function buildShopCatalog(eco) {
  const coinsPerUsd = eco.giftcard.coinsPerUsd;
  const minAge = eco.giftcard.defaultMinAccountAgeDays;
  return eco.shopCatalog.skus.map((s) => {
    if (s.skuKind === "giftcard") {
      const scarcity = s.scarcityMultiplier ?? 1;
      return {
        skuId: s.skuId,
        skuKind: "giftcard",
        title: s.title,
        description: s.description ?? "",
        region: s.region,
        faceValueUsd: s.faceValueUsd,
        faceValueLocal: s.faceValueLocal,
        faceValueCurrency: s.faceValueCurrency,
        scarcityMultiplier: scarcity,
        tangoUtid: s.tangoUtid,
        brandName: s.brandName,
        priceCoins: giftCardPriceCoins(s.faceValueUsd, coinsPerUsd, scarcity),
        weeklyPurchaseLimit: s.weeklyPurchaseLimit,
        minAccountAgeDays: s.minAccountAgeDays ?? minAge,
        requiresVerifiedContact: s.requiresVerifiedContact !== false,
        sortOrder: s.sortOrder,
      };
    }
    if (s.skuKind === "iap") {
      return {
        skuId: s.skuId,
        skuKind: "iap",
        title: s.title,
        description: s.description ?? "",
        priceCoins: s.priceCoins ?? 0,
        stripePriceId: s.stripePriceId,
        priceCents: s.priceCents,
        currency: s.currency,
        grantTicketCount: s.grantTicketCount ?? s.grantReplayTokenCount ?? 0,
        grantCoinCount: s.grantCoinCount ?? 0,
        weeklyPurchaseLimit: s.weeklyPurchaseLimit,
        sortOrder: s.sortOrder,
      };
    }
    return {
      skuId: s.skuId,
      skuKind: s.skuKind ?? "virtual",
      title: s.title,
      description: s.description ?? "",
      priceCoins: s.priceCoins,
      grantTicketCount: s.grantTicketCount ?? s.grantReplayTokenCount ?? 0,
      weeklyPurchaseLimit: s.weeklyPurchaseLimit,
      sortOrder: s.sortOrder,
    };
  });
}

function formatSku(sku) {
  const lines = ["  {"];
  const order = [
    "skuId",
    "skuKind",
    "title",
    "description",
    "priceCoins",
    "stripePriceId",
    "priceCents",
    "currency",
    "grantTicketCount",
    "grantCoinCount",
    "weeklyPurchaseLimit",
    "sortOrder",
    "region",
    "faceValueUsd",
    "faceValueLocal",
    "faceValueCurrency",
    "scarcityMultiplier",
    "tangoUtid",
    "brandName",
    "minAccountAgeDays",
    "requiresVerifiedContact",
  ];
  for (const key of order) {
    if (sku[key] === undefined) continue;
    const v = sku[key];
    const lit =
      typeof v === "string"
        ? JSON.stringify(v)
        : typeof v === "boolean"
          ? String(v)
          : String(v);
    lines.push(`    ${key}: ${lit},`);
  }
  lines.push("  },");
  return lines.join("\n");
}

function generate(eco) {
  const catalog = buildShopCatalog(eco);
  const g = eco.giftcard;
  const tr = eco.tournamentRewards;
  const sh = eco.seasonHonor;
  const wl = eco.weeklyLeague;
  const ac = eco.adCoin;
  const dc = eco.dailyCheckin;
  const fp = eco.playDefaults.freePlay;
  const ae = eco.playDefaults.adEntry;
  const te = eco.playDefaults.ticketEntry;
  const ar = eco.playDefaults.adReplay;

  const adReplayDailyCap = ar.dailyCapUnlimited
    ? ar.dailyCapUnlimitedSentinel
    : ar.dailyCapDefault;

  assert(
    isPosInt(adReplayDailyCap),
    "adReplay daily cap (unlimited sentinel or dailyCapDefault)"
  );

  const header = `/**
 * AUTO-GENERATED — DO NOT EDIT.
 * Source: scripts/portal/economy/portal-economy.json
 * Regenerate: npm run portal:economy:sync
 * Check:     npm run portal:economy:sync:check
 */

`;

  const body = `export const PORTAL_ECONOMY_VERSION = ${eco.version} as const;

// --- giftcard ---
export const PORTAL_COINS_PER_USD = ${g.coinsPerUsd};
export const PORTAL_GIFTCARD_TARGET_FACE_USD = ${g.targetFaceUsd};
export const PORTAL_REDEMPTION_REGION_LOCK_MS = ${g.regionLockMs};
export const PORTAL_GIFTCARD_DEFAULT_MIN_ACCOUNT_AGE_DAYS = ${g.defaultMinAccountAgeDays};
export const PORTAL_GIFTCARD_REWARD_LINK_CACHE_MS = ${g.rewardLinkCacheMs};
export const PORTAL_REDEMPTION_REGIONS = ${tsStringArray(g.regions)} as const;

// --- shop catalog ---
export const PORTAL_SHOP_SKU_CATALOG = [
${catalog.map(formatSku).join("\n")}
] as const;

// --- tournament rewards ---
export const PORTAL_SOLO_POINTS = {
  success: ${tr.soloPoints.success},
  fail: ${tr.soloPoints.fail},
} as const;

export const PORTAL_MULTI_RANK_POINTS = ${formatRecordNumberKeys(tr.multiRankPoints)} as const;

export const PORTAL_MULTI_COIN_ENTRY = ${tr.multiCoinEntry};

export const PORTAL_MULTI_COIN_RANK_REWARDS = ${formatStringKeyedRecord(tr.multiCoinRankRewards)} as const;

export const PORTAL_RANK_RATES_5 = [
${tr.rankRates5.map((r) => `  { rank: ${r.rank}, odd: ${r.odd} },`).join("\n")}
] as const;

// --- season honor ---
export const PORTAL_SEASON_EPOCH_WEEK_KEY = ${JSON.stringify(sh.epochWeekKey)};
export const PORTAL_SEASON_WEEKS = ${sh.seasonWeeks};
export const PORTAL_SEASON_MAX_LEVEL = ${sh.maxLevel};
export const PORTAL_SEASON_LEVEL_XP = ${tsNumberArray(sh.levelXp)} as const;
export const PORTAL_SEASON_XP_WIN = ${sh.xpWin};
export const PORTAL_SEASON_XP_PLAY = ${sh.xpPlay};
export const PORTAL_SEASON_XP_WEEK_SETTLE = ${sh.xpWeekSettle};
export const PORTAL_SEASON_XP_WEEK_PROMOTE = ${sh.xpWeekPromote};
export const PORTAL_SEASON_DAILY_WIN_XP_CAP = ${sh.dailyWinXpCap};
export const PORTAL_SEASON_DAILY_PLAY_XP_CAP = ${sh.dailyPlayXpCap};

// --- weekly league (economy) ---
export const PORTAL_WEEKLY_LEAGUE_ENABLED = ${wl.enabled};
export const PORTAL_WEEKLY_LEAGUE_COHORT_SIZE = ${wl.cohortSize};
export const PORTAL_WEEKLY_LEAGUE_PROJECTED_COINS = ${formatProjectedCoins(wl.projectedCoins)} as const;

// --- ad coin ---
export const PORTAL_AD_COIN_ENABLED = ${ac.enabled};
export const PORTAL_AD_COIN_REWARD_AMOUNT = ${ac.rewardAmount};
export const PORTAL_AD_COIN_DAILY_CAP = ${ac.dailyCap};
export const PORTAL_AD_COIN_SESSION_TTL_MS = ${ac.sessionTtlMs};
export const PORTAL_AD_COIN_CHANNELS = ${tsStringArray(ac.channels)} as const;

// --- daily check-in (tickets) ---
export const PORTAL_DAILY_CHECKIN_ENABLED = ${dc.enabled};
export const PORTAL_DAILY_CHECKIN_BASE_TICKETS = ${dc.baseTickets};
export const PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS = ${dc.streakCycleDays};
export const PORTAL_DAILY_CHECKIN_STREAK_BONUS_TICKETS = ${tsNumberArray(dc.streakBonusTickets)} as const;

// --- play defaults: free ---
export const PORTAL_DAILY_PLAY_LIMITS = {
  solo: ${fp.solo},
  multi: ${fp.multi},
} as const;
export const PORTAL_FREE_PLAY_DAILY_CAP_MAX = ${fp.capMax};

// --- play defaults: ad entry ---
export const PORTAL_AD_ENTRY_DEFAULTS = {
  solo: { enabled: ${ae.solo.enabled}, dailyCap: ${ae.solo.dailyCap} },
  multi: { enabled: ${ae.multi.enabled}, dailyCap: ${ae.multi.dailyCap} },
} as const;
export const PORTAL_AD_ENTRY_DAILY_CAP_MAX = ${ae.dailyCapMax};
export const PORTAL_AD_ENTRY_SESSION_TTL_MS = ${ae.sessionTtlMs};
export const PORTAL_AD_ENTRY_GRANT_TTL_MS = ${ae.grantTtlMs};

// --- play defaults: ticket entry ---
export const PORTAL_TICKET_ENTRY_DEFAULTS = {
  solo: {
    enabled: ${te.solo.enabled},
    priceTickets: ${te.solo.priceTickets},
    dailyCap: ${te.solo.dailyCap},
  },
  multi: {
    enabled: ${te.multi.enabled},
    priceTickets: ${te.multi.priceTickets},
    dailyCap: ${te.multi.dailyCap},
  },
} as const;
export const PORTAL_TICKET_ENTRY_PRICE_MIN = ${te.priceMin};
export const PORTAL_TICKET_ENTRY_PRICE_MAX = ${te.priceMax};
export const PORTAL_TICKET_ENTRY_DAILY_CAP_MAX = ${te.dailyCapMax};

// --- play defaults: ad replay ---
export const PORTAL_AD_REPLAY_ENABLED = ${ar.enabled};
export const PORTAL_AD_REPLAY_DAILY_CAP_UNLIMITED = ${ar.dailyCapUnlimitedSentinel};
export const PORTAL_AD_REPLAY_DAILY_CAP = ${adReplayDailyCap};
export const PORTAL_AD_REPLAY_SESSION_TTL_MS = ${ar.sessionTtlMs};
export const PORTAL_AD_REPLAY_CHANNELS = ${tsStringArray(ar.channels)} as const;
export const PORTAL_MAX_REPLAYS_PER_MATCH_DEFAULT = ${ar.maxReplaysPerMatchDefault};
export const PORTAL_TICKET_REPLAY_PRICE_DEFAULT = ${ar.ticketReplayPriceDefault};
`;

  return header + body;
}

function printHelp() {
  console.log(`Usage:
  npm run op -- economy sync              # write portalEconomyGenerated.ts
  npm run op -- economy check             # fail on drift
  npm run portal:economy:sync
  npm run portal:economy:sync:check

Flags:
  --check      compare generated file to portal-economy.json (no write)
  --dry-run    print whether write would happen

SSOT: scripts/portal/economy/portal-economy.json
After sync: deploy / convex dev Portal.

Partner overrides (caps, entry toggles) are NOT in this file —
use: npm run op -- partner gc-ops|play-entry|apply`);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.some((a) => a === "help" || a === "-h" || a === "--help")) {
    printHelp();
    return;
  }
  const checkOnly = argv.includes("--check");
  const dryRun = argv.includes("--dry-run");

  if (!existsSync(JSON_PATH)) fail(`missing ${JSON_PATH}`);
  const eco = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  validate(eco);

  // Spot-check giftcard prices match formula used in runtime
  const us = eco.shopCatalog.skus.find((s) => s.skuId === "gc_amazon_5_us");
  const ca = eco.shopCatalog.skus.find((s) => s.skuId === "gc_amazon_5_ca");
  if (us) {
    const p = giftCardPriceCoins(us.faceValueUsd, eco.giftcard.coinsPerUsd, us.scarcityMultiplier ?? 1);
    assert(p === 750, `gc_amazon_5_us expected 750 got ${p}`);
  }
  if (ca) {
    const p = giftCardPriceCoins(ca.faceValueUsd, eco.giftcard.coinsPerUsd, ca.scarcityMultiplier ?? 1);
    assert(p === 583, `gc_amazon_5_ca expected 583 got ${p}`);
  }

  const next = generate(eco);
  const relOut = relative(REPO_ROOT, OUT_PATH).replace(/\\/g, "/");

  if (dryRun) {
    const prev = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, "utf8") : "";
    const changed = prev !== next;
    console.log(`[dry-run] ${relOut}`);
    console.log(`  would ${changed ? "write" : "skip (unchanged)"} (${next.split("\n").length} lines)`);
    return;
  }

  if (checkOnly) {
    if (!existsSync(OUT_PATH)) {
      fail(`${relOut} missing. Run: npm run portal:economy:sync`);
    }
    const prev = readFileSync(OUT_PATH, "utf8");
    if (prev === next) {
      console.log(`✓ ${relOut} in sync with portal-economy.json`);
      return;
    }
    console.error(`✗ ${relOut} drifted from portal-economy.json`);
    console.error("  Run: npm run portal:economy:sync");
    const prevLines = prev.split("\n");
    const nextLines = next.split("\n");
    let diffs = 0;
    for (let i = 0; i < Math.max(prevLines.length, nextLines.length); i++) {
      if (prevLines[i] !== nextLines[i]) {
        console.error(`  line ${i + 1}:`);
        if (prevLines[i] !== undefined) console.error(`    - ${prevLines[i]}`);
        if (nextLines[i] !== undefined) console.error(`    + ${nextLines[i]}`);
        if (++diffs >= 8) {
          console.error("  …");
          break;
        }
      }
    }
    process.exit(1);
  }

  if (existsSync(OUT_PATH) && readFileSync(OUT_PATH, "utf8") === next) {
    console.log(`✓ ${relOut} already up to date`);
    return;
  }

  writeFileSync(OUT_PATH, next, "utf8");
  console.log(`wrote ${relOut}`);
  console.log("  next: deploy / convex dev Portal");
}

main();
