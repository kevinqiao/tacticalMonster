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

/** L3 success line quantile on match seed binding */
export const casualSuccessQuantileValidator = v.union(
  v.literal("p25"),
  v.literal("p50"),
  v.literal("p75"),
  v.literal("p90")
);

export const casualSoloSegmentValidator = v.union(
  v.literal("ritual_a"),
  v.literal("transition_b"),
  v.literal("merged_c")
);

export const casualMatchSeedBindingValidator = v.object({
  seedId: v.string(),
  poolVersion: v.string(),
  tier: casualSeedTierValidator,
  /** v3 slim bind; block_blast may omit quantiles until resolve */
  scoreQuantiles: v.optional(casualSeedScoreQuantilesValidator),
  /** L3 override (BB B: p25/p50; 其它 A: p50); omit → template seedQuantileSuccess */
  successQuantile: v.optional(casualSuccessQuantileValidator),
  /** BB 段 A：消一行/列固定分 */
  ritualOneLineClear: v.optional(v.boolean()),
  /** Solo A/B/C ladder segment at pick time (reward table key). */
  segment: v.optional(casualSoloSegmentValidator),
});

export type CasualMatchSeedBinding = {
  seedId: string;
  poolVersion: string;
  tier: "easy" | "medium" | "hard";
  scoreQuantiles?: CasualMatchSeedScoreQuantiles;
  successQuantile?: "p25" | "p50" | "p75" | "p90";
  ritualOneLineClear?: boolean;
  segment?: "ritual_a" | "transition_b" | "merged_c";
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
