import { afterEach, describe, expect, it, vi } from "vitest";

import { buildEmbedSourceContext } from "@/host/service/platformAuth/embedAuthGate";
import {
  listHostClaimingSources,
  selectEmbedSourcesToListen,
} from "@/host/service/platformAuth/embedSources/registry";
import {
  clearPartnerEmbedAuthGlobals,
  injectPartnerEmbedAuthGlobals,
} from "@/host/service/platformAuth/embedAuthTestUtils";

function portalPartnerCtx(search = "") {
  return buildEmbedSourceContext({
    partnerPid: 100,
    partner: {
      pid: 100,
      playerAuth: { mode: "embed" },
      data: { embed: { method: "crazygames_jwt" } },
      capabilities: { portalGames: true, campaignOps: false },
    },
    partnerResolveReady: true,
    campaignPartnerSlug: null,
    portalPartnerKey: "crazygames",
    isFirstPartyPortal: false,
    search,
  });
}

describe("selectEmbedSourcesToListen (extensible host claim)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearPartnerEmbedAuthGlobals();
    delete window.CrazyGames;
  });

  it("starts only host claimer when crazygames_jwt portal claims (no postMessage)", () => {
    vi.stubGlobal("location", {
      ...window.location,
      pathname: "/portal/crazygames/solitaire",
      search: "",
    });
    injectPartnerEmbedAuthGlobals("tok", 100);
    const ctx = portalPartnerCtx();
    expect(listHostClaimingSources(ctx).map((s) => s.id)).toEqual(["crazygames_sdk"]);
    expect(selectEmbedSourcesToListen(ctx).map((s) => s.id)).toEqual(["crazygames_sdk"]);
  });

  it("starts postMessage when no host source claims (jwt_local + injected token)", () => {
    injectPartnerEmbedAuthGlobals("tok", 1);
    const ctx = buildEmbedSourceContext({
      partnerPid: 1,
      partner: {
        pid: 1,
        playerAuth: { mode: "embed" },
        data: { embed: { method: "jwt_local" } },
      },
      partnerResolveReady: true,
      campaignPartnerSlug: null,
      portalPartnerKey: null,
      isFirstPartyPortal: false,
      search: "",
    });
    expect(listHostClaimingSources(ctx)).toHaveLength(0);
    expect(selectEmbedSourcesToListen(ctx).map((s) => s.id)).toEqual(["partner_postmessage"]);
  });

  it("dev ?crazygames=1 claims host and suppresses postMessage even with token", () => {
    injectPartnerEmbedAuthGlobals("tok", 100);
    const ctx = portalPartnerCtx("?crazygames=1");
    expect(selectEmbedSourcesToListen(ctx).map((s) => s.id)).toEqual(["crazygames_sdk"]);
  });
});
