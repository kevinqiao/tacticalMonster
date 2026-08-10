import { CASUAL_RANK_STAT_BUCKET_MAX } from "../../shared/constants";
import { expandStatBucketToTargetRank } from "../../shared/rankStatBuckets";
import type {
  CasualRankRateEntry,
  PortalBotDifficultyProfileId,
} from "../../data/portalTournamentConfigs";
import type { BotStrategyPlayerContext } from "../../data/portalPlayerStrategyTypes";
import {
  recommendTargetRankFromQuantileProximity,
  type ScoreQuantiles,
} from "../../shared/scoreQuantiles";
import {
  evaluateBotDifficultyRulesWithMeta,
  resolveBotDifficultyRules,
} from "./botDifficultyConfig";
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

function sampleRankFromTournamentRates(args: {
  rankRates: CasualRankRateEntry[];
  rankCounts: Record<number, number>;
  maxPlayers: number;
  sessionSeed: number;
}): number {
  const balanced = buildBalancedRankWeights({
    rankRates: args.rankRates,
    rankCounts: args.rankCounts,
  });
  const statBucket = sampleTargetRank(
    balanced,
    CASUAL_RANK_STAT_BUCKET_MAX,
    args.sessionSeed
  );
  return expandStatBucketToTargetRank(statBucket, args.maxPlayers, args.sessionSeed);
}

export function recommendSoloEffectiveRank(args: {
  humanScore: number;
  scoreQuantiles: ScoreQuantiles;
  maxPlayers: number;
  profile: BotStrategyPlayerContext;
  rankCounts: Record<number, number>;
  rankRates: CasualRankRateEntry[];
  sessionSeed: number;
  /** 桌级难度分轨；`none` 时始终 rank_rates（跳过 quantile / rules）。缺省 `default`。 */
  botDifficultyProfile?: PortalBotDifficultyProfileId;
}): SoloRankRecommendResult {
  const {
    humanScore,
    scoreQuantiles,
    maxPlayers,
    profile,
    rankCounts,
    rankRates,
    sessionSeed,
    botDifficultyProfile = "default",
  } = args;

  const rankBand = rankBandFromScore(humanScore, scoreQuantiles, maxPlayers);
  const p50 = scoreQuantiles.p50;
  const rules = resolveBotDifficultyRules(botDifficultyProfile);

  let targetRank: number;
  let source: SoloRankRecommendSource;
  let matchedRuleId: string | undefined;

  if (rules.length === 0) {
    // profile `none`（金币竞技等）：整条只走桌 rankRates
    targetRank = sampleRankFromTournamentRates({
      rankRates,
      rankCounts,
      maxPlayers,
      sessionSeed,
    });
    source = "rank_rates";
  } else if (humanScore < p50) {
    targetRank = recommendTargetRankFromQuantileProximity(
      humanScore,
      scoreQuantiles,
      maxPlayers
    );
    source = "quantile";
  } else {
    const { strategy, matchedRuleId: ruleId } = evaluateBotDifficultyRulesWithMeta(
      profile,
      rules
    );
    if (strategy != null) {
      targetRank = sampleTargetRank(strategy, maxPlayers, sessionSeed);
      source = "profile";
      matchedRuleId = ruleId ?? undefined;
    } else {
      targetRank = sampleRankFromTournamentRates({
        rankRates,
        rankCounts,
        maxPlayers,
        sessionSeed,
      });
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

