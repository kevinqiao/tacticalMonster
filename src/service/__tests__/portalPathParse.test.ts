import { describe, expect, it } from "vitest";

import {
  isLegacyFirstPartyGameSegment,
  parsePortalPathFromPathname,
  portalLaunchPath,
  portalLobbyPath,
} from "@/host/util/portalPathParse";

describe("parsePortalPathFromPathname", () => {
  it("parses /gc as first-party default lobby", () => {
    expect(parsePortalPathFromPathname("/gc")).toEqual({
      partnerSlug: null,
      partnerKey: null,
      lobbySlug: null,
      isFirstPartyPortal: true,
      isLobbyPath: true,
    });
  });

  it("treats former game deep links as partner-slug candidates", () => {
    expect(parsePortalPathFromPathname("/gc/block_blast")).toEqual({
      partnerSlug: "block_blast",
      partnerKey: "block_blast",
      lobbySlug: null,
      isFirstPartyPortal: false,
      isLobbyPath: true,
    });
    expect(isLegacyFirstPartyGameSegment("block_blast")).toBe(true);
    expect(isLegacyFirstPartyGameSegment("blockblast")).toBe(true);
  });

  it("parses partner /gc/{partnerSlug}/{lobbySlug} even when slug matches a game id", () => {
    expect(parsePortalPathFromPathname("/gc/acme/solitaire")).toEqual({
      partnerSlug: "acme",
      partnerKey: "acme",
      lobbySlug: "solitaire",
      isFirstPartyPortal: false,
      isLobbyPath: true,
    });
  });

  it("parses named lobby /gc/{partnerSlug}/{lobbySlug}", () => {
    expect(parsePortalPathFromPathname("/gc/acme/summer")).toEqual({
      partnerSlug: "acme",
      partnerKey: "acme",
      lobbySlug: "summer",
      isFirstPartyPortal: false,
      isLobbyPath: true,
    });
  });

  it("treats exact game-type ids as lobby slugs under a partner", () => {
    expect(parsePortalPathFromPathname("/gc/main/blockblast")).toEqual({
      partnerSlug: "main",
      partnerKey: "main",
      lobbySlug: "blockblast",
      isFirstPartyPortal: false,
      isLobbyPath: true,
    });
    expect(parsePortalPathFromPathname("/gc/main/block_blast")).toEqual({
      partnerSlug: "main",
      partnerKey: "main",
      lobbySlug: "block_blast",
      isFirstPartyPortal: false,
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
      isFirstPartyPortal: false,
      isLobbyPath: false,
    });
  });

  it("handles bare /gc/{partnerSlug} as default lobby", () => {
    expect(parsePortalPathFromPathname("/gc/acme")).toEqual({
      partnerSlug: "acme",
      partnerKey: "acme",
      lobbySlug: null,
      isFirstPartyPortal: false,
      isLobbyPath: true,
    });
  });

  it("builds launch and lobby paths", () => {
    expect(portalLaunchPath(null, "match_3")).toBe("/gc");
    expect(portalLaunchPath("acme", "tower_arena")).toBe("/gc/acme");
    expect(portalLobbyPath("acme")).toBe("/gc/acme");
    expect(portalLobbyPath("acme", "summer")).toBe("/gc/acme/summer");
    expect(portalLobbyPath(null)).toBe("/gc");
  });
});
