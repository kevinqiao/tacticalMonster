#!/usr/bin/env node
/**
 * Portal economy balance report (read-only).
 * Reads scripts/portal/economy/portal-economy.json — same SSOT as sync.
 *
 *   npm run portal:economy:balance
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = join(__dirname, "portal-economy.json");

function giftCardPriceCoins(faceValueUsd, coinsPerUsd, scarcity = 1) {
  return Math.round(faceValueUsd * coinsPerUsd * scarcity);
}

function main() {
  if (!existsSync(JSON_PATH)) {
    console.error(`missing ${JSON_PATH}`);
    process.exit(1);
  }
  const eco = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const coinsPerUsd = eco.giftcard.coinsPerUsd;
  const targetFace = eco.giftcard.targetFaceUsd ?? 5;
  const targetCoins = Math.round(targetFace * coinsPerUsd);

  console.log("=== Portal economy balance ===\n");
  console.log(`version: ${eco.version}`);
  console.log(`coins/USD: ${coinsPerUsd}`);
  console.log(`giftcard target: $${targetFace} → ${targetCoins} coins\n`);

  console.log("--- Shop sinks ---");
  for (const s of eco.shopCatalog.skus) {
    let price = s.priceCoins;
    if (s.skuKind === "giftcard") {
      price = giftCardPriceCoins(
        s.faceValueUsd,
        coinsPerUsd,
        s.scarcityMultiplier ?? 1
      );
    }
    const weeksAtDiamondR1 = Math.ceil(price / eco.weeklyLeague.projectedCoins.diamond.r1);
    console.log(
      `  ${s.skuId.padEnd(28)} ${String(price).padStart(4)} coins` +
        (s.skuKind === "giftcard"
          ? `  (~${weeksAtDiamondR1}w @ diamond #1)`
          : s.grantReplayTokenCount
            ? `  (+${s.grantReplayTokenCount} tickets)`
            : "")
    );
  }

  console.log("\n--- Weekly league projected coins → weeks to $5 ---");
  const tiers = ["bronze", "silver", "gold", "platinum", "diamond"];
  const bands = [
    ["r1", "#1"],
    ["r2_3", "2–3"],
    ["r4_8", "4–8"],
    ["r9_22", "9–22"],
  ];
  for (const tier of tiers) {
    const row = eco.weeklyLeague.projectedCoins[tier];
    const parts = bands.map(([k, label]) => {
      const c = row[k];
      const w = Math.ceil(targetCoins / c);
      return `${label}:${c}(${w}w)`;
    });
    console.log(`  ${tier.padEnd(9)} ${parts.join("  ")}`);
  }

  console.log("\n--- Tournament / play defaults ---");
  console.log(
    `  multi coin entry: ${eco.tournamentRewards.multiCoinEntry}  rewards:`,
    eco.tournamentRewards.multiCoinRankRewards
  );
  console.log(
    `  free play solo/multi: ${eco.playDefaults.freePlay.solo}/${eco.playDefaults.freePlay.multi}`
  );
  console.log(
    `  ad entry solo/multi caps: ${eco.playDefaults.adEntry.solo.dailyCap}/${eco.playDefaults.adEntry.multi.dailyCap}`
  );
  console.log(
    `  ticket entry solo: ${eco.playDefaults.ticketEntry.solo.priceTickets}t×${eco.playDefaults.ticketEntry.solo.dailyCap}` +
      `  multi: ${eco.playDefaults.ticketEntry.multi.priceTickets}t×${eco.playDefaults.ticketEntry.multi.dailyCap}`
  );
  console.log(
    `  ad coin: ${eco.adCoin.rewardAmount} × ${eco.adCoin.dailyCap}/day` +
      `  (= ${eco.adCoin.rewardAmount * eco.adCoin.dailyCap}/day max)`
  );

  console.log("\n--- Season honor ---");
  console.log(
    `  epoch ${eco.seasonHonor.epochWeekKey}  ${eco.seasonHonor.seasonWeeks}w  Lv${eco.seasonHonor.maxLevel}`
  );
  console.log(
    `  xp win/play/settle/promote: ${eco.seasonHonor.xpWin}/${eco.seasonHonor.xpPlay}/${eco.seasonHonor.xpWeekSettle}/${eco.seasonHonor.xpWeekPromote}`
  );

  console.log("\nPartner overrides: npm run op:status -- --partner=<slug>");
  console.log("Detail table: node scripts/portal/breakeven-table.mjs");
}

main();
