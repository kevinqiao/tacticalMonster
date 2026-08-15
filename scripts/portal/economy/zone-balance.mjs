#!/usr/bin/env node
/**
 * Mayfield Zone economy balance report (read-only).
 * SSOT: scripts/portal/economy/mayfield-zone-economy.json
 *
 *   npm run op -- economy balance
 *   node scripts/portal/economy/zone-balance.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = join(__dirname, "mayfield-zone-economy.json");

function main() {
  if (!existsSync(JSON_PATH)) {
    console.error(`missing ${JSON_PATH}`);
    process.exit(1);
  }
  const eco = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const g = eco.global;

  console.log("=== Mayfield Zone economy ===\n");
  console.log(`version: ${eco.version}`);
  console.log(`develop: ${g.developCostBase} × ${g.developExponent}^n`);
  console.log(`upgrade: baseType × ${g.upgradeExponent}^L`);
  console.log(`passive cap: ${g.passiveCapWeeklyShare * 100}% / ${g.passiveCapRollingDays}d rolling\n`);

  console.log("--- Develop cost (per district slot index) ---");
  for (const row of eco.precomputed.developCostBySlotIndex) {
    console.log(`  slot #${row.slotIndex}: ${row.coins} coins`);
  }

  console.log("\n--- Upgrade cost (L→L+1) ---");
  for (const [type, rows] of Object.entries(eco.precomputed.upgradeCostByTypeAndLevel)) {
    const line = rows.map((r) => `L${r.fromLevel}→${r.toLevel}=${r.coins}`).join("  ");
    console.log(`  ${type.padEnd(14)} ${line}`);
  }

  console.log("\n--- Passive coins/hour @ D0 (no entertainment bonus) ---");
  for (const [type, rates] of Object.entries(eco.precomputed.passivePerHourD0)) {
    if (type === "entertainmentWithBonus") continue;
    console.log(`  ${type.padEnd(14)} ${rates.map((r, i) => `L${i + 1}=${r}`).join("  ")}`);
  }

  console.log("\n--- D0 full build sinks ---");
  const sink = eco.precomputed.d0FullBuildSinkCoins;
  console.log(`  develop 4 slots: ${sink.developAll4Slots}`);
  console.log(`  upgrade 4× commercial→5: ${sink.upgradeAllCommercialTo5}`);
  console.log(`  ${sink.note}`);

  console.log("\n--- Reference weekly budget ---");
  const ref = eco.precomputed.referenceWeeklyCoinBudget;
  console.log(`  hall+quest ~${ref.assumedHallAndQuestCoins}/wk → passive cap ~${ref.passiveCapAt25Percent}/wk (~${ref.passiveCapPerDay}/day)`);

  console.log("\n--- D1 expansion ---");
  const exp = eco.districts.D1.expansion;
  console.log(
    `  Mayor Lv.${exp.minMayorLevel}, ${exp.minDevelopedZonesInPriorDistrict} zones in ${exp.requiresDistrict}, quest ${exp.mainQuestId}, fee ${exp.expansionFeeCoins}`
  );
}

main();
