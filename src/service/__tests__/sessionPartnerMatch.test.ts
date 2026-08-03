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
    expect(shouldEnforceUrlPartnerSession("/cc/merchant")).toBe(false);
  });

  it("enforces on portal and player campaign routes", () => {
    expect(shouldEnforceUrlPartnerSession("/gc/block_blast")).toBe(true);
    expect(shouldEnforceUrlPartnerSession("/gc/acme/solitaire")).toBe(true);
    expect(shouldEnforceUrlPartnerSession("/cc/demo-cafe")).toBe(true);
  });

  it("skips campaign marketing home", () => {
    expect(shouldEnforceUrlPartnerSession("/cc/home")).toBe(false);
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
