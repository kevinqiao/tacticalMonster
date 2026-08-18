#!/usr/bin/env node
/**
 * Mayfield town zone economy SSOT → generated TS.
 *
 *   npm run portal:economy:sync          # write (also runs shared play sync)
 *   npm run portal:economy:sync:check    # fail on drift
 *   node scripts/portal/economy/sync-town.mjs --dry-run
 *
 * Town-only: zones / mayor / venue XP / prosperity / districts / play entry overlay.
 * Shared play + platform defaults stay in portal-economy.json.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
const JSON_PATH = join(__dirname, "mayfield-zone-economy.json");
const OUT_PATH = join(
  REPO_ROOT,
  "src/convex/portal/convex/data/townEconomyGenerated.ts"
);

const ZONE_TYPE_IDS = [
  "commercial",
  "industrial",
  "tourism",
  "entertainment",
  "civic",
];
const DISTRICT_IDS = ["D0", "D1"];

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function assert(cond, msg) {
  if (!cond) fail(msg);
}

function isInt(n) {
  return typeof n === "number" && Number.isFinite(n) && Number.isInteger(n);
}

function isNonNegInt(n) {
  return isInt(n) && n >= 0;
}

function isPosInt(n) {
  return isInt(n) && n > 0;
}

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function isNonNegNumber(n) {
  return isFiniteNumber(n) && n >= 0;
}

function nearlyEqual(a, b, eps = 0.011) {
  return Math.abs(a - b) < eps;
}

function developCost(g, slotIndex) {
  return Math.round(g.developCostBase * g.developExponent ** (slotIndex - 1));
}

function upgradeCost(base, exponent, currentLevel) {
  return Math.round(base * exponent ** currentLevel);
}

function passivePerHour(base, growth, level, districtBonus, extra = 1) {
  const rate = base * growth ** (level - 1) * districtBonus * extra;
  return Math.round(rate * 100) / 100;
}

function validate(eco) {
  assert(eco && typeof eco === "object", "root must be object");
  assert(eco.version === 1, "version must be 1");
  assert(eco.townId === "mayfield", "townId must be mayfield");

  const g = eco.global;
  assert(g && typeof g === "object", "global required");
  assert(isPosInt(g.developCostBase), "global.developCostBase");
  assert(isFiniteNumber(g.developExponent) && g.developExponent > 1, "global.developExponent");
  assert(isFiniteNumber(g.upgradeExponent) && g.upgradeExponent > 1, "global.upgradeExponent");
  assert(isFiniteNumber(g.passiveGrowth) && g.passiveGrowth > 1, "global.passiveGrowth");
  assert(isPosInt(g.maxZoneLevel), "global.maxZoneLevel");
  assert(isPosInt(g.levyCycleHours), "global.levyCycleHours");
  assert(isNonNegNumber(g.passiveCapWeeklyShare) && g.passiveCapWeeklyShare <= 1, "global.passiveCapWeeklyShare");
  assert(
    isNonNegNumber(g.passiveCapSoftWeeklyShare) && g.passiveCapSoftWeeklyShare <= 1,
    "global.passiveCapSoftWeeklyShare"
  );
  assert(isPosInt(g.passiveCapRollingDays), "global.passiveCapRollingDays");
  assert(isPosInt(g.minCollectIntervalMs), "global.minCollectIntervalMs");
  assert(isNonNegInt(g.startingCoins), "global.startingCoins");

  const play = eco.playEntry;
  assert(play && typeof play === "object", "playEntry required");
  assert(isNonNegInt(play.freePlaySoloDailyCap), "playEntry.freePlaySoloDailyCap");
  assert(isNonNegInt(play.freePlayMultiDailyCap), "playEntry.freePlayMultiDailyCap");
  assert(play.adEntryEnabled === false || play.adEntryEnabled === true, "playEntry.adEntryEnabled");
  assert(isNonNegInt(play.adEntrySoloDailyCap), "playEntry.adEntrySoloDailyCap");
  assert(isNonNegInt(play.adEntryMultiDailyCap), "playEntry.adEntryMultiDailyCap");
  assert(play.ticketEntryEnabled === false || play.ticketEntryEnabled === true, "playEntry.ticketEntryEnabled");
  assert(isPosInt(play.ticketEntrySoloPriceTickets), "playEntry.ticketEntrySoloPriceTickets");
  assert(isNonNegInt(play.ticketEntrySoloDailyCap), "playEntry.ticketEntrySoloDailyCap");
  assert(isPosInt(play.ticketEntryMultiPriceTickets), "playEntry.ticketEntryMultiPriceTickets");
  assert(isNonNegInt(play.ticketEntryMultiDailyCap), "playEntry.ticketEntryMultiDailyCap");
  assert(
    play.soloSuccessDailyEnabled === false || play.soloSuccessDailyEnabled === true,
    "playEntry.soloSuccessDailyEnabled"
  );
  assert(isNonNegInt(play.soloSuccessDailyCap), "playEntry.soloSuccessDailyCap");
  assert(
    play.soloSuccessAllowPlayAfterCap === false || play.soloSuccessAllowPlayAfterCap === true,
    "playEntry.soloSuccessAllowPlayAfterCap"
  );

  const m = eco.mayorLevel;
  assert(m && typeof m === "object", "mayorLevel required");
  assert(isPosInt(m.maxLevel), "mayorLevel.maxLevel");
  assert(isNonNegInt(m.xpPerShowdownComplete), "mayorLevel.xpPerShowdownComplete");
  assert(isNonNegInt(m.xpPerTrialComplete), "mayorLevel.xpPerTrialComplete");
  assert(isNonNegInt(m.xpPerShowdownWin), "mayorLevel.xpPerShowdownWin");
  assert(isPosInt(m.dailyMayorXpCap), "mayorLevel.dailyMayorXpCap");
  assert(Array.isArray(m.levelXp) && m.levelXp.length === m.maxLevel + 1, "mayorLevel.levelXp length");
  for (let i = 0; i < m.levelXp.length; i++) {
    assert(isNonNegInt(m.levelXp[i]), `mayorLevel.levelXp[${i}]`);
    if (i > 1) {
      assert(m.levelXp[i] >= m.levelXp[i - 1], `mayorLevel.levelXp must be non-decreasing at ${i}`);
    }
  }

  const v = eco.venueLevel;
  assert(v && typeof v === "object", "venueLevel required");
  assert(isPosInt(v.maxLevel), "venueLevel.maxLevel");
  assert(isNonNegInt(v.xpPerTrialComplete), "venueLevel.xpPerTrialComplete");
  assert(isNonNegInt(v.xpPerShowdownComplete), "venueLevel.xpPerShowdownComplete");
  assert(isNonNegInt(v.xpPerShowdownWin), "venueLevel.xpPerShowdownWin");
  assert(v.dailyXpCap && typeof v.dailyXpCap === "object", "venueLevel.dailyXpCap");
  assert(isPosInt(v.dailyXpCap.trial), "venueLevel.dailyXpCap.trial");
  assert(isPosInt(v.dailyXpCap.showdown), "venueLevel.dailyXpCap.showdown");
  assert(Array.isArray(v.levelXp) && v.levelXp.length === v.maxLevel + 1, "venueLevel.levelXp length");
  for (let i = 0; i < v.levelXp.length; i++) {
    assert(isNonNegInt(v.levelXp[i]), `venueLevel.levelXp[${i}]`);
    if (i > 1) {
      assert(v.levelXp[i] >= v.levelXp[i - 1], `venueLevel.levelXp must be non-decreasing at ${i}`);
    }
  }

  const milestones = eco.prosperityMilestones;
  assert(Array.isArray(milestones) && milestones.length > 0, "prosperityMilestones required");
  const seenMilestoneIds = new Set();
  for (let i = 0; i < milestones.length; i++) {
    const row = milestones[i];
    assert(row && typeof row === "object", `prosperityMilestones[${i}]`);
    assert(typeof row.id === "string" && row.id, `prosperityMilestones[${i}].id`);
    assert(!seenMilestoneIds.has(row.id), `prosperityMilestones duplicate id ${row.id}`);
    seenMilestoneIds.add(row.id);
    assert(isPosInt(row.threshold) && row.threshold <= 100, `prosperityMilestones[${i}].threshold`);
    if (i > 0) {
      assert(row.threshold > milestones[i - 1].threshold, `prosperityMilestones thresholds must increase at ${i}`);
    }
    assert(typeof row.title === "string" && row.title, `prosperityMilestones[${i}].title`);
    assert(typeof row.titleZh === "string" && row.titleZh, `prosperityMilestones[${i}].titleZh`);
    assert(typeof row.blurb === "string" && row.blurb, `prosperityMilestones[${i}].blurb`);
  }

  const types = eco.zoneTypes;
  assert(types && typeof types === "object", "zoneTypes required");
  for (const id of ZONE_TYPE_IDS) {
    const t = types[id];
    assert(t && typeof t === "object", `zoneTypes.${id} required`);
    assert(typeof t.label === "string" && t.label, `zoneTypes.${id}.label`);
    assert(typeof t.labelZh === "string" && t.labelZh, `zoneTypes.${id}.labelZh`);
    assert(isNonNegNumber(t.passiveBasePerHour), `zoneTypes.${id}.passiveBasePerHour`);
    assert(isNonNegNumber(t.upgradeCostBase), `zoneTypes.${id}.upgradeCostBase`);
    assert(isNonNegNumber(t.prosperityWeight), `zoneTypes.${id}.prosperityWeight`);
    assert(
      Array.isArray(t.allowedDistricts) && t.allowedDistricts.length > 0,
      `zoneTypes.${id}.allowedDistricts`
    );
    for (const d of t.allowedDistricts) {
      assert(DISTRICT_IDS.includes(d), `zoneTypes.${id}.allowedDistricts has unknown ${d}`);
    }
    if (t.prebuiltOnly) {
      assert(t.prebuiltOnly === true, `zoneTypes.${id}.prebuiltOnly`);
    }
    if (t.showdownBonus) {
      assert(isPosInt(t.showdownBonus.minGamesPerWeek), `zoneTypes.${id}.showdownBonus.minGamesPerWeek`);
      assert(
        isFiniteNumber(t.showdownBonus.passiveMultiplier) && t.showdownBonus.passiveMultiplier > 1,
        `zoneTypes.${id}.showdownBonus.passiveMultiplier`
      );
    }
    if (t.coinTableBonus) {
      assert(isPosInt(t.coinTableBonus.minGamesPerWeek), `zoneTypes.${id}.coinTableBonus.minGamesPerWeek`);
      assert(
        isFiniteNumber(t.coinTableBonus.passiveMultiplier) && t.coinTableBonus.passiveMultiplier > 1,
        `zoneTypes.${id}.coinTableBonus.passiveMultiplier`
      );
    }
  }
  for (const extra of Object.keys(types)) {
    assert(ZONE_TYPE_IDS.includes(extra), `unknown zoneTypes.${extra}`);
  }

  const districts = eco.districts;
  assert(districts && typeof districts === "object", "districts required");
  for (const id of DISTRICT_IDS) {
    const d = districts[id];
    assert(d && typeof d === "object", `districts.${id} required`);
    assert(typeof d.label === "string" && d.label, `districts.${id}.label`);
    assert(typeof d.labelZh === "string" && d.labelZh, `districts.${id}.labelZh`);
    assert(isPosInt(d.developCost), `districts.${id}.developCost`);
    assert(isPosInt(d.rebrandCost), `districts.${id}.rebrandCost`);
    assert(Array.isArray(d.typeChoices) && d.typeChoices.length > 0, `districts.${id}.typeChoices`);
    for (const c of d.typeChoices) {
      assert(ZONE_TYPE_IDS.includes(c), `districts.${id} unknown typeChoice ${c}`);
      assert(types[c].allowedDistricts.includes(id), `${c} not allowed in ${id}`);
    }
    if (d.gameType != null) {
      assert(typeof d.gameType === "string" && d.gameType, `districts.${id}.gameType`);
    }
    assert(isFiniteNumber(d.passiveDistrictBonus) && d.passiveDistrictBonus > 0, `districts.${id}.passiveDistrictBonus`);
    assert(
      isFiniteNumber(d.prosperityDistrictFactor) && d.prosperityDistrictFactor > 0,
      `districts.${id}.prosperityDistrictFactor`
    );
    assert(isPosInt(d.maxProsperityUnits), `districts.${id}.maxProsperityUnits`);
    assert(Array.isArray(d.slots) && d.slots.length > 0, `districts.${id}.slots`);
    const seen = new Set();
    for (const slot of d.slots) {
      assert(typeof slot.slotId === "string" && slot.slotId, `districts.${id} slot missing slotId`);
      assert(!seen.has(slot.slotId), `districts.${id} duplicate slot ${slot.slotId}`);
      seen.add(slot.slotId);
      assert(typeof slot.developable === "boolean", `districts.${id}.${slot.slotId}.developable`);
      if (slot.zoneType !== null) {
        assert(ZONE_TYPE_IDS.includes(slot.zoneType), `districts.${id}.${slot.slotId}.zoneType`);
      }
      if (slot.developable) {
        assert(slot.zoneType === null, `districts.${id}.${slot.slotId} developable slots start empty`);
        assert(
          Array.isArray(slot.choices) && slot.choices.length > 0,
          `districts.${id}.${slot.slotId}.choices`
        );
        for (const c of slot.choices) {
          assert(ZONE_TYPE_IDS.includes(c), `districts.${id}.${slot.slotId} unknown choice ${c}`);
          assert(types[c].allowedDistricts.includes(id), `${c} not allowed in ${id}`);
        }
      } else {
        assert(ZONE_TYPE_IDS.includes(slot.zoneType), `districts.${id}.${slot.slotId} prebuilt needs zoneType`);
        assert(isPosInt(slot.prebuiltLevel), `districts.${id}.${slot.slotId}.prebuiltLevel`);
      }
    }
    if (d.expansion === null) {
      continue;
    }
    const ex = d.expansion;
    assert(ex && typeof ex === "object", `districts.${id}.expansion`);
    assert(DISTRICT_IDS.includes(ex.requiresDistrict), `districts.${id}.expansion.requiresDistrict`);
    assert(isPosInt(ex.minPriorDistrictLevel), `districts.${id}.expansion.minPriorDistrictLevel`);
    assert(isPosInt(ex.minMayorLevel), `districts.${id}.expansion.minMayorLevel`);
    assert(typeof ex.mainQuestId === "string" && ex.mainQuestId, `districts.${id}.expansion.mainQuestId`);
    assert(isNonNegInt(ex.expansionFeeCoins), `districts.${id}.expansion.expansionFeeCoins`);
  }
  for (const extra of Object.keys(districts)) {
    assert(DISTRICT_IDS.includes(extra), `unknown districts.${extra}`);
  }

  validateTermPass(eco);
  validateGameCatalog(eco);
  validateGameOps(eco);
  validatePrecomputed(eco);
}

function validateTermPass(eco) {
  const p = eco.termPass;
  assert(p && typeof p === "object", "termPass required");
  assert(isPosInt(p.xpPerShowdown), "termPass.xpPerShowdown");
  assert(isPosInt(p.xpPerSoloSuccess), "termPass.xpPerSoloSuccess");
  assert(isFiniteNumber(p.prosperitySpeedPerPoint) && p.prosperitySpeedPerPoint > 0, "termPass.prosperitySpeedPerPoint");
  assert(isPosInt(p.mainNodes), "termPass.mainNodes");
  const total = p.mainNodes;
  assert(Array.isArray(p.nodeXp) && p.nodeXp.length === total, "termPass.nodeXp length");
  for (let i = 0; i < p.nodeXp.length; i++) {
    assert(isPosInt(p.nodeXp[i]), `termPass.nodeXp[${i}]`);
  }
  assert(Array.isArray(p.rewards) && p.rewards.length === total, "termPass.rewards length");
  const seen = new Set();
  for (const row of p.rewards) {
    assert(isPosInt(row.node) && row.node <= total, "termPass.rewards.node");
    assert(!seen.has(row.node), `termPass.rewards duplicate node ${row.node}`);
    seen.add(row.node);
    assert(["coins", "tickets", "title"].includes(row.kind), `termPass.rewards[${row.node}].kind`);
    if (row.kind === "title") {
      assert(typeof row.titleId === "string" && row.titleId, `termPass.rewards[${row.node}].titleId`);
      assert(typeof row.title === "string" && row.title, `termPass.rewards[${row.node}].title`);
    } else {
      assert(isPosInt(row.amount), `termPass.rewards[${row.node}].amount`);
    }
  }
}

function validateGameCatalog(eco) {
  const rows = eco.gameCatalog;
  assert(Array.isArray(rows) && rows.length > 0, "gameCatalog required");
  const seen = new Set();
  for (const row of rows) {
    assert(typeof row.gameType === "string" && row.gameType, "gameCatalog.gameType");
    assert(!seen.has(row.gameType), `gameCatalog duplicate ${row.gameType}`);
    seen.add(row.gameType);
    assert(typeof row.label === "string" && row.label, "gameCatalog.label");
    if (row.requiredDistrict != null) {
      assert(DISTRICT_IDS.includes(row.requiredDistrict), `gameCatalog.${row.gameType}.requiredDistrict`);
    }
  }
}

function validateGameOps(eco) {
  const ops = eco.gameOps;
  assert(ops && typeof ops === "object", "gameOps required");
  assert(isPosInt(ops.featuredPlaysRequired), "gameOps.featuredPlaysRequired");
  assert(isPosInt(ops.featuredCoinReward), "gameOps.featuredCoinReward");
  assert(isPosInt(ops.dualPlaysRequired), "gameOps.dualPlaysRequired");
  assert(isPosInt(ops.dualCoinReward), "gameOps.dualCoinReward");
  assert(Array.isArray(ops.rotation) && ops.rotation.length > 0, "gameOps.rotation");
  const catalog = new Set(eco.gameCatalog.map((g) => g.gameType));
  const seen = new Set();
  for (const ev of ops.rotation) {
    assert(typeof ev.id === "string" && ev.id, "gameOps.rotation.id");
    assert(!seen.has(ev.id), `gameOps.rotation duplicate ${ev.id}`);
    seen.add(ev.id);
    assert(["featured", "launch", "dual"].includes(ev.kind), `gameOps.rotation.${ev.id}.kind`);
    assert(typeof ev.title === "string" && ev.title, `gameOps.rotation.${ev.id}.title`);
    if (ev.kind === "dual") {
      assert(Array.isArray(ev.gameTypes) && ev.gameTypes.length >= 2, `gameOps.rotation.${ev.id}.gameTypes`);
      for (const g of ev.gameTypes) assert(catalog.has(g), `gameOps.rotation.${ev.id} unknown ${g}`);
    } else {
      assert(catalog.has(ev.gameType), `gameOps.rotation.${ev.id}.gameType`);
    }
  }
}

function validatePrecomputed(eco) {
  const g = eco.global;
  const pre = eco.precomputed;
  assert(pre && typeof pre === "object", "precomputed required");

  const develop = pre.developCostByDistrict;
  assert(develop && typeof develop === "object", "precomputed.developCostByDistrict");
  for (const id of DISTRICT_IDS) {
    assert(develop[id] === eco.districts[id].developCost, `precomputed.developCostByDistrict.${id}`);
  }
  const rebrand = pre.rebrandCostByDistrict;
  assert(rebrand && typeof rebrand === "object", "precomputed.rebrandCostByDistrict");
  for (const id of DISTRICT_IDS) {
    assert(rebrand[id] === eco.districts[id].rebrandCost, `precomputed.rebrandCostByDistrict.${id}`);
  }

  const upgrades = pre.upgradeCostByTypeAndLevel;
  assert(upgrades && typeof upgrades === "object", "precomputed.upgradeCostByTypeAndLevel");
  for (const [type, rows] of Object.entries(upgrades)) {
    const cfg = eco.zoneTypes[type];
    assert(cfg, `precomputed upgrade unknown type ${type}`);
    assert(!cfg.prebuiltOnly, `precomputed upgrade should omit prebuilt-only ${type}`);
    for (const row of rows) {
      const expected = upgradeCost(cfg.upgradeCostBase, g.upgradeExponent, row.fromLevel);
      assert(
        row.coins === expected,
        `precomputed upgrade ${type} L${row.fromLevel}: expected ${expected} got ${row.coins}`
      );
    }
  }

  const d0Bonus = eco.districts.D0.passiveDistrictBonus;
  const passive = pre.passivePerHourD0;
  assert(passive && typeof passive === "object", "precomputed.passivePerHourD0");
  for (const type of ["commercial", "industrial", "tourism", "entertainment"]) {
    const series = passive[type];
    assert(Array.isArray(series) && series.length === g.maxZoneLevel, `precomputed.passivePerHourD0.${type}`);
    const base = eco.zoneTypes[type].passiveBasePerHour;
    for (let i = 0; i < series.length; i++) {
      const expected = passivePerHour(base, g.passiveGrowth, i + 1, d0Bonus);
      assert(
        nearlyEqual(series[i], expected),
        `precomputed passive D0 ${type} L${i + 1}: expected ${expected} got ${series[i]}`
      );
    }
  }
  const bonus = eco.zoneTypes.entertainment.showdownBonus.passiveMultiplier;
  const boosted = passive.entertainmentWithBonus;
  assert(Array.isArray(boosted) && boosted.length === g.maxZoneLevel, "precomputed.entertainmentWithBonus");
  const entBase = eco.zoneTypes.entertainment.passiveBasePerHour;
  for (let i = 0; i < boosted.length; i++) {
    const expected = passivePerHour(entBase, g.passiveGrowth, i + 1, d0Bonus, bonus);
    assert(
      nearlyEqual(boosted[i], expected),
      `precomputed entertainmentWithBonus L${i + 1}: expected ${expected} got ${boosted[i]}`
    );
  }
  const coinBonus = eco.zoneTypes.commercial.coinTableBonus.passiveMultiplier;
  const commercialBoosted = passive.commercialWithBonus;
  assert(Array.isArray(commercialBoosted) && commercialBoosted.length === g.maxZoneLevel, "precomputed.commercialWithBonus");
  const commercialBase = eco.zoneTypes.commercial.passiveBasePerHour;
  for (let i = 0; i < commercialBoosted.length; i++) {
    const expected = passivePerHour(commercialBase, g.passiveGrowth, i + 1, d0Bonus, coinBonus);
    assert(
      nearlyEqual(commercialBoosted[i], expected),
      `precomputed commercialWithBonus L${i + 1}: expected ${expected} got ${commercialBoosted[i]}`
    );
  }

  const sink = pre.d0FullBuildSinkCoins;
  if (sink) {
    assert(sink.developD0 === eco.districts.D0.developCost, "precomputed d0FullBuildSinkCoins.developD0");
    const commercial = eco.zoneTypes.commercial.upgradeCostBase;
    const upgradeSum = [1, 2, 3, 4].reduce(
      (sum, from) => sum + upgradeCost(commercial, g.upgradeExponent, from),
      0
    );
    assert(
      sink.upgradeCommercialTo5 === upgradeSum,
      `precomputed upgradeCommercialTo5: expected ${upgradeSum} got ${sink.upgradeCommercialTo5}`
    );
    assert(sink.rebrandD0 === eco.districts.D0.rebrandCost, "precomputed d0FullBuildSinkCoins.rebrandD0");
  }
}

function tsLiteral(value, indent = 0) {
  const pad = "  ".repeat(indent);
  const padIn = "  ".repeat(indent + 1);
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.every((x) => typeof x === "number" || typeof x === "string" || typeof x === "boolean")) {
      return `[${value.map((v) => tsLiteral(v)).join(", ")}]`;
    }
    const inner = value.map((v) => `${padIn}${tsLiteral(v, indent + 1)},`).join("\n");
    return `[\n${inner}\n${pad}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return "{}";
    const inner = keys
      .map((k) => {
        const key = /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : JSON.stringify(k);
        return `${padIn}${key}: ${tsLiteral(value[k], indent + 1)},`;
      })
      .join("\n");
    return `{\n${inner}\n${pad}}`;
  }
  throw new Error(`unsupported value: ${String(value)}`);
}

function formatLevelXp(arr) {
  const chunks = [];
  const per = 16;
  for (let i = 0; i < arr.length; i += per) {
    chunks.push(arr.slice(i, i + per).join(", "));
  }
  return `[\n    ${chunks.join(",\n    ")},\n  ]`;
}

function pickZoneType(t) {
  const out = {
    label: t.label,
    labelZh: t.labelZh,
    passiveBasePerHour: t.passiveBasePerHour,
    upgradeCostBase: t.upgradeCostBase,
    prosperityWeight: t.prosperityWeight,
  };
  if (t.prebuiltOnly) out.prebuiltOnly = true;
  if (t.showdownBonus) {
    out.showdownBonus = {
      minGamesPerWeek: t.showdownBonus.minGamesPerWeek,
      passiveMultiplier: t.showdownBonus.passiveMultiplier,
    };
  }
  if (t.coinTableBonus) {
    out.coinTableBonus = {
      minGamesPerWeek: t.coinTableBonus.minGamesPerWeek,
      passiveMultiplier: t.coinTableBonus.passiveMultiplier,
    };
  }
  out.allowedDistricts = t.allowedDistricts;
  return out;
}

function pickSlot(slot) {
  const out = {
    slotId: slot.slotId,
    zoneType: slot.zoneType,
    developable: slot.developable,
  };
  if (slot.prebuiltLevel != null) out.prebuiltLevel = slot.prebuiltLevel;
  if (slot.choices) out.choices = slot.choices;
  return out;
}

function pickDistrict(d) {
  return {
    label: d.label,
    labelZh: d.labelZh,
    developCost: d.developCost,
    rebrandCost: d.rebrandCost,
    typeChoices: d.typeChoices,
    gameType: d.gameType ?? null,
    passiveDistrictBonus: d.passiveDistrictBonus,
    prosperityDistrictFactor: d.prosperityDistrictFactor,
    maxProsperityUnits: d.maxProsperityUnits,
    slots: d.slots.map(pickSlot),
    expansion: d.expansion,
  };
}

function pickTermPass(p) {
  return {
    xpPerShowdown: p.xpPerShowdown,
    xpPerSoloSuccess: p.xpPerSoloSuccess,
    prosperitySpeedPerPoint: p.prosperitySpeedPerPoint,
    mainNodes: p.mainNodes,
    nodeXp: p.nodeXp,
    rewards: p.rewards,
  };
}

function generate(eco) {
  const g = eco.global;
  const m = eco.mayorLevel;
  const venue = eco.venueLevel;

  const zoneTypesBody = ZONE_TYPE_IDS.map((id) => {
    const body = tsLiteral(pickZoneType(eco.zoneTypes[id]), 1);
    return `  ${id}: ${body},`;
  }).join("\n");

  const districtsBody = DISTRICT_IDS.map((id) => {
    const body = tsLiteral(pickDistrict(eco.districts[id]), 1);
    return `  ${id}: ${body},`;
  }).join("\n");

  return `/**
 * AUTO-GENERATED — DO NOT EDIT.
 * Source: scripts/portal/economy/mayfield-zone-economy.json
 * Town-only zone / mayor / venue / prosperity / district meta. Shared play defaults live in portal-economy.json.
 * Regenerate: npm run portal:economy:sync
 * Check:     npm run portal:economy:sync:check
 */

