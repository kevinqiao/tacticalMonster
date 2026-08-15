#!/usr/bin/env node
/**
 * Mayfield town zone economy SSOT → generated TS.
 *
 *   npm run portal:economy:sync          # write (also runs shared play sync)
 *   npm run portal:economy:sync:check    # fail on drift
 *   node scripts/portal/economy/sync-town.mjs --dry-run
 *
 * Town-only: zones / mayor / districts / prosperity.
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
  assert(isPosInt(g.maxOfflineHours), "global.maxOfflineHours");
  assert(isNonNegNumber(g.passiveCapWeeklyShare) && g.passiveCapWeeklyShare <= 1, "global.passiveCapWeeklyShare");
  assert(
    isNonNegNumber(g.passiveCapSoftWeeklyShare) && g.passiveCapSoftWeeklyShare <= 1,
    "global.passiveCapSoftWeeklyShare"
  );
  assert(isPosInt(g.passiveCapRollingDays), "global.passiveCapRollingDays");
  assert(isPosInt(g.minCollectIntervalMs), "global.minCollectIntervalMs");
  assert(isNonNegInt(g.startingCoins), "global.startingCoins");

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
    assert(isNonNegInt(ex.minDevelopedZonesInPriorDistrict), `districts.${id}.expansion.minDevelopedZones`);
    assert(isPosInt(ex.minMayorLevel), `districts.${id}.expansion.minMayorLevel`);
    assert(typeof ex.mainQuestId === "string" && ex.mainQuestId, `districts.${id}.expansion.mainQuestId`);
    assert(isNonNegInt(ex.expansionFeeCoins), `districts.${id}.expansion.expansionFeeCoins`);
  }
  for (const extra of Object.keys(districts)) {
    assert(DISTRICT_IDS.includes(extra), `unknown districts.${extra}`);
  }

  validatePrecomputed(eco);
}

function validatePrecomputed(eco) {
  const g = eco.global;
  const pre = eco.precomputed;
  assert(pre && typeof pre === "object", "precomputed required");

  const develop = pre.developCostBySlotIndex;
  assert(Array.isArray(develop) && develop.length > 0, "precomputed.developCostBySlotIndex");
  for (const row of develop) {
    const expected = developCost(g, row.slotIndex);
    assert(
      row.coins === expected,
      `precomputed develop slot #${row.slotIndex}: expected ${expected} got ${row.coins}`
    );
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

  const sink = pre.d0FullBuildSinkCoins;
  if (sink) {
    const developable = eco.districts.D0.slots.filter((s) => s.developable).length;
    const developSum = Array.from({ length: developable }, (_, i) => developCost(g, i + 1)).reduce(
      (a, b) => a + b,
      0
    );
    assert(
      sink.developAll4Slots === developSum,
      `precomputed d0FullBuildSinkCoins.developAll4Slots: expected ${developSum} got ${sink.developAll4Slots}`
    );
    const commercial = eco.zoneTypes.commercial.upgradeCostBase;
    const upgradeSum = [1, 2, 3, 4].reduce(
      (sum, from) => sum + upgradeCost(commercial, g.upgradeExponent, from),
      0
    );
    assert(
      sink.upgradeAllCommercialTo5 === upgradeSum,
      `precomputed upgradeAllCommercialTo5: expected ${upgradeSum} got ${sink.upgradeAllCommercialTo5}`
    );
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
    passiveDistrictBonus: d.passiveDistrictBonus,
    prosperityDistrictFactor: d.prosperityDistrictFactor,
    maxProsperityUnits: d.maxProsperityUnits,
    slots: d.slots.map(pickSlot),
    expansion: d.expansion,
  };
}

function generate(eco) {
  const g = eco.global;
  const m = eco.mayorLevel;

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
 * Town-only zone / mayor / district meta. Shared play defaults live in portal-economy.json.
 * Regenerate: npm run portal:economy:sync
 * Check:     npm run portal:economy:sync:check
 */

import type {
  DistrictConfig,
  DistrictId,
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
  maxOfflineHours: ${g.maxOfflineHours},
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

export const ZONE_TYPES: Record<ZoneTypeId, ZoneTypeConfig> = {
${zoneTypesBody}
};

export const DISTRICTS: Record<DistrictId, DistrictConfig> = {
${districtsBody}
};
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
This file is Town-only (zones / mayor / districts).
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
