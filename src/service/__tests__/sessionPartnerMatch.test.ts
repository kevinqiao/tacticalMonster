import { describe, expect, it } from "vitest";

import {
  sessionPartnerMatchesUrlPartner,
  shouldEnforceUrlPartnerSession,
} from "@/host/service/platformAuth/sessionPartnerMatch";

describe("shouldEnforceUrlPartnerSession", () => {
  it("skips staff consoles", () => {
    expect(shouldEnforceUrlPartnerSession("/partner/admin")).toBe(false);
    expect(shouldEnforceUrlPartnerSession("/partner/operation")).toBe(false);
    expect(shouldEnforceUrlPartnerSession("/platform/admin")).toBe(false);
    expect(shouldEnforceUrlPartnerSession("/campaign/merchant")).toBe(false);
  });

  it("enforces on portal and player campaign routes", () => {
    expect(shouldEnforceUrlPartnerSession("/portal/block_blast")).toBe(true);
    expect(shouldEnforceUrlPartnerSession("/portal/acme/solitaire")).toBe(true);
    expect(shouldEnforceUrlPartnerSession("/campaign/demo-cafe")).toBe(true);
  });

  it("skips campaign marketing home", () => {
    expect(shouldEnforceUrlPartnerSession("/campaign/home")).toBe(false);
  });
});

describe("sessionPartnerMatchesUrlPartner", () => {
  it("matches partner encoded in uid", () => {
    expect(
      sessionPartnerMatchesUrlPartner({ uid: "3_101_abc", platformAccessToken: "a.b.c" }, 101)
    ).toBe(true);
    expect(
      sessionPartnerMatchesUrlPartner({ uid: "3_101_abc", platformAccessToken: "a.b.c" }, 0)
    ).toBe(false);
  });
});
