import { describe, expect, it } from "vitest";

import {
  DISTRICT_CATALOG,
  districtErrorMessage,
  districtLockCopy,
  districtStatusLine,
  expansionChecklist,
  formatLevyRemaining,
  liveDistrictCollect,
  nextExpansionBlocker,
} from "../districtSystem";
import { tableLockConditions, tableLockReason } from "../types";

const expansion = {
  minMayorLevel: 3,
  minPriorDistrictLevel: 3,
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

  it("asks for the Market quest after Mayor and Old Square level", () => {
    const list = expansionChecklist(expansion, 3, 3, 800);
    expect(list.mayor.ok).toBe(true);
    expect(list.prior.ok).toBe(true);
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
    expect(districtErrorMessage("NEED_HIGHER_DISTRICT_LEVEL")).toMatch(/Old Square/);
  });

  it("names districts without binding them to a game type", () => {
    expect(DISTRICT_CATALOG.every((row) => !("tables" in row))).toBe(true);
    expect(districtLockCopy("D1")).toBe("Develop Market Street");
    expect(districtLockCopy("D0")).toBe("Develop Old Square");
  });

  it("locks Yatz until Market Street is developed", () => {
    const yatzCoin = {
      id: "multi_yatz_coin",
      label: "Yatz Coin",
      tournamentId: "portal_multi_coin_yatz",
      requiredDistrictDeveloped: "D1",
    };
    expect(tableLockReason(yatzCoin, { D0: 5, D1: 0 })).toBe("Develop Market Street");
    expect(tableLockReason(yatzCoin, { D0: 5, D1: 1 })).toBeNull();
    expect(tableLockConditions(yatzCoin, { D1: 0 })).toEqual([
      { id: "district", label: "Develop Market Street", ok: false, districtId: "D1" },
    ]);
  });

  it("summarizes a district as type and level, not lots", () => {
    expect(districtStatusLine(undefined, false)).toBe("Locked");
    expect(districtStatusLine({ districtId: "D0", level: 0, type: null } as never, true)).toBe(
      "Undeveloped"
    );
    expect(
      districtStatusLine(
        { districtId: "D0", level: 3, type: "commercial", typeLabel: "Finance" } as never,
        true
      )
    ).toBe("Finance · Lv.3");
    expect(
      districtStatusLine(
        {
          districtId: "D0",
          level: 3,
          type: "commercial",
          typeLabel: "Finance",
          passivePerHour: 4,
        } as never,
        true
      )
    ).toBe("Finance · Lv.3 · 4/h");
  });

  it("shows dripped coins, the 8h cap, and collect anytime", () => {
    expect(formatLevyRemaining(3 * 3_600_000 + 12 * 60_000)).toBe("3h 12m");
    expect(formatLevyRemaining(48 * 60_000)).toBe("48m");
    const now = 8 * 3_600_000;
    const dripping = liveDistrictCollect(
      {
        active: true,
        ready: true,
        payout: 24,
        collectable: 15,
        remainingMs: 3 * 3_600_000,
        readyAt: now + 3 * 3_600_000,
        cappedByWeekly: false,
        ratePerHour: 3,
        dripping: true,
      },
      [],
      now
    );
    expect(dripping?.collectable).toBe(15);
    expect(dripping?.cap).toBe(24);
    expect(dripping?.canCollect).toBe(true);
    expect(dripping?.collectLabel).toBe("Collect +15");
    expect(dripping?.bankLine).toBe("15 / 24 · dripping · full in 3h");

    const full = liveDistrictCollect(
      {
        active: true,
        ready: true,
        payout: 24,
        collectable: 24,
        remainingMs: 0,
        readyAt: now,
        cappedByWeekly: false,
        ratePerHour: 3,
        dripping: false,
      },
      [],
      now
    );
    expect(full?.bankLine).toBe("24 / 24 · full · not dripping");
    expect(full?.collectLabel).toBe("Collect +24");

    const empty = liveDistrictCollect(null, [{ level: 1, passivePerHour: 1.2 } as never], now);
    expect(empty?.collectable).toBe(0);
    expect(empty?.cap).toBe(9);
    expect(empty?.canCollect).toBe(false);
    expect(empty?.collectLabel).toBe("Collect");
    expect(empty?.bankLine).toMatch(/0 \/ 9 · dripping · full in 8h/);
    expect(liveDistrictCollect(null, [], now)).toBeNull();
  });

  it("lets Solitaire open with no district development", () => {
    const free = {
      id: "multi_solitaire_free",
      label: "Ranked",
      tournamentId: "portal_multi_solitaire",
    };
    expect(tableLockReason(free, {})).toBeNull();
    expect(tableLockConditions(free, {})).toEqual([]);
  });
});
