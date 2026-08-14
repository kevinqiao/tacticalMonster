import { describe, expect, it } from "vitest";

import { venueLevelFromXp, xpToNextVenueLevel, VENUE_LEVEL_CONFIG } from "../venueProgressConfig";

describe("venueProgressConfig", () => {
  it("venueLevelFromXp maps thresholds", () => {
    expect(venueLevelFromXp(0)).toBe(1);
    expect(venueLevelFromXp(19)).toBe(1);
    expect(venueLevelFromXp(20)).toBe(2);
    expect(venueLevelFromXp(VENUE_LEVEL_CONFIG.levelXp[5]!)).toBe(5);
  });

  it("xpToNextVenueLevel returns remaining xp", () => {
    expect(xpToNextVenueLevel(0, 1)).toBe(20);
    expect(xpToNextVenueLevel(20, 2)).toBe(30);
    expect(xpToNextVenueLevel(999, 5)).toBe(null);
  });
});
