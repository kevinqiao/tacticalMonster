import { describe, expect, it } from "vitest";

import {
  PORTAL_SOLO_SUCCESS_DAILY_DEFAULTS,
  clampSoloSuccessDailyCap,
  isSoloSuccessDailyCapped,
  resolveSoloSuccessAllowPlayAfterCap,
  resolveSoloSuccessDailyEnabled,
  soloSuccessConfigFromFields,
} from "../portalSoloSuccessConfig";

describe("portalSoloSuccessConfig", () => {
  it("defaults match economy SSOT", () => {
    expect(PORTAL_SOLO_SUCCESS_DAILY_DEFAULTS.enabled).toBe(true);
    expect(PORTAL_SOLO_SUCCESS_DAILY_DEFAULTS.dailyCap).toBe(5);
    expect(PORTAL_SOLO_SUCCESS_DAILY_DEFAULTS.afterCapMode).toBe("zero_all");
    expect(PORTAL_SOLO_SUCCESS_DAILY_DEFAULTS.allowPlayAfterCap).toBe(true);
  });

  it("lobby/partner overlays resolve over defaults", () => {
    const cfg = soloSuccessConfigFromFields({
      soloSuccessDailyEnabled: true,
      soloSuccessDailyCap: 3,
      soloSuccessAfterCapMode: "zero_all",
      soloSuccessAllowPlayAfterCap: false,
    });
    expect(cfg.dailyCap).toBe(3);
    expect(cfg.allowPlayAfterCap).toBe(false);
    expect(resolveSoloSuccessDailyEnabled(undefined)).toBe(true);
    expect(resolveSoloSuccessAllowPlayAfterCap(undefined)).toBe(true);
  });

  it("clamps invalid caps back to default", () => {
    expect(clampSoloSuccessDailyCap(-1)).toBe(
      PORTAL_SOLO_SUCCESS_DAILY_DEFAULTS.dailyCap
    );
    expect(clampSoloSuccessDailyCap(101)).toBe(
      PORTAL_SOLO_SUCCESS_DAILY_DEFAULTS.dailyCap
    );
    expect(clampSoloSuccessDailyCap(0)).toBe(0);
  });

  it("capped only when enabled and used >= cap", () => {
    const cfg = soloSuccessConfigFromFields({
      soloSuccessDailyEnabled: true,
      soloSuccessDailyCap: 5,
    });
    expect(isSoloSuccessDailyCapped(4, cfg)).toBe(false);
    expect(isSoloSuccessDailyCapped(5, cfg)).toBe(true);
    expect(
      isSoloSuccessDailyCapped(
        99,
        soloSuccessConfigFromFields({ soloSuccessDailyEnabled: false })
      )
    ).toBe(false);
  });
});
