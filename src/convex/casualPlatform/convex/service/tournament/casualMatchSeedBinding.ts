import { v } from "convex/values";

import type { Doc } from "../../_generated/dataModel";

export const casualSeedTierValidator = v.union(
  v.literal("easy"),
  v.literal("medium"),
  v.literal("hard")
);

export const casualSeedScoreQuantilesValidator = v.object({
  p10: v.number(),
  p25: v.number(),
  p30: v.number(),
  p33: v.number(),
  p50: v.number(),
  p66: v.number(),
  p70: v.number(),
  p75: v.number(),
  p90: v.number(),
});

/** solitaire seed pool 绑定快照（整场 match 共用） */
export const casualMatchSeedBindingValidator = v.object({
  seedId: v.string(),
  poolVersion: v.string(),
  tier: casualSeedTierValidator,
  scoreQuantiles: casualSeedScoreQuantilesValidator,
});

export type CasualMatchSeedBinding = {
  seedId: string;
  poolVersion: string;
  tier: "easy" | "medium" | "hard";
  scoreQuantiles: {
    p10: number;
    p25: number;
    p30: number;
    p33: number;
    p50: number;
    p66: number;
    p70: number;
    p75: number;
    p90: number;
  };
};

type MatchSeedFields = Pick<Doc<"casual_run_matches">, "seedBinding">;

export function readCasualMatchSeedBinding(
  match: MatchSeedFields
): CasualMatchSeedBinding | null {
  if (!match.seedBinding) return null;
  return match.seedBinding as CasualMatchSeedBinding;
}

export function hasCasualMatchSeedBinding(match: MatchSeedFields): boolean {
  return readCasualMatchSeedBinding(match) != null;
}
