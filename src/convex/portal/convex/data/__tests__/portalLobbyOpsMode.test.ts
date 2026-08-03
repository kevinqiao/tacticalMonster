import { describe, expect, it } from "vitest";

import {
  DEFAULT_LEGACY_LOBBY_OPS_MODE,
  DEFAULT_NEW_PARTNER_LOBBY_OPS_MODE,
  economyScopeKey,
  normalizeLobbyOpsMode,
  resolveLobbyOpsMode,
} from "../portalLobbyOpsMode";
import { matchPartitionKey } from "../../service/economy/resolveEconomyScope";
import {
  portalRankCoinReward,
  portalRankPointDelta,
  resolveEffectiveTournamentRewards,
  type PortalTournamentDefinition,
} from "../portalTournamentConfigs";

describe("portalLobbyOpsMode", () => {
  it("defaults legacy partners to shared", () => {
    expect(resolveLobbyOpsMode(undefined)).toBe(DEFAULT_LEGACY_LOBBY_OPS_MODE);
    expect(resolveLobbyOpsMode(null)).toBe("shared");
    expect(normalizeLobbyOpsMode("isolated")).toBe("isolated");
    expect(DEFAULT_NEW_PARTNER_LOBBY_OPS_MODE).toBe("isolated");
  });

  it("builds economy scope keys", () => {
    expect(economyScopeKey("shared", "lobby_abc")).toBe("shared");
    expect(economyScopeKey("isolated", "lobby_abc")).toBe("lobby:lobby_abc");
    expect(economyScopeKey("isolated", null)).toBe("shared");
  });

  it("partitions matchmaking by partner+template, not lobby", () => {
    expect(matchPartitionKey(3, "portal_multi_solitaire")).toBe(
      "p:3|t:portal_multi_solitaire"
    );
    expect(matchPartitionKey(0, "portal_multi_solitaire")).toBe(
      "p:0|t:portal_multi_solitaire"
    );
  });
});

describe("per-player rewardsOverride", () => {
  const def: PortalTournamentDefinition = {
    tournamentId: "portal_multi_coin_solitaire",
    title: "test",
    gameType: "solitaire",
    matchType: "multi_ranked",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "coins", amount: 20 },
    rankPoints: { 1: 5, 2: 3 },
    coinRewards: { rankCoins: { "1": 40, "2": 20 } },
  };

  it("applies lobby override independently of template defaults", () => {
    const override = {
      rankPoints: { "1": 10, "2": 1 },
      coins: { rankCoins: { "1": 100, "2": 10 } },
    };
    const effective = resolveEffectiveTournamentRewards(def, override);
    expect(effective.rankPoints?.[1]).toBe(10);
    expect(portalRankPointDelta(def, 1, override)).toBe(10);
    expect(portalRankCoinReward(def, 1, override)).toBe(100);
    expect(portalRankCoinReward(def, 1)).toBe(40);
  });
});
