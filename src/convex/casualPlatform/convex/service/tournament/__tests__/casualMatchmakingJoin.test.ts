import { describe, expect, it } from "vitest";

import {
  CASUAL_DEFAULT_EFFECTIVE_HUMANS,
  CASUAL_DEFAULT_QUEUE_EXPIRE,
  resolveMatchmakingExpireAction,
} from "../../../data/casualMatchmakingConfig";
import {
  CASUAL_CONSECUTIVE_LOSS_THRESHOLD,
  type BotStrategyPlayerContext,
} from "../../../data/casualPlayerStrategyTypes";
import { getTournamentDefinition } from "../../../data/casualTournamentConfigs";
import { evaluateEffectiveHumans } from "../casualBotDifficultyService";
import {
  computeMultiTableBatchSize,
  resolveQueueEffectiveHumans,
  resolveQueueExpireAction,
} from "../casualMatchmaking";
import { toCasualMatchQueueClientFlags } from "../casualTournamentTypes";

function baseProfile(
  overrides: Partial<BotStrategyPlayerContext> = {}
): BotStrategyPlayerContext {
  return {
    uid: "u1",
    tournamentId: "casual_async_b_solitaire",
    templateId: "casual_async_b_solitaire",
    matchType: "tournament_b",
    gameType: "solitaire",
    maxPlayers: 5,
    seasonLadderPoints: 100,
    completedMultiplayerMatches: 20,
    coinsBalance: 500,
    daysSinceLastMatch: 1,
    passLevel: 5,
    passTrack: "none",
    consecutiveLossStreak: 0,
    ...overrides,
  };
}

describe("evaluateEffectiveHumans", () => {
  it("defaults to 2 when no MATCHMAKING_RULE hits", () => {
    const def = getTournamentDefinition("casual_async_b_solitaire");
    expect(def).toBeTruthy();
    const result = evaluateEffectiveHumans(baseProfile(), def!);
    expect(result.effectiveHumans).toBe(CASUAL_DEFAULT_EFFECTIVE_HUMANS);
    expect(result.matchedRuleId).toBe("default");
    expect(result.queueExpireAction).toBe(CASUAL_DEFAULT_QUEUE_EXPIRE);
  });

  it("consecutive loss streak → effectiveHumans 2, expire solo", () => {
    const def = getTournamentDefinition("casual_async_b_solitaire");
    const result = evaluateEffectiveHumans(
      baseProfile({ consecutiveLossStreak: CASUAL_CONSECUTIVE_LOSS_THRESHOLD }),
      def!
    );
    expect(result.effectiveHumans).toBe(2);
    expect(result.matchedRuleId).toBe("consecutive_loss_solo_table");
    expect(result.queueExpireAction).toBe("solo");
  });

  it("returning player → effectiveHumans 1, expire solo", () => {
    const def = getTournamentDefinition("casual_async_b_solitaire");
    const result = evaluateEffectiveHumans(
      baseProfile({ daysSinceLastMatch: 15 }),
      def!
    );
    expect(result.effectiveHumans).toBe(1);
    expect(result.matchedRuleId).toBe("returning_player_solo");
    expect(result.queueExpireAction).toBe("solo");
  });

  it("early game → effectiveHumans 1, expire solo", () => {
    const def = getTournamentDefinition("casual_async_b_solitaire");
    const result = evaluateEffectiveHumans(
      baseProfile({ completedMultiplayerMatches: 3, seasonLadderPoints: 10 }),
      def!
    );
    expect(result.effectiveHumans).toBe(1);
    expect(result.matchedRuleId).toBe("early_game_solo");
    expect(result.queueExpireAction).toBe("solo");
  });

  it("caps effectiveHumans at maxPlayers", () => {
    const def = getTournamentDefinition("casual_async_b_solitaire");
    const twoPlayerDef = { ...def!, maxPlayers: 1 };
    const result = evaluateEffectiveHumans(baseProfile(), twoPlayerDef);
    expect(result.effectiveHumans).toBe(1);
  });
});

describe("resolveQueueEffectiveHumans", () => {
  it("reads effectiveHumans from row", () => {
    expect(
      resolveQueueEffectiveHumans({
        effectiveHumans: 3,
      } as Parameters<typeof resolveQueueEffectiveHumans>[0])
    ).toBe(3);
  });

  it("falls back to legacy effectiveMinHumans", () => {
    expect(
      resolveQueueEffectiveHumans({
        effectiveMinHumans: 1,
      } as Parameters<typeof resolveQueueEffectiveHumans>[0])
    ).toBe(1);
  });

  it("defaults to CASUAL_DEFAULT_EFFECTIVE_HUMANS when missing", () => {
    expect(
      resolveQueueEffectiveHumans({} as Parameters<typeof resolveQueueEffectiveHumans>[0])
    ).toBe(CASUAL_DEFAULT_EFFECTIVE_HUMANS);
  });
});

describe("resolveMatchmakingExpireAction", () => {
  it("uses expireAction when set", () => {
    expect(resolveMatchmakingExpireAction({ effectiveHumans: 2, expireAction: "exit" })).toBe(
      "exit"
    );
  });

  it("defaults to CASUAL_DEFAULT_QUEUE_EXPIRE when omitted", () => {
    expect(resolveMatchmakingExpireAction({ effectiveHumans: 2 })).toBe(
      CASUAL_DEFAULT_QUEUE_EXPIRE
    );
  });
});

describe("resolveQueueExpireAction", () => {
  it("reads queueExpireAction from row", () => {
    expect(
      resolveQueueExpireAction({
        queueExpireAction: "exit",
      } as Parameters<typeof resolveQueueExpireAction>[0])
    ).toBe("exit");
  });

  it("defaults to CASUAL_DEFAULT_QUEUE_EXPIRE when missing", () => {
    expect(
      resolveQueueExpireAction({} as Parameters<typeof resolveQueueExpireAction>[0])
    ).toBe(CASUAL_DEFAULT_QUEUE_EXPIRE);
  });
});

describe("computeMultiTableBatchSize", () => {
  it("returns 0 when below effectiveHumans threshold", () => {
    expect(
      computeMultiTableBatchSize({ waitingLength: 1, effectiveHumans: 2, maxPlayers: 5 })
    ).toBe(0);
  });

  it("opens 2 humans when 2 waiting (5p, eff=2)", () => {
    expect(
      computeMultiTableBatchSize({ waitingLength: 2, effectiveHumans: 2, maxPlayers: 5 })
    ).toBe(2);
  });

  it("opens all waiting up to maxPlayers (6 waiting, 5p, eff=2)", () => {
    expect(
      computeMultiTableBatchSize({ waitingLength: 6, effectiveHumans: 2, maxPlayers: 5 })
    ).toBe(5);
  });

  it("opens 5 when exactly 5 waiting (5p, eff=2)", () => {
    expect(
      computeMultiTableBatchSize({ waitingLength: 5, effectiveHumans: 2, maxPlayers: 5 })
    ).toBe(5);
  });
});

describe("toCasualMatchQueueClientFlags", () => {
  it("waitingForPeer when effectiveHumans > 1", () => {
    expect(
      toCasualMatchQueueClientFlags({ effectiveHumans: 2, expiresAt: 123 })
    ).toEqual({ waitingForPeer: true, expiresAt: 123 });
  });

  it("no waitingForPeer when effectiveHumans === 1", () => {
    expect(toCasualMatchQueueClientFlags({ effectiveHumans: 1 })).toEqual({
      waitingForPeer: false,
    });
  });
});
