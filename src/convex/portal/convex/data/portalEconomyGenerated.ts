/**
 * AUTO-GENERATED — DO NOT EDIT.
 * Source: scripts/portal/economy/portal-economy.json
 * Shared play + platform defaults (Town and Lobby). Not Lobby-only.
 * Town zone meta: mayfield-zone-economy.json → townEconomyGenerated.ts
 * Regenerate: npm run portal:economy:sync
 * Check:     npm run portal:economy:sync:check
 */

export const PORTAL_ECONOMY_VERSION = 1 as const;

// --- giftcard ---
export const PORTAL_COINS_PER_USD = 150;
export const PORTAL_GIFTCARD_TARGET_FACE_USD = 5;
export const PORTAL_REDEMPTION_REGION_LOCK_MS = 2592000000;
export const PORTAL_GIFTCARD_DEFAULT_MIN_ACCOUNT_AGE_DAYS = 7;
export const PORTAL_GIFTCARD_REWARD_LINK_CACHE_MS = 259200000;
export const PORTAL_REDEMPTION_REGIONS = ["US", "CA", "GB", "EU"] as const;

// --- shop catalog ---
export const PORTAL_SHOP_SKU_CATALOG = [
  {
    skuId: "portal_shop_ticket_3",
    skuKind: "virtual",
    title: "门票 ×3",
    description: "获得 3 张门票，可用于继续游戏。",
    priceCoins: 180,
    grantTicketCount: 3,
    weeklyPurchaseLimit: 5,
    sortOrder: 10,
  },
  {
    skuId: "portal_shop_ticket_10",
    skuKind: "virtual",
    title: "门票 ×10",
    description: "获得 10 张门票，可用于继续游戏。",
    priceCoins: 500,
    grantTicketCount: 10,
    weeklyPurchaseLimit: 3,
    sortOrder: 20,
  },
  {
    skuId: "portal_stripe_pack_t5_c100",
    skuKind: "iap",
    title: "畅玩礼包",
    description: "5 张门票 + 100 金币。",
    priceCoins: 0,
    stripePriceId: "price_1TzncDCydxyHQL6sGtobkBYe",
    priceCents: 299,
    currency: "usd",
    grantTicketCount: 5,
    grantCoinCount: 100,
    weeklyPurchaseLimit: 3,
    sortOrder: 5,
  },
  {
    skuId: "gc_amazon_5_us",
    skuKind: "giftcard",
    title: "Amazon 礼品卡 $5",
    description: "美国区 Amazon.com 电子礼品卡，兑换后通过链接领取。",
    priceCoins: 750,
    weeklyPurchaseLimit: 1,
    sortOrder: 100,
    region: "US",
    faceValueUsd: 5,
    faceValueLocal: 5,
    faceValueCurrency: "USD",
    scarcityMultiplier: 1,
    tangoUtid: "U163059",
    brandName: "Amazon.com",
    minAccountAgeDays: 7,
    requiresVerifiedContact: true,
  },
  {
    skuId: "gc_amazon_5_ca",
    skuKind: "giftcard",
    title: "Amazon 礼品卡 CA$5",
    description: "加拿大区 Amazon 电子礼品卡，兑换后通过链接领取。",
    priceCoins: 583,
    weeklyPurchaseLimit: 1,
    sortOrder: 110,
    region: "CA",
    faceValueUsd: 3.7,
    faceValueLocal: 5,
    faceValueCurrency: "CAD",
    scarcityMultiplier: 1.05,
    tangoUtid: "U945313",
    brandName: "Amazon.ca",
    minAccountAgeDays: 7,
    requiresVerifiedContact: true,
  },
] as const;

// --- tournament rewards ---
export const PORTAL_SOLO_POINTS = {
  fail: 0,
  success: 2,
  clearBonus: 1,
} as const;

export const PORTAL_MULTI_RANK_POINTS = {
  1: 5,
  2: 3,
  3: 1,
  4: -1,
  5: -2,
} as const;

export const PORTAL_MULTI_COIN_ENTRY = 20;

export const PORTAL_MULTI_COIN_RANK_REWARDS = {
  "1": 45,
  "2": 25,
  "3": 15,
  "4": 5,
} as const;

export const PORTAL_RANK_RATES_5 = [
  { rank: 1, odd: 30 },
  { rank: 2, odd: 25 },
  { rank: 3, odd: 20 },
  { rank: 4, odd: 15 },
  { rank: 5, odd: 10 },
] as const;

