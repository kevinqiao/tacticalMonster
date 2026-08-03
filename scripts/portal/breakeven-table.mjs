/**
 * Offline breakeven table for weekly league coins vs gift card.
 * Reads coins / target from scripts/portal/economy/portal-economy.json.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ECO_PATH = join(__dirname, "economy", "portal-economy.json");
const eco = JSON.parse(readFileSync(ECO_PATH, "utf8"));

const TARGET_COINS = Math.round(
  (eco.giftcard.targetFaceUsd ?? 5) * eco.giftcard.coinsPerUsd
);
const GIFT_COST = { face: eco.giftcard.targetFaceUsd ?? 5.0, b2b: 4.85 };

const TIERS = ["bronze", "silver", "gold", "platinum", "diamond"];
const BANDS = [
  { label: "第1名", key: "r1" },
  { label: "2–3名", key: "r2_3" },
  { label: "4–8名", key: "r4_8" },
  { label: "9–22名", key: "r9_22" },
];

const COINS = eco.weeklyLeague.projectedCoins;

const PROFILES = {
  casual: { label: "轻度", rewardedPerDay: 1, sessionsPerDay: 1 },
  regular: { label: "常规", rewardedPerDay: 2, sessionsPerDay: 1.5 },
  grinder: { label: "重度", rewardedPerDay: 4, sessionsPerDay: 2 },
};

const AD = {
  conservative: { rewarded: 0.012, banner: 0.003, label: "保守" },
  base: { rewarded: 0.018, banner: 0.008, label: "基准" },
  optimistic: { rewarded: 0.025, banner: 0.015, label: "乐观" },
};

function dailyAd(p, ad) {
  return p.rewardedPerDay * ad.rewarded + p.sessionsPerDay * ad.banner;
}

function adOverWeeks(p, ad, weeks) {
  return dailyAd(p, ad) * 7 * weeks;
}

const rows = [];
for (const tier of TIERS) {
  for (const band of BANDS) {
    const wkCoins = COINS[tier][band.key];
    const weeks = Math.ceil(TARGET_COINS / wkCoins);
    const days = weeks * 7;
    const breakevenDayFace = GIFT_COST.face / days;
    const breakevenDayB2b = GIFT_COST.b2b / days;
    const adRanges = {};
    for (const [pk, p] of Object.entries(PROFILES)) {
      adRanges[pk] = {};
      for (const [ak, ad] of Object.entries(AD)) {
        adRanges[pk][ak] = adOverWeeks(p, ad, weeks);
      }
    }
    rows.push({
      tier,
      band: band.label,
      wkCoins,
      weeks,
      days,
      breakevenDayFace,
      breakevenDayB2b,
      adRanges,
    });
  }
}

console.log(
  `=== Regular + Base scenario (target ${TARGET_COINS} coins = $${GIFT_COST.face} @ ${eco.giftcard.coinsPerUsd}/USD) ===`
);
for (const r of rows) {
  const ad = r.adRanges.regular.base;
  const margin = ad - GIFT_COST.b2b;
  const pass = ad >= GIFT_COST.b2b ? "PASS" : "FAIL";
  console.log(
    [
      r.tier.padEnd(8),
      r.band.padEnd(8),
      `${r.weeks}w`.padStart(3),
      `coins/wk=${String(r.wkCoins).padStart(4)}`,
      `ad=$${ad.toFixed(2)}`.padStart(10),
      `margin=$${margin.toFixed(2)}`.padStart(12),
      pass,
    ].join("  ")
  );
}

console.log("\n=== JSON ===");
console.log(JSON.stringify(rows, null, 2));
