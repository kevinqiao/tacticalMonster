const TARGET_COINS = 750; // $5 @ 150 coins/USD
const GIFT_COST = { face: 5.0, b2b: 4.85 };

const TIERS = ["bronze", "silver", "gold", "platinum", "diamond"];
const BANDS = [
  { label: "第1名", key: "r1" },
  { label: "2–3名", key: "r2_3" },
  { label: "4–8名", key: "r4_8" },
  { label: "9–22名", key: "r9_22" },
];

const COINS = {
  bronze: { r1: 200, r2_3: 120, r4_8: 60, r9_22: 20 },
  silver: { r1: 300, r2_3: 180, r4_8: 90, r9_22: 30 },
  gold: { r1: 500, r2_3: 300, r4_8: 150, r9_22: 50 },
  platinum: { r1: 800, r2_3: 480, r4_8: 240, r9_22: 80 },
  diamond: { r1: 1200, r2_3: 720, r4_8: 360, r9_22: 120 },
};

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

console.log("=== Regular + Base scenario ===");
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
