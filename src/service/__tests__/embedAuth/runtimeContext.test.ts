import { describe, expect, it } from "vitest";

import {
  partnerHasCampaignOps,
  partnerHasPortalGames,
  readPartnerCapabilities,
} from "@/convex/sso/convex/service/partner/partnerCapabilities";
import {
  isCrazyGamesDevFlag,
  partnerAllowsContext,
  resolveAppEmbedContext,
} from "@/host/service/platformAuth/embedSources/runtimeContext";

describe("partnerCapabilities", () => {
  it("reads capabilities only (no enabledContexts fallback)", () => {
    expect(
      readPartnerCapabilities({
        capabilities: { portalGames: true, campaignOps: false },
      })
    ).toEqual({ portalGames: true, campaignOps: false });
    expect(readPartnerCapabilities({})).toEqual({
      portalGames: false,
      campaignOps: false,
    });
    expect(partnerHasPortalGames({ capabilities: { portalGames: true, campaignOps: false } })).toBe(
      true
    );
    expect(partnerHasCampaignOps({ capabilities: { portalGames: true, campaignOps: false } })).toBe(
      false
    );
  });
});

describe("runtimeContext", () => {
  it("resolves portal pathname", () => {
    expect(resolveAppEmbedContext("/portal/solitaire")).toBe("portal");
    expect(resolveAppEmbedContext("/tactical/lobby")).toBe("tactical");
  });

  it("gates portal/campaign via capabilities only", () => {
    expect(
      partnerAllowsContext(
        { pid: 100, capabilities: { portalGames: true, campaignOps: false } },
        "portal"
      )
    ).toBe(true);
    expect(
      partnerAllowsContext(
        { pid: 100, capabilities: { portalGames: false, campaignOps: true } },
        "portal"
      )
    ).toBe(false);
    expect(
      partnerAllowsContext(
        { pid: 100, data: { enabledContexts: ["portal"] } },
        "portal"
      )
    ).toBe(false);
    expect(partnerAllowsContext({ pid: 100 }, "casual")).toBe(true);
  });

  it("reads crazygames dev flag", () => {
    expect(isCrazyGamesDevFlag("?crazygames=1")).toBe(true);
    expect(isCrazyGamesDevFlag("?foo=bar")).toBe(false);
  });
});
