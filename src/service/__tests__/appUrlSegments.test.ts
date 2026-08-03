import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_URL_PREFIX,
  PORTAL_URL_PREFIX,
  rewriteLegacyAppPathname,
} from "@/host/util/appUrlSegments";

describe("rewriteLegacyAppPathname", () => {
  it("rewrites /portal → /gc", () => {
    expect(rewriteLegacyAppPathname("/portal")).toBe(PORTAL_URL_PREFIX);
    expect(rewriteLegacyAppPathname("/portal/solitaire")).toBe(`${PORTAL_URL_PREFIX}/solitaire`);
    expect(rewriteLegacyAppPathname("/portal/crazygames/solitaire")).toBe(
      `${PORTAL_URL_PREFIX}/crazygames/solitaire`
    );
  });

  it("rewrites /campaign → /cc", () => {
    expect(rewriteLegacyAppPathname("/campaign")).toBe(CAMPAIGN_URL_PREFIX);
    expect(rewriteLegacyAppPathname("/campaign/home")).toBe(`${CAMPAIGN_URL_PREFIX}/home`);
    expect(rewriteLegacyAppPathname("/campaign/demo/cafe")).toBe(
      `${CAMPAIGN_URL_PREFIX}/demo/cafe`
    );
  });

  it("leaves new and unrelated paths alone", () => {
    expect(rewriteLegacyAppPathname("/gc/solitaire")).toBeNull();
    expect(rewriteLegacyAppPathname("/cc/home")).toBeNull();
    expect(rewriteLegacyAppPathname("/partner/admin")).toBeNull();
    expect(rewriteLegacyAppPathname("/platform/admin")).toBeNull();
  });
});