import type {
  DistrictConfig,
  DistrictId,
  GameCatalogEntry,
  GameOpsConfig,
  TermPassConfig,
  ZoneTypeConfig,
  ZoneTypeId,
} from "../service/town/zoneEconomyConfig";

export const TOWN_ECONOMY_VERSION = ${eco.version} as const;
export const TOWN_ECONOMY_TOWN_ID = ${JSON.stringify(eco.townId)} as const;

export const ZONE_GLOBAL = {
  developCostBase: ${g.developCostBase},
  developExponent: ${g.developExponent},
  upgradeExponent: ${g.upgradeExponent},
  passiveGrowth: ${g.passiveGrowth},
  maxZoneLevel: ${g.maxZoneLevel},
  levyCycleHours: ${g.levyCycleHours},
  passiveCapWeeklyShare: ${g.passiveCapWeeklyShare},
  passiveCapSoftWeeklyShare: ${g.passiveCapSoftWeeklyShare},
  passiveCapRollingDays: ${g.passiveCapRollingDays},
  minCollectIntervalMs: ${g.minCollectIntervalMs},
  startingCoins: ${g.startingCoins},
} as const;

export const MAYOR_LEVEL_CONFIG = {
  maxLevel: ${m.maxLevel},
  xpPerShowdownComplete: ${m.xpPerShowdownComplete},
  xpPerTrialComplete: ${m.xpPerTrialComplete},
  xpPerShowdownWin: ${m.xpPerShowdownWin},
  dailyMayorXpCap: ${m.dailyMayorXpCap},
  levelXp: ${formatLevelXp(m.levelXp)} as const,
} as const;

