import { describe, expect, it } from "vitest";

import { PARTNER_GAME_TYPES } from "@/convex/portal/convex/data/partnerGameRegistry";
import {
  parsePortalPathFromPathname,
  portalLaunchPath,
} from "@/host/util/portalPathParse";

describe("parsePortalPathFromPathname", () => {
  it("parses first-party /gc/{gameType}", () => {
    expect(parsePortalPathFromPathname("/gc/block_blast")).toEqual({
      partnerKey: null,
      gameType: "block_blast",
      isFirstPartyPortal: true,
    });
  });

  it("parses partner /gc/{key}/{gameType}", () => {
    expect(parsePortalPathFromPathname("/gc/acme/solitaire")).toEqual({
      partnerKey: "acme",
      gameType: "solitaire",
      isFirstPartyPortal: false,
    });
  });

  it("normalizes partner key to lowercase", () => {
    expect(parsePortalPathFromPathname("/gc/AcMe/yatz").partnerKey).toBe("acme");
  });

  it("returns non-portal paths as inactive", () => {
    expect(parsePortalPathFromPathname("/casual/lobby")).toEqual({
      partnerKey: null,
      gameType: null,
      isFirstPartyPortal: false,
    });
  });

  it("handles bare /gc/{key} without game", () => {
    expect(parsePortalPathFromPathname("/gc/acme")).toEqual({
      partnerKey: "acme",
      gameType: null,
      isFirstPartyPortal: false,
    });
  });

  it("builds launch paths", () => {
    expect(portalLaunchPath(null, "match_3")).toBe("/gc/match_3");
    expect(portalLaunchPath("acme", "tower_arena")).toBe("/gc/acme/tower_arena");
  });

  it("recognizes all registered game types in first-party URLs", () => {
    for (const gameType of PARTNER_GAME_TYPES) {
      const parsed = parsePortalPathFromPathname(`/gc/${gameType}`);
      expect(parsed.isFirstPartyPortal).toBe(true);
      expect(parsed.gameType).toBe(gameType);
    }
  });
});
