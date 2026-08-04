import { describe, expect, it } from "vitest";
import {
  chooseBestPickCategory,
  chooseGreedyTarget,
  holdMaskForTarget,
  simulateGreedyGame,
} from "../seedPool/yatzGreedyHoldPolicy";
import { YATZ_DECISION_PERSONAS } from "../seedPool/yatzHumanPersonas";
import { simulateRollout } from "../seedPool/yatzSeedSimulator";

const [steady, standard, aggressive] = YATZ_DECISION_PERSONAS;

describe("yatzGreedyHoldPolicy", () => {
  it("holdMaskForTarget locks straight uniques", () => {
    const mask = holdMaskForTarget([1, 2, 3, 3, 6], "small_straight");
    const kept = [1, 2, 3, 3, 6].filter((_, i) => mask[i]);
    expect(new Set(kept)).toEqual(new Set([1, 2, 3]));
    expect(kept.filter((d) => d === 3)).toHaveLength(1);
  });

  it("chooseGreedyTarget prefers open upper for dominant face when kinds closed", () => {
    const cat = chooseGreedyTarget([4, 4, 1, 2, 6], ["fours", "yahtzee"], standard.decision);
    expect(cat).toBe("fours");
  });

  it("chooseGreedyTarget builds toward straight when nothing scores", () => {
    const cat = chooseGreedyTarget(
      [1, 2, 3, 4, 6],
      ["yahtzee", "large_straight"],
      standard.decision
    );
    expect(cat).toBe("large_straight");
  });

  it("decision styles diverge on mid-score made hand", () => {
    const dice = [4, 4, 4, 2, 1];
    const available = ["fours", "yahtzee"] as const;
    expect(chooseGreedyTarget(dice, [...available], steady.decision)).toBe("fours");
    expect(chooseGreedyTarget(dice, [...available], standard.decision)).toBe("fours");
    expect(chooseGreedyTarget(dice, [...available], aggressive.decision)).toBe("yahtzee");
  });

  it("decision styles diverge on close final pick", () => {
    const dice = [2, 2, 2, 2, 5];
    const available = ["four_kind", "chance", "twos"] as const;
    expect(chooseBestPickCategory(dice, [...available], steady.decision)).toBe("chance");
    expect(chooseBestPickCategory(dice, [...available], aggressive.decision)).toBe("four_kind");
    expect(chooseBestPickCategory(dice, [...available], standard.decision)).toBe("four_kind");
  });

  it("simulateGreedyGame matches simulateRollout (fixed Manifest + rollout policy)", () => {
    const seed = "v1_yatz_00007";
    for (const r of [0, 1, 2, 3]) {
      const greedy = simulateGreedyGame(seed, { rolloutIndex: r });
      const rollout = simulateRollout(seed, r);
      expect(rollout.finalScore).toBe(greedy.finalScore);
      expect(rollout.completed).toBe(greedy.completed);
      expect(greedy.decisionStyle).toBe(["steady", "standard", "aggressive", "steady"][r]);
    }
  });

  it("same persona different rolloutIndex can diverge via policy RNG", () => {
    const seed = "v1_yatz_00011";
    const scores = new Set<number>();
    for (const r of [0, 3, 6, 9, 12, 15]) {
      scores.add(simulateGreedyGame(seed, { rolloutIndex: r }).finalScore);
    }
    expect(scores.size).toBeGreaterThan(1);
  });
});
