import { describe, expect, it } from "vitest";

import {
  countSoloLadderProgress,
  isPortalMultiRitualOpen,
  resolveMultiRitualJoinTemplate,
} from "../portalSeasonSeedPickSignals";
import {
  resolveNewbieSoloSegment,
  resolveSeasonSeedPickPolicy,
} from "../../../data/portalSeedTierPolicy";
import type { PortalTournamentDefinition } from "../../../data/portalTournamentConfigs";

function soloDef(gameType: string): PortalTournamentDefinition {
  return {
    tournamentId: `portal_solo_p75_${gameType}`,
    title: "test",
    gameType,
    matchType: "solo_p75",
    status: "open",
    maxPlayers: 1,
    entry: { kind: "none" },
    seedQuantileSuccess: { quantile: "p75", scoreMultiplier: 1.5 },
  } as PortalTournamentDefinition;
}

describe("countSoloLadderProgress", () => {
  it("ignores challenge fails so A/B can repeat", () => {
    expect(
      countSoloLadderProgress([
        { status: "settled", challengeSuccess: false },
        { status: "settled", challengeSuccess: false },
      ])
    ).toBe(0);
  });

  it("counts successes and legacy rows without challengeSuccess", () => {
    expect(
      countSoloLadderProgress([
        { status: "settled", challengeSuccess: true },
        { status: "settled" },
        { status: "settled", challengeSuccess: false },
        { status: "open", challengeSuccess: true },
      ])
    ).toBe(2);
  });
});

describe("A/B ladder stays until success", () => {
  it("fail streak at count 0 stays ritual_a", () => {
    const progress = countSoloLadderProgress([
      { status: "settled", challengeSuccess: false },
      { status: "settled", challengeSuccess: false },
    ]);
    expect(resolveNewbieSoloSegment(progress)).toBe("ritual_a");
    const p = resolveSeasonSeedPickPolicy({
      def: soloDef("block_blast"),
      sessionKey: "s1",
      settledSoloCount: progress,
    });
    expect(p.segment).toBe("ritual_a");
    expect(p.ritualOneLineClear).toBe(true);
  });

  it("one success then fails stay on B p25", () => {
    const progress = countSoloLadderProgress([
      { status: "settled", challengeSuccess: true },
      { status: "settled", challengeSuccess: false },
      { status: "settled", challengeSuccess: false },
    ]);
    expect(progress).toBe(1);
    expect(resolveNewbieSoloSegment(progress)).toBe("transition_b");
    const p = resolveSeasonSeedPickPolicy({
      def: soloDef("block_blast"),
      sessionKey: "s1",
      settledSoloCount: progress,
    });
    expect(p.successQuantile).toBe("p25");
  });

  it("two successes then fails stay on B p50", () => {
    const progress = countSoloLadderProgress([
      { status: "settled", challengeSuccess: true },
      { status: "settled", challengeSuccess: true },
      { status: "settled", challengeSuccess: false },
    ]);
    expect(progress).toBe(2);
    const p = resolveSeasonSeedPickPolicy({
      def: soloDef("block_blast"),
      sessionKey: "s1",
      settledSoloCount: progress,
    });
    expect(p.segment).toBe("transition_b");
    expect(p.successQuantile).toBe("p50");
  });

  it("three successes enter merged_c", () => {
    const progress = countSoloLadderProgress([
      { status: "settled", challengeSuccess: true },
      { status: "settled", challengeSuccess: true },
      { status: "settled", challengeSuccess: true },
    ]);
    expect(resolveNewbieSoloSegment(progress)).toBe("merged_c");
  });
});

describe("multi ritual solo gate", () => {
  it("opens only when ladder progress is 0", () => {
    expect(isPortalMultiRitualOpen(0)).toBe(true);
    expect(isPortalMultiRitualOpen(1)).toBe(false);
  });

  it("rewrites free and coin multi to solo when progress is 0", () => {
    for (const requested of [
      "portal_multi_block_blast",
      "portal_multi_coin_block_blast",
    ]) {
      expect(
        resolveMultiRitualJoinTemplate({
          requestedTemplateId: requested,
          matchType: "multi_ranked",
          gameType: "block_blast",
          ladderProgress: 0,
        })
      ).toEqual({
        templateId: "portal_solo_p75_block_blast",
        ritualForcedSolo: true,
      });
    }
  });

  it("does not rewrite when progress >= 1", () => {
    expect(
      resolveMultiRitualJoinTemplate({
        requestedTemplateId: "portal_multi_block_blast",
        matchType: "multi_ranked",
        gameType: "block_blast",
        ladderProgress: 1,
      })
    ).toEqual({
      templateId: "portal_multi_block_blast",
      ritualForcedSolo: false,
    });
  });

  it("skips campaign joins", () => {
    expect(
      resolveMultiRitualJoinTemplate({
        requestedTemplateId: "portal_multi_block_blast",
        matchType: "multi_ranked",
        gameType: "block_blast",
        ladderProgress: 0,
        skip: true,
      }).ritualForcedSolo
    ).toBe(false);
  });
});
