import { describe, expect, it } from "vitest";

import { getPortalTournamentDefinition } from "../portalTournamentConfigs";
import {
  BUILDINGS,
  TOWN_SHOWDOWN_WEEK_SCORE,
  getTier,
  isTableUnlocked,
  tableLockReason,
} from "../portalTownVenueCatalog";

describe("portalTownVenueCatalog district gates", () => {
  const yatz = getTier("saloon", "multi_yatz_coin")!;
  const solitaire = getTier("saloon", "multi_solitaire_coin")!;

  it("lets Solitaire play from the start", () => {
    expect(isTableUnlocked(solitaire, {})).toBe(true);
    expect(tableLockReason(solitaire, {})).toBeNull();
  });

  it("locks Yatz until D1 is developed", () => {
    expect(isTableUnlocked(yatz, { D1: 0 })).toBe(false);
    expect(tableLockReason(yatz, { D1: 0 })).toMatch(/Market Street/);
    expect(isTableUnlocked(yatz, { D1: 1 })).toBe(true);
  });

  it("does not gate coin tables on venue level or finance type", () => {
    expect(yatz.requiredDistrictDeveloped).toBe("D1");
    expect("requiredVenueLevel" in yatz).toBe(false);
    expect("requiredZoneType" in yatz).toBe(false);
  });
});

describe("town showdown week score", () => {
  it("uses the same rank points on every Town Showdown table", () => {
    const showdown = BUILDINGS.find((b) => b.hallKind === "showdown");
    expect(showdown).toBeTruthy();
    for (const tier of showdown!.tiers) {
      const def = getPortalTournamentDefinition(tier.tournamentId);
      expect(def?.rankPoints).toEqual(TOWN_SHOWDOWN_WEEK_SCORE);
    }
  });
});
