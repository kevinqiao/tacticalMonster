import { v } from "convex/values";

import type { ScoreQuantiles } from "../../../../shared/scoreQuantiles";
import type { Doc } from "../../../_generated/dataModel";

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

export type CasualMatchSeedScoreQuantiles = ScoreQuantiles;

/** solitaire seed pool ????(?? match ??) */
export const casualMatchSeedBindingValidator = v.object({
  seedId: v.string(),
  poolVersion: v.string(),
  tier: casualSeedTierValidator,
  /** v3 slim bind ??;block_blast ?? bind ???????? */
  scoreQuantiles: v.optional(casualSeedScoreQuantilesValidator),
});

export type CasualMatchSeedBinding = {
  seedId: string;
  poolVersion: string;
  tier: "easy" | "medium" | "hard";
  scoreQuantiles?: CasualMatchSeedScoreQuantiles;
};

/** resolve HTTP ??? solitaire ?????(??? solitaire seed pool ??) */
export type SlimCasualMatchSeedBinding = Pick<
  CasualMatchSeedBinding,
  "seedId" | "poolVersion" | "tier"
>;

type MatchSeedFields = Pick<Doc<"portal_run_matches">, "seedBinding">;

export function readCasualMatchSeedBinding(
  match: MatchSeedFields
): CasualMatchSeedBinding | null {
  if (!match.seedBinding) return null;
  return match.seedBinding as CasualMatchSeedBinding;
}

export function hasCasualMatchSeedBinding(match: MatchSeedFields): boolean {
  return readCasualMatchSeedBinding(match) != null;
}