// --- season honor ---
export const PORTAL_SEASON_EPOCH_WEEK_KEY = "w:2026-07-27";
export const PORTAL_SEASON_WEEKS = 5;
export const PORTAL_SEASON_MAX_LEVEL = 30;
export const PORTAL_SEASON_LEVEL_XP = [0, 0, 8, 18, 30, 44, 60, 78, 98, 120, 144, 172, 204, 240, 280, 324, 372, 424, 480, 540, 604, 674, 750, 832, 920, 1014, 1114, 1220, 1332, 1450, 1574] as const;
export const PORTAL_SEASON_XP_WIN = 2;
export const PORTAL_SEASON_XP_PLAY = 2;
export const PORTAL_SEASON_XP_WEEK_SETTLE = 20;
export const PORTAL_SEASON_XP_WEEK_PROMOTE = 40;
export const PORTAL_SEASON_DAILY_WIN_XP_CAP = 24;
/** null = unlimited play XP per day */
export const PORTAL_SEASON_DAILY_PLAY_XP_CAP: number | null = null;

// --- weekly league (economy) ---
export const PORTAL_WEEKLY_LEAGUE_ENABLED = true;
export const PORTAL_WEEKLY_LEAGUE_COHORT_SIZE = 30;
export const PORTAL_WEEKLY_LEAGUE_PROJECTED_COINS = {
  bronze: { r1: 120, r2_3: 80, r4_8: 50, r9_22: 0 },
  silver: { r1: 150, r2_3: 100, r4_8: 65, r9_22: 0 },
  gold: { r1: 200, r2_3: 120, r4_8: 80, r9_22: 0 },
  platinum: { r1: 250, r2_3: 140, r4_8: 100, r9_22: 0 },
  diamond: { r1: 300, r2_3: 180, r4_8: 120, r9_22: 0 },
} as const;

// --- ad coin ---
export const PORTAL_AD_COIN_ENABLED = true;
export const PORTAL_AD_COIN_REWARD_AMOUNT = 3;
export const PORTAL_AD_COIN_DAILY_CAP = 5;
export const PORTAL_AD_COIN_SESSION_TTL_MS = 120000;
export const PORTAL_AD_COIN_CHANNELS = ["partner", "poki", "dev", "crazygames"] as const;

// --- daily check-in (tickets / coins) ---
export const PORTAL_DAILY_CHECKIN_ENABLED = true;
export const PORTAL_DAILY_CHECKIN_BASE_TICKETS = 1;
export const PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS = 7;
export const PORTAL_DAILY_CHECKIN_STREAK_BONUS_TICKETS = [0, 0, 1, 0, 0, 1, 2] as const;
export const PORTAL_DAILY_CHECKIN_BASE_COINS = 30;
export const PORTAL_DAILY_CHECKIN_STREAK_BONUS_COINS = [0, 0, 15, 0, 0, 15, 30] as const;

// --- play defaults: free ---
export const PORTAL_DAILY_PLAY_LIMITS = {
  solo: 3,
  multi: 5,
} as const;
export const PORTAL_FREE_PLAY_DAILY_CAP_MAX = 100;

// --- play defaults: ad entry ---
export const PORTAL_AD_ENTRY_DEFAULTS = {
  solo: { enabled: true, dailyCap: 1000000000 },
  multi: { enabled: true, dailyCap: 10 },
} as const;
export const PORTAL_AD_ENTRY_DAILY_CAP_MAX = 100;
export const PORTAL_AD_ENTRY_DAILY_CAP_UNLIMITED = 1000000000;
export const PORTAL_AD_ENTRY_SESSION_TTL_MS = 120000;
export const PORTAL_AD_ENTRY_GRANT_TTL_MS = 120000;

// --- play defaults: ticket entry ---
export const PORTAL_TICKET_ENTRY_DEFAULTS = {
  solo: {
    enabled: false,
    priceTickets: 1,
    dailyCap: 0,
  },
  multi: {
    enabled: true,
    priceTickets: 2,
    dailyCap: 5,
  },
} as const;
export const PORTAL_TICKET_ENTRY_PRICE_MIN = 1;
export const PORTAL_TICKET_ENTRY_PRICE_MAX = 100;
export const PORTAL_TICKET_ENTRY_DAILY_CAP_MAX = 100;

// --- play defaults: solo success daily reward cap ---
export const PORTAL_SOLO_SUCCESS_DAILY_DEFAULTS = {
  enabled: true,
  dailyCap: 5,
  afterCapMode: "zero_all",
  allowPlayAfterCap: true,
} as const;
export const PORTAL_SOLO_SUCCESS_DAILY_CAP_MAX = 100;

// --- play defaults: ad replay ---
export const PORTAL_AD_REPLAY_ENABLED = true;
export const PORTAL_AD_REPLAY_DAILY_CAP_UNLIMITED = 1000000000;
export const PORTAL_AD_REPLAY_DAILY_CAP = 1000000000;
export const PORTAL_AD_REPLAY_SESSION_TTL_MS = 120000;
export const PORTAL_AD_REPLAY_CHANNELS = ["crazygames", "poki", "partner", "dev"] as const;
export const PORTAL_MAX_REPLAYS_PER_MATCH_DEFAULT = 1;
export const PORTAL_TICKET_REPLAY_PRICE_DEFAULT = 1;
