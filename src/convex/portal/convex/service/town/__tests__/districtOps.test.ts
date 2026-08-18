import { describe, expect, it } from "vitest";

import { migrateLotsToDistrictOps } from "../districtOps";
import {
  districtDevelopCost,
  districtRebrandCost,
  prosperityPassSpeed,
  prosperityScoreFromDistricts,
} from "../zoneEconomyConfig";
import { buildTermPassView, grantPassXpAmount } from "../termPass";

describe("district lot migration", () => {
  it("folds developed lots into district level and majority type", () => {
    const ops = migrateLotsToDistrictOps([
      {
        _id: "1",
        uid: "u",
        slotId: "d0_z1",
        districtId: "D0",
        zoneType: "commercial",
        level: 2,
        updatedAt: 1,
      },
      {
        _id: "2",
        uid: "u",
        slotId: "d0_z2",
        districtId: "D0",
        zoneType: "commercial",
        level: 1,
        updatedAt: 1,
      },
      {
        _id: "3",
        uid: "u",
        slotId: "d0_z3",
        districtId: "D0",
        zoneType: "tourism",
        level: 1,
        updatedAt: 1,
      },
      {
        _id: "4",
        uid: "u",
        slotId: "d0_civic",
        districtId: "D0",
        zoneType: "civic",
        level: 1,
        updatedAt: 1,
      },
    ]);
    expect(ops.D0.type).toBe("commercial");
    expect(ops.D0.level).toBe(3);
    expect(ops.D1.level).toBe(0);
  });
});

describe("district economy", () => {
  it("charges a district develop and rebrand fee", () => {
    expect(districtDevelopCost("D0")).toBe(150);
    expect(districtDevelopCost("D1")).toBe(400);
    expect(districtRebrandCost("D0")).toBe(250);
  });

  it("scores prosperity from district type and level", () => {
    const score = prosperityScoreFromDistricts([
      { zoneType: "tourism", level: 5, districtId: "D0" },
      { zoneType: "tourism", level: 5, districtId: "D1" },
    ]);
    expect(score).toBeGreaterThan(70);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("term pass", () => {
  it("speeds XP by current prosperity", () => {
    expect(prosperityPassSpeed(0)).toBe(1);
    expect(prosperityPassSpeed(50)).toBeCloseTo(1.2);
    expect(prosperityPassSpeed(100)).toBeCloseTo(1.4);
    expect(grantPassXpAmount({ showdown: true, prosperityScore: 0 })).toBe(10);
    expect(grantPassXpAmount({ showdown: true, prosperityScore: 50 })).toBe(12);
    expect(grantPassXpAmount({ showdown: true, prosperityScore: 100 })).toBe(14);
    expect(grantPassXpAmount({ soloSuccess: true, prosperityScore: 0 })).toBe(4);
  });

  it("reads pass speed from prosperity", () => {
    const view = buildTermPassView({ prosperityScore: 50 } as never);
    expect(view.speed).toBeCloseTo(1.2);
    expect(view.prosperityScore).toBe(50);
    expect(view.showdownXp).toBe(12);
    expect(view.soloXp).toBe(5);
    expect(view.showdownXpBase).toBe(10);
    expect(view.nodes).toHaveLength(20);
    expect(view.nodes.some((n) => n.node > 20)).toBe(false);
  });
});
