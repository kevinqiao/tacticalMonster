import { describe, expect, it } from "vitest";

import {
  DISTRICT_CATALOG,
  districtErrorMessage,
  districtLockCopy,
  expansionChecklist,
  nextExpansionBlocker,
} from "../districtSystem";
import { tableLockConditions, tableLockReason } from "../types";

const expansion = {
  minMayorLevel: 3,
  minDevelopedZones: 3,
  questId: "quest_d1_market",
  feeCoins: 800,
  questComplete: false,
  unlocked: false,
  canExpand: false,
};

describe("districtSystem", () => {
  it("lists the first missing D1 gate", () => {
    const list = expansionChecklist(expansion, 2, 1, 100);
    expect(nextExpansionBlocker(list)).toBe("Need Mayor Lv.3");
    expect(list.canExpand).toBe(false);
  });

  it("asks for the Market quest after Mayor and zones", () => {
    const list = expansionChecklist(expansion, 3, 3, 800);
    expect(list.mayor.ok).toBe(true);
    expect(list.zones.ok).toBe(true);
    expect(list.quest.ok).toBe(false);
    expect(nextExpansionBlocker(list)).toMatch(/Market quest/);
  });

  it("allows expand when backend gates and coins are ready", () => {
    const list = expansionChecklist({ ...expansion, questComplete: true }, 3, 3, 800);
    expect(list.canExpand).toBe(true);
    expect(nextExpansionBlocker(list)).toBeNull();
  });

  it("maps district errors for the player", () => {
    expect(districtErrorMessage("DISTRICT_LOCKED")).toBe("Unlock this district first");
    expect(districtErrorMessage("QUEST_REQUIRED")).toBe("Finish the Market quest first");
  });

  it("names districts without binding them to a game type", () => {
    expect(DISTRICT_CATALOG.every((row) => !("tables" in row))).toBe(true);
    expect(districtLockCopy("D1")).toBe("Market Street · Locked");
    expect(districtLockCopy("D0")).toBe("Old Square · Locked");
  });

  it("shows table unlock conditions instead of a game-type lock", () => {
    const yatzCoin = {
      id: "multi_yatz_coin",
      label: "Yatz Coin",
      tournamentId: "portal_multi_coin_yatz",
      requiredDistrict: "D1",
      requiredVenueLevel: 2,
      requiredZoneType: "commercial" as const,
    };
    expect(tableLockReason(yatzCoin, ["D0"], 1, {})).toBe("Market Street · Locked");
    expect(tableLockReason(yatzCoin, ["D0", "D1"], 1, { commercial: 1 })).toBe("Venue Lv.2 required");
    expect(tableLockReason(yatzCoin, ["D0", "D1"], 2, {})).toBe("Develop a Finance zone first");
    expect(tableLockReason(yatzCoin, ["D0", "D1"], 2, { commercial: 1 })).toBeNull();
    expect(tableLockConditions(yatzCoin, ["D0"], 1, {})).toEqual([
      { id: "district", label: "Open Market Street", ok: false, districtId: "D1" },
      { id: "venue", label: "Venue Lv.2", ok: false },
      { id: "zone", label: "Develop a Finance zone", ok: false },
    ]);
  });
});
