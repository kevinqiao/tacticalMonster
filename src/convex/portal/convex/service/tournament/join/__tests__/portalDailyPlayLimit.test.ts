import { describe, expect, it } from "vitest";

import { PORTAL_DAILY_PLAY_LIMITS } from "../../../../data/portalDailyPlayLimits";
import { portalDailyPlayModeFromDef } from "../portalDailyPlayLimit";

describe("portalDailyPlayModeFromDef", () => {
  it("maps solo_p75 and multi_ranked", () => {
    expect(portalDailyPlayModeFromDef({ matchType: "solo_p75" })).toBe("solo");
    expect(portalDailyPlayModeFromDef({ matchType: "multi_ranked" })).toBe("multi");
  });
});

describe("PORTAL_DAILY_PLAY_LIMITS", () => {
  it("defaults to solo 3 / multi 10", () => {
    expect(PORTAL_DAILY_PLAY_LIMITS.solo).toBe(3);
    expect(PORTAL_DAILY_PLAY_LIMITS.multi).toBe(10);
  });
});