export const VENUE_LEVEL_CONFIG = {
  maxLevel: ${venue.maxLevel},
  xpPerTrialComplete: ${venue.xpPerTrialComplete},
  xpPerShowdownComplete: ${venue.xpPerShowdownComplete},
  xpPerShowdownWin: ${venue.xpPerShowdownWin},
  dailyXpCap: {
    trial: ${venue.dailyXpCap.trial},
    showdown: ${venue.dailyXpCap.showdown},
  },
  levelXp: ${tsLiteral(venue.levelXp)} as const,
} as const;

export const PROSPERITY_MILESTONES = ${tsLiteral(eco.prosperityMilestones)} as const;

export const TOWN_PLAY_ENTRY = {
  freePlaySoloDailyCap: ${eco.playEntry.freePlaySoloDailyCap},
  freePlayMultiDailyCap: ${eco.playEntry.freePlayMultiDailyCap},
  adEntryEnabled: ${eco.playEntry.adEntryEnabled},
  adEntrySoloDailyCap: ${eco.playEntry.adEntrySoloDailyCap},
  adEntryMultiDailyCap: ${eco.playEntry.adEntryMultiDailyCap},
  ticketEntryEnabled: ${eco.playEntry.ticketEntryEnabled},
  ticketEntrySoloPriceTickets: ${eco.playEntry.ticketEntrySoloPriceTickets},
  ticketEntrySoloDailyCap: ${eco.playEntry.ticketEntrySoloDailyCap},
  ticketEntryMultiPriceTickets: ${eco.playEntry.ticketEntryMultiPriceTickets},
  ticketEntryMultiDailyCap: ${eco.playEntry.ticketEntryMultiDailyCap},
  soloSuccessDailyEnabled: ${eco.playEntry.soloSuccessDailyEnabled},
  soloSuccessDailyCap: ${eco.playEntry.soloSuccessDailyCap},
  soloSuccessAllowPlayAfterCap: ${eco.playEntry.soloSuccessAllowPlayAfterCap},
} as const;

