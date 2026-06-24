import { CASUAL_RANK_STAT_BUCKET_MAX } from "../../shared/constants";
import { expandStatBucketToTargetRank } from "../../shared/rankStatBuckets";
import type { CasualRankRateEntry } from "../../data/portalTournamentConfigs";
import type { BotStrategyPlayerContext } from "../../data/portalPlayerStrategyTypes";
import {
  recommendTargetRankFromQuantileProximity,
  type ScoreQuantiles,
} from "../../shared/scoreQuantiles";
import { evaluateBotDifficultyRulesWithMeta } from "./botDifficultyConfig";
import { buildBalancedRankWeights, sampleTargetRank } from "./rankSampling";
import {
  rankBandFromScore,
  resolveEffectiveRank,
  type SoloRankBand,
} from "./soloRankBand";

export type SoloRankRecommendSource = "quantile" | "profile" | "rank_rates";

export type SoloRankRecommendResult = {
  targetRank: number;
  /** 人类在 bot 补位后 finalize 的实际 1-based 名次（与 assignMatchRanksByScoreDesc 一致）。 */
  effectiveRank: number;
  rankBand: SoloRankBand;
  source: SoloRankRecommendSource;
  matchedRuleId?: string;
};

export function recommendSoloEffectiveRank(args: {
  humanScore: number;
  scoreQuantiles: ScoreQuantiles;
  maxPlayers: number;
  profile: BotStrategyPlayerContext;
  rankCounts: Record<number, number>;
  rankRates: CasualRankRateEntry[];
  sessionSeed: number;
}): SoloRankRecommendResult {
  const {
    humanScore,
    scoreQuantiles,
    maxPlayers,
    profile,
    rankCounts,
    rankRates,
    sessionSeed,
  } = args;

  const rankBand = rankBandFromScore(humanScore, scoreQuantiles, maxPlayers);
  const p50 = scoreQuantiles.p50;

  let targetRank: number;
  let source: SoloRankRecommendSource;
  let matchedRuleId: string | undefined;

  if (humanScore < p50) {
    targetRank = recommendTargetRankFromQuantileProximity(
      humanScore,
      scoreQuantiles,
      maxPlayers
    );
    source = "quantile";
  } else {
    const { strategy, matchedRuleId: ruleId } = evaluateBotDifficultyRulesWithMeta(profile);
    if (strategy != null) {
      targetRank = sampleTargetRank(strategy, maxPlayers, sessionSeed);
      source = "profile";
      matchedRuleId = ruleId ?? undefined;
    } else {
      const balanced = buildBalancedRankWeights({ rankRates, rankCounts });
      const statBucket = sampleTargetRank(
        balanced,
        CASUAL_RANK_STAT_BUCKET_MAX,
        sessionSeed
      );
      targetRank = expandStatBucketToTargetRank(statBucket, maxPlayers, sessionSeed);
      source = "rank_rates";
    }
  }

  const effectiveRank = resolveEffectiveRank({
    targetRank,
    band: rankBand,
    maxPlayers,
  });
  return { targetRank, effectiveRank, rankBand, source, matchedRuleId };
}

export type { SoloRankBand };
