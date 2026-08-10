import { describe, expect, it } from "vitest";

import {
  PORTAL_MULTI_RANK_POINTS,
  PORTAL_SOLO_POINTS,
  inferSoloSegmentFromBinding,
  isPortalP75Success,
  normalizePortalSoloPoints,
  portalRankPointDelta,
  portalSoloPointDelta,
  portalSoloRewardTier,
  portalSoloSuccessTotal,
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
    seedQuantileSuccess: { quantile: "p75", scoreMultiplier: 1.5 },
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

  it("defaults: fail 0, success 2, clearBonus 1", () => {
    expect(PORTAL_SOLO_POINTS.fail).toBe(0);
    expect(PORTAL_SOLO_POINTS.success).toBe(2);
    expect(PORTAL_SOLO_POINTS.clearBonus).toBe(1);
    expect(portalSoloSuccessTotal(PORTAL_SOLO_POINTS)).toBe(3);
  });

  it("single target: miss → fail; hit → success + clearBonus", () => {
    const fail = portalSoloRewardTier({
      def: soloDef,
      score: 100,
      clearThreshold: 150,
      segment: "merged_c",
    });
    expect(fail.challengeSuccess).toBe(false);
    expect(fail.delta).toBe(0);
    expect(fail.reason).toBe("solo_fail");
    expect(fail.tier).toBe("fail");

    const ok = portalSoloRewardTier({
      def: soloDef,
      score: 160,
      clearThreshold: 150,
      segment: "ritual_a",
    });
    expect(ok.challengeSuccess).toBe(true);
    expect(ok.delta).toBe(3);
    expect(ok.tier).toBe("success");
    expect(ok.reason).toBe("solo_success");
  });

  it("legacy override { success, fail } keeps clearBonus default", () => {
    const pts = normalizePortalSoloPoints({ success: 5, fail: 0 });
    expect(pts.fail).toBe(0);
    expect(pts.success).toBe(5);
    expect(pts.clearBonus).toBe(PORTAL_SOLO_POINTS.clearBonus);

    const delta = portalSoloPointDelta(
      soloDef,
      160,
      150,
      { soloPoints: { success: 5, fail: 0 } },
      { segment: "merged_c" }
    );
    expect(delta).toBe(5 + PORTAL_SOLO_POINTS.clearBonus);
  });

  it("legacy segmented override maps p75 → success", () => {
    const pts = normalizePortalSoloPoints({
      fail: 0,
      ritual_a: { clear: 1, bonus: 3 },
      transition_b: { clear: 1, bonus: 3 },
      merged_c: { p75: 4, p90: 9 },
    });
    expect(pts.success).toBe(4);
    expect(pts.clearBonus).toBe(PORTAL_SOLO_POINTS.clearBonus);
  });

  it("inferSoloSegmentFromBinding fallback", () => {
    expect(inferSoloSegmentFromBinding({ ritualOneLineClear: true })).toBe(
      "ritual_a"
    );
    expect(inferSoloSegmentFromBinding({ successQuantile: "p25" })).toBe(
      "transition_b"
    );
    expect(inferSoloSegmentFromBinding({ segment: "merged_c" })).toBe(
      "merged_c"
    );
    expect(inferSoloSegmentFromBinding(null)).toBe("merged_c");
  });

  it("fail does not reduce weekly floor below zero", () => {
    expect(isPortalP75Success(soloDef, 50, 90)).toBe(false);
    expect(Math.max(0, 0 + portalSoloPointDelta(soloDef, 50, 90))).toBe(0);
    expect(Math.max(0, 1 + portalSoloPointDelta(soloDef, 50, 90))).toBe(1);
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
