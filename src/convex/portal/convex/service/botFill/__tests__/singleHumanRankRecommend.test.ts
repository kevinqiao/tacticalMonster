import { describe, expect, it } from "vitest";

import type { BotStrategyPlayerContext } from "../../../data/portalPlayerStrategyTypes";
import {
  getPortalTournamentDefinition,
  getTournamentBotDifficultyProfile,
} from "../../../data/portalTournamentConfigs";
import { recommendSingleHumanEffectiveRank } from "../singleHumanRankRecommend";

const QUANTILES = {
  p10: 32,
  p25: 64,
  p30: 96,
  p33: 96,
  p50: 152,
  p66: 240,
  p70: 264,
  p75: 267,
  p90: 280,
};

const RANK_RATES = [
  { rank: 1, odd: 20 },
  { rank: 2, odd: 20 },
  { rank: 3, odd: 20 },
  { rank: 4, odd: 20 },
  { rank: 5, odd: 20 },
];

function profile(over: Partial<BotStrategyPlayerContext> = {}): BotStrategyPlayerContext {
  return {
    uid: "u1",
    tournamentId: "portal_multi_coin_block_blast",
    templateId: "portal_multi_coin_block_blast",
    matchType: "multi_ranked",
    gameType: "block_blast",
    maxPlayers: 5,
    weeklyLeagueTier: "bronze",
    completedMultiplayerMatches: 0,
    coinsBalance: 0,
    daysSinceLastMatch: 30,
    passLevel: 1,
    passTrack: "none",
    consecutiveLossStreak: 5,
    ...over,
  };
}

describe("recommendSingleHumanEffectiveRank", () => {
  it("botDifficultyProfile=none skips BOT_DIFFICULTY_RULES even when player profile would match", () => {
    const withStrategy = recommendSingleHumanEffectiveRank({
      humanScore: 200,
      scoreQuantiles: QUANTILES,
      maxPlayers: 5,
      profile: profile(),
      rankCounts: {},
      rankRates: RANK_RATES,
      sessionSeed: 42,
      botDifficultyProfile: "default",
    });
    expect(withStrategy.source).toBe("profile");
    expect(withStrategy.matchedRuleId).toBeTruthy();

    const noneProfile = recommendSingleHumanEffectiveRank({
      humanScore: 200,
      scoreQuantiles: QUANTILES,
      maxPlayers: 5,
      profile: profile(),
      rankCounts: {},
      rankRates: RANK_RATES,
      sessionSeed: 42,
      botDifficultyProfile: "none",
    });
    expect(noneProfile.source).toBe("rank_rates");
    expect(noneProfile.matchedRuleId).toBeUndefined();
  });

  it("botDifficultyProfile=none also skips quantile path below p50", () => {
    const normal = recommendSingleHumanEffectiveRank({
      humanScore: 100,
      scoreQuantiles: QUANTILES,
      maxPlayers: 5,
      profile: profile({ consecutiveLossStreak: 0, daysSinceLastMatch: 0 }),
      rankCounts: {},
      rankRates: RANK_RATES,
      sessionSeed: 7,
      botDifficultyProfile: "default",
    });
    expect(normal.source).toBe("quantile");

    const noneProfile = recommendSingleHumanEffectiveRank({
      humanScore: 100,
      scoreQuantiles: QUANTILES,
      maxPlayers: 5,
      profile: profile(),
      rankCounts: {},
      rankRates: RANK_RATES,
      sessionSeed: 7,
      botDifficultyProfile: "none",
    });
    expect(noneProfile.source).toBe("rank_rates");
  });

  it("coin tournament defs resolve to none profile", () => {
    expect(getTournamentBotDifficultyProfile({})).toBe("default");
    const coin = getPortalTournamentDefinition("portal_multi_coin_block_blast");
    expect(coin).toBeTruthy();
    expect(getTournamentBotDifficultyProfile(coin!)).toBe("none");
    const free = getPortalTournamentDefinition("portal_multi_block_blast");
    expect(free).toBeTruthy();
    expect(getTournamentBotDifficultyProfile(free!)).toBe("default");
  });
});
