import { describe, expect, it } from "vitest";

import { PARTNER_GAME_TYPES } from "@/convex/portal/convex/data/partnerGameRegistry";
import {
  parsePortalPathFromPathname,
  portalLaunchPath,
} from "@/host/util/portalPathParse";

describe("parsePortalPathFromPathname", () => {
  it("parses first-party /portal/{gameType}", () => {
    expect(parsePortalPathFromPathname("/portal/block_blast")).toEqual({
      partnerKey: null,
      gameType: "block_blast",
      isFirstPartyPortal: true,
    });
  });

  it("parses partner /portal/{key}/{gameType}", () => {
    expect(parsePortalPathFromPathname("/portal/acme/solitaire")).toEqual({
      partnerKey: "acme",
      gameType: "solitaire",
      isFirstPartyPortal: false,
    });
  });

  it("normalizes partner key to lowercase", () => {
    expect(parsePortalPathFromPathname("/portal/AcMe/yatz").partnerKey).toBe("acme");
  });

  it("returns non-portal paths as inactive", () => {
    expect(parsePortalPathFromPathname("/casual/lobby")).toEqual({
      partnerKey: null,
      gameType: null,
      isFirstPartyPortal: false,
    });
  });

  it("handles bare /portal/{key} without game", () => {
    expect(parsePortalPathFromPathname("/portal/acme")).toEqual({
      partnerKey: "acme",
      gameType: null,
      isFirstPartyPortal: false,
    });
  });

  it("builds launch paths", () => {
    expect(portalLaunchPath(null, "match_3")).toBe("/portal/match_3");
    expect(portalLaunchPath("acme", "tower_arena")).toBe("/portal/acme/tower_arena");
  });

  it("recognizes all registered game types in first-party URLs", () => {
    for (const gameType of PARTNER_GAME_TYPES) {
      const parsed = parsePortalPathFromPathname(`/portal/${gameType}`);
      expect(parsed.isFirstPartyPortal).toBe(true);
      expect(parsed.gameType).toBe(gameType);
    }
  });
});
