import { describe, expect, it } from "vitest";

import {
  deferClerkForEmbedGate,
  isEmbedLikelyContext,
  partnerEmbedChannelEnabled,
  shouldAttemptEmbedGate,
} from "@/host/service/platformAuth/embedAuthGate";
import {
  clearPartnerEmbedAuthGlobals,
  injectPartnerEmbedAuthGlobals,
} from "@/host/service/platformAuth/embedAuthTestUtils";

describe("embedAuthGate", () => {
  it("detects embed context from query param", () => {
    expect(isEmbedLikelyContext("?embed=1")).toBe(true);
    expect(isEmbedLikelyContext("?foo=bar")).toBe(false);
  });

  it("skips embed gate on first-party portal routes", () => {
    expect(
      shouldAttemptEmbedGate({
        staffConsole: false,
        partnerResolveReady: true,
        authReady: true,
        partner: null,
        alreadyAuthed: false,
        isFirstPartyPortal: true,
      })
    ).toBe(false);
  });

    it("enables embed gate only when partner has cid=2 and embed context", () => {
    const base = {
      staffConsole: false,
      partnerResolveReady: true,
      authReady: true,
      partner: { pid: 1, playerAuth: { mode: "embed" as const } },
      alreadyAuthed: false,
    };

    expect(shouldAttemptEmbedGate(base)).toBe(false);

    injectPartnerEmbedAuthGlobals("test-token", 1);
    expect(shouldAttemptEmbedGate(base)).toBe(true);
    clearPartnerEmbedAuthGlobals();
  });

  it("never defers clerk on staff console", () => {
    expect(
      shouldAttemptEmbedGate({
        staffConsole: true,
        partnerResolveReady: true,
        authReady: true,
        partner: { pid: 1, playerAuth: { mode: "embed" as const } },
        alreadyAuthed: false,
      })
    ).toBe(false);
  });

  it("defers clerk while waiting or bootstrapping", () => {
    expect(deferClerkForEmbedGate("waiting")).toBe(true);
    expect(deferClerkForEmbedGate("bootstrapping")).toBe(true);
    expect(deferClerkForEmbedGate("timed_out")).toBe(false);
    expect(deferClerkForEmbedGate("skipped")).toBe(false);
  });

  it("reads playerAuth.mode for embed cid", () => {
    expect(
      partnerEmbedChannelEnabled({ pid: 1, playerAuth: { mode: "embed_then_clerk" } })
    ).toBe(true);
    expect(
      partnerEmbedChannelEnabled({ pid: 1, playerAuth: { mode: "clerk" } })
    ).toBe(false);
  });
});

