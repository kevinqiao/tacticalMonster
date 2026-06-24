import { describe, expect, it } from "vitest";

import {
  PORTAL_MULTI_RANK_POINTS,
  PORTAL_SOLO_POINTS,
  isPortalP75Success,
  portalRankPointDelta,
  portalSoloPointDelta,
  type PortalTournamentDefinition,
} from "../../../data/portalTournamentConfigs";
import { weeklyPeriodKey } from "../../../utils/casualTaskPeriod";

describe("portal points config", () => {
  const soloDef: PortalTournamentDefinition = {
    tournamentId: "portal_solo_p75_block_blast",
    title: "test",
    gameType: "block_blast",
    matchType: "solo_p75",
    status: "open",
    maxPlayers: 1,
    entry: { kind: "none" },
    soloPoints: PORTAL_SOLO_POINTS,
  };

  const multiDef: PortalTournamentDefinition = {
    tournamentId: "portal_multi_block_blast",
    title: "test",
    gameType: "block_blast",
    matchType: "multi_ranked",
    status: "open",
    maxPlayers: 5,
    entry: { kind: "none" },
    rankPoints: PORTAL_MULTI_RANK_POINTS,
  };

  it("solo success +3 fail -1", () => {
    expect(isPortalP75Success(soloDef, 100, 90)).toBe(true);
    expect(portalSoloPointDelta(soloDef, 100, 90)).toBe(3);
    expect(portalSoloPointDelta(soloDef, 50, 90)).toBe(-1);
  });

  it("multi rank points", () => {
    expect(portalRankPointDelta(multiDef, 1)).toBe(5);
    expect(portalRankPointDelta(multiDef, 3)).toBe(1);
    expect(portalRankPointDelta(multiDef, 5)).toBe(-2);
  });

  it("weekly period key is stable string", () => {
    const k = weeklyPeriodKey(Date.UTC(2026, 5, 18, 12, 0, 0));
    expect(k.startsWith("w:")).toBe(true);
  });
});
