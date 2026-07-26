import { describe, expect, it } from "vitest";

import { PARTNER_GAME_TYPES } from "@/convex/portal/convex/data/partnerGameRegistry";
import {
  parsePortalPathFromPathname,
  portalLaunchPath,
  portalLobbyPath,
} from "@/host/util/portalPathParse";

describe("parsePortalPathFromPathname", () => {
  it("parses first-party /gc/{gameType}", () => {
    expect(parsePortalPathFromPathname("/gc/block_blast")).toEqual({
      partnerSlug: null,
      partnerKey: null,
      lobbySlug: null,
      gameType: "block_blast",
      isFirstPartyPortal: true,
      isLobbyPath: false,
    });
  });

  it("parses partner /gc/{partnerSlug}/{gameType}", () => {
    expect(parsePortalPathFromPathname("/gc/acme/solitaire")).toEqual({
      partnerSlug: "acme",
      partnerKey: "acme",
      lobbySlug: null,
      gameType: "solitaire",
      isFirstPartyPortal: false,
      isLobbyPath: false,
    });
  });

  it("parses named lobby /gc/{partnerSlug}/{lobbySlug}", () => {
    expect(parsePortalPathFromPathname("/gc/acme/summer")).toEqual({
      partnerSlug: "acme",
      partnerKey: "acme",
      lobbySlug: "summer",
      gameType: null,
      isFirstPartyPortal: false,
      isLobbyPath: true,
    });
  });

  it("parses /gc as first-party default lobby", () => {
    expect(parsePortalPathFromPathname("/gc")).toEqual({
      partnerSlug: null,
      partnerKey: null,
      lobbySlug: null,
      gameType: null,
      isFirstPartyPortal: true,
      isLobbyPath: true,
    });
  });

  it("normalizes partner slug to lowercase", () => {
    expect(parsePortalPathFromPathname("/gc/AcMe/yatz").partnerSlug).toBe("acme");
  });

  it("returns non-portal paths as inactive", () => {
    expect(parsePortalPathFromPathname("/casual/lobby")).toEqual({
      partnerSlug: null,
      partnerKey: null,
      lobbySlug: null,
      gameType: null,
      isFirstPartyPortal: false,
      isLobbyPath: false,
    });
  });

  it("handles bare /gc/{partnerSlug} as default lobby", () => {
    expect(parsePortalPathFromPathname("/gc/acme")).toEqual({
      partnerSlug: "acme",
      partnerKey: "acme",
      lobbySlug: null,
      gameType: null,
      isFirstPartyPortal: false,
      isLobbyPath: true,
    });
  });

  it("builds launch and lobby paths", () => {
    expect(portalLaunchPath(null, "match_3")).toBe("/gc/match_3");
    expect(portalLaunchPath("acme", "tower_arena")).toBe("/gc/acme/tower_arena");
    expect(portalLobbyPath("acme")).toBe("/gc/acme");
    expect(portalLobbyPath("acme", "summer")).toBe("/gc/acme/summer");
    expect(portalLobbyPath(null)).toBe("/gc");
  });

  it("recognizes all registered game types in first-party URLs", () => {
    for (const gameType of PARTNER_GAME_TYPES) {
      const parsed = parsePortalPathFromPathname(`/gc/${gameType}`);
      expect(parsed.isFirstPartyPortal).toBe(true);
      expect(parsed.gameType).toBe(gameType);
    }
  });
});