export const ZONE_TYPES: Record<ZoneTypeId, ZoneTypeConfig> = {
${zoneTypesBody}
};

export const DISTRICTS: Record<DistrictId, DistrictConfig> = {
${districtsBody}
};

export const TERM_PASS: TermPassConfig = ${tsLiteral(pickTermPass(eco.termPass))};

export const GAME_CATALOG: GameCatalogEntry[] = ${tsLiteral(eco.gameCatalog)};

export const GAME_OPS: GameOpsConfig = ${tsLiteral(eco.gameOps)};
`;
}

function printHelp() {
  console.log(`Usage:
  npm run op -- economy sync              # write both generated files
  npm run op -- economy check             # fail on drift
  node scripts/portal/economy/sync-town.mjs [--check|--dry-run]

Flags:
  --check      compare generated file to mayfield-zone-economy.json (no write)
  --dry-run    print whether write would happen

SSOT: scripts/portal/economy/mayfield-zone-economy.json
Generated: src/convex/portal/convex/data/townEconomyGenerated.ts
This file is Town-only (zones / mayor / venue XP / prosperity / districts).
Shared play + platform defaults: portal-economy.json`);
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
      console.log(`✓ ${relOut} in sync with mayfield-zone-economy.json`);
      return;
    }
    console.error(`✗ ${relOut} drifted from mayfield-zone-economy.json`);
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
