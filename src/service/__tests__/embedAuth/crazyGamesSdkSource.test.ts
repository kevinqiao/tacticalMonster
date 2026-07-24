import { afterEach, describe, expect, it, vi } from "vitest";

import { buildEmbedSourceContext } from "@/host/service/platformAuth/embedAuthGate";
import { crazyGamesSdkSource } from "@/host/service/platformAuth/embedSources/crazyGamesSdkSource";

function portalCtx(overrides: {
  partnerPid: number;
  partner: NonNullable<Parameters<typeof buildEmbedSourceContext>[0]["partner"]>;
  search?: string;
}) {
  return buildEmbedSourceContext({
    partnerPid: overrides.partnerPid,
    partner: overrides.partner,
    partnerResolveReady: true,
    campaignPartnerSlug: null,
    portalPartnerKey: "cg-test",
    isFirstPartyPortal: false,
    search: overrides.search ?? "",
  });
}

describe("crazyGamesSdkSource eligibility", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preloads when partner embed.method is crazygames_jwt on portal (any pid)", () => {
    vi.stubGlobal("location", {
      ...window.location,
      pathname: "/gc/cg-test/solitaire",
      search: "",
    });
    const ctx = portalCtx({
      partnerPid: 200,
      partner: {
        pid: 200,
        playerAuth: { mode: "embed" },
        capabilities: { portalGames: true, campaignOps: false },
        data: { embed: { method: "crazygames_jwt" } },
      },
    });
    expect(crazyGamesSdkSource.shouldPreload?.(ctx)).toBe(true);
  });

  it("does not preload for jwt_local even when partnerPid matches legacy default", () => {
    vi.stubGlobal("location", {
      ...window.location,
      pathname: "/gc/cg-test/solitaire",
      search: "",
    });
    const ctx = portalCtx({
      partnerPid: 100,
      partner: {
        pid: 100,
        playerAuth: { mode: "embed" },
        capabilities: { portalGames: true, campaignOps: false },
        data: { embed: { method: "jwt_local" } },
      },
    });
    expect(crazyGamesSdkSource.shouldPreload?.(ctx)).toBe(false);
  });

  it("does not preload without resolved partner (no pid fallback)", () => {
    vi.stubGlobal("location", {
      ...window.location,
      pathname: "/gc/cg-test/solitaire",
      search: "",
    });
    const ctx = buildEmbedSourceContext({
      partnerPid: 100,
      partner: null,
      partnerResolveReady: true,
      campaignPartnerSlug: null,
      portalPartnerKey: "cg-test",
      isFirstPartyPortal: false,
      search: "",
    });
    expect(crazyGamesSdkSource.shouldPreload?.(ctx)).toBe(false);
  });

  it("still preloads with ?crazygames=1 dev flag", () => {
    vi.stubGlobal("location", {
      ...window.location,
      pathname: "/gc/cg-test/solitaire",
      search: "?crazygames=1",
    });
    const ctx = portalCtx({
      partnerPid: 100,
      partner: { pid: 100, playerAuth: { mode: "embed" }, data: { embed: { method: "jwt_local" } } },
      search: "?crazygames=1",
    });
    expect(crazyGamesSdkSource.shouldPreload?.(ctx)).toBe(true);
  });
});
