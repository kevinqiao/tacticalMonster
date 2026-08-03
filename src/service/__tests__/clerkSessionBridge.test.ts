import { afterEach, describe, expect, it } from "vitest";

import {
  blockClerkAutoExchangeAfterPartnerSwitch,
  clearClerkAutoExchangeSuppress,
  clearTransientClerkAutoExchangeSuppress,
  shouldSuppressClerkAutoExchange,
} from "@/host/service/clerk/clerkSessionBridge";
import { sessionPartnerMatchesUrlPartner } from "@/host/service/platformAuth/sessionPartnerMatch";

describe("clerkSessionBridge partner-switch block", () => {
  afterEach(() => {
    clearClerkAutoExchangeSuppress();
  });

  it("blocks auto-exchange after partner switch even after transient clear", () => {
    blockClerkAutoExchangeAfterPartnerSwitch();
    expect(shouldSuppressClerkAutoExchange()).toBe(true);

    clearTransientClerkAutoExchangeSuppress();
    expect(shouldSuppressClerkAutoExchange()).toBe(true);

    clearClerkAutoExchangeSuppress();
    expect(shouldSuppressClerkAutoExchange()).toBe(false);
  });

  it("treats stored first-party session as mismatch on partner URL pid", () => {
    expect(
      sessionPartnerMatchesUrlPartner({ uid: "1_0_abc", platformAccessToken: "a.b.c" }, 5)
    ).toBe(false);
  });
});
