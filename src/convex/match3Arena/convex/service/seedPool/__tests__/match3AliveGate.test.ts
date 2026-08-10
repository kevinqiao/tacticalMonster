import { describe, expect, it } from "vitest";
import {
  computeOnboardingScore,
  computePlayerEaseScore,
  deriveLayoutOutcome,
} from "../match3SeedDifficulty";
import { DEFAULT_GENERATE_OPTIONS, processOneSeed } from "../match3SeedPoolRunner";

describe("match3 alive / ease axes", () => {
  it("deriveLayoutOutcome flags opening death and high early stuck", () => {
    expect(deriveLayoutOutcome({ openingMoveCount: 2, earlyStuckRate: 0 })).toBe("likely_dead");
    expect(deriveLayoutOutcome({ openingMoveCount: 6, earlyStuckRate: 0.6 })).toBe("likely_dead");
    expect(deriveLayoutOutcome({ openingMoveCount: 6, earlyStuckRate: 0.1 })).toBe("winnable");
  });

  it("playerEaseScore is not a p50 alias and penalizes early stuck / dead layouts", () => {
    const soft = computePlayerEaseScore({
      openingMoveCount: 8,
      scoreP25: 200,
      earlyStuckRate: 0.05,
      meanEarlyClearWaveSum: 3,
      layoutOutcome: "winnable",
    });
    const harsh = computePlayerEaseScore({
      openingMoveCount: 8,
      scoreP25: 200,
      earlyStuckRate: 0.8,
      meanEarlyClearWaveSum: 3,
      layoutOutcome: "likely_dead",
    });
    expect(soft).toBeGreaterThan(harsh);
    expect(harsh).toBeLessThan(0);
  });

  it("onboardingScore rises with early cascade hit rate", () => {
    const low = computeOnboardingScore({
      openingMoveCount: 5,
      meanEarlyClearWaveSum: 1,
      earlyCascadeHitRate: 0.1,
      earlyStuckRate: 0.2,
    });
    const high = computeOnboardingScore({
      openingMoveCount: 5,
      meanEarlyClearWaveSum: 3,
      earlyCascadeHitRate: 0.8,
      earlyStuckRate: 0.05,
    });
    expect(high).toBeGreaterThan(low);
  });

  it("processOneSeed records onboarding + earlyStuck metrics when accepted", () => {
    const seen = new Set<string>();
    // Scan a small window for any accepted seed under default alive gates.
    let accepted:
      | ReturnType<typeof processOneSeed>
      | undefined;
    for (let i = 1; i <= 40; i++) {
      const result = processOneSeed(
        i,
        { ...DEFAULT_GENERATE_OPTIONS, count: 1, start: i, rolloutCount: 8 },
        seen
      );
      if (result.kind === "accepted") {
        accepted = result;
        break;
      }
    }
    expect(accepted?.kind).toBe("accepted");
    if (accepted?.kind !== "accepted") return;
    const m = accepted.candidate.metrics;
    expect(typeof m.onboardingScore).toBe("number");
    expect(typeof m.earlyStuckRate).toBe("number");
    expect(typeof m.playerEaseScore).toBe("number");
    expect(m.playerEaseScore).not.toBe(m.scoreP50);
    expect(m.openingMoveCount).toBeGreaterThanOrEqual(DEFAULT_GENERATE_OPTIONS.minOpeningMoves);
  });
});
