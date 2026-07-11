import { describe, expect, it, vi } from "vitest";

import { dailyPeriodKey } from "../../../../utils/casualTaskPeriod";
import { buildDeferredSoloPortalIngestResponse } from "../casualRunIngestHelpers";

const mockPg = {
  gameId: "game_a",
  uid: "u1",
  replayEpoch: 2,
  gameType: "solitaire",
  seedBinding: {
    seedId: "seed-1",
    poolVersion: "v1",
    tier: "medium" as const,
    scoreQuantiles: { p75: 1000 },
  },
};

vi.mock("../../shared/casualPlayerGameTypes", () => ({
  findPlayerGameByGameId: vi.fn(async () => mockPg),
}));

function mockReplayCtx(pm: Record<string, unknown>, now: number) {
  const dayKey = dailyPeriodKey(now);
  return {
    db: {
      get: async (id: string) => (id === "pm1" ? pm : null),
      query: (table: string) => ({
        withIndex: (
          _name: string,
          fn: (q: { eq: (k: string, v: string) => { eq?: (k: string, v: string) => unknown } }) => unknown
        ) => {
          const filters: Record<string, string> = {};
          const builder = {
            eq: (key: string, value: string) => {
              filters[key] = value;
              if (key === "uid") {
                return {
                  eq: (k2: string, v2: string) => {
                    filters[k2] = v2;
                    return builder;
                  },
                };
              }
              return builder;
            },
            collect: async () => {
              if (table !== "portal_ad_replay_claims") return [];
              const claims = [
                { uid: "u1", matchGameId: "game_a", dayKey, replayEpoch: 0 },
                { uid: "u1", matchGameId: "game_a", dayKey, replayEpoch: 1 },
              ];
              return claims.filter((c) => {
                if (c.uid !== filters.uid) return false;
                if (filters.dayKey != null && c.dayKey !== filters.dayKey) return false;
                if (filters.matchGameId != null && c.matchGameId !== filters.matchGameId) return false;
                return true;
              });
            },
          };
          fn({ eq: builder.eq.bind(builder) });
          return builder;
        },
      }),
    },
  } as never;
}

describe("buildDeferredSoloPortalIngestResponse", () => {
  const soloDef = {
    tournamentId: "portal_solo_p75_solitaire",
    title: "S",
    gameType: "solitaire",
    matchType: "solo_p75" as const,
    status: "open",
    maxPlayers: 1,
    entry: { kind: "none" as const },
    seedQuantileSuccess: { quantile: "p75" as const },
  };

  it("offers replay at replayEpoch 2 without inline seedScoreThreshold arg", async () => {
    const now = Date.now();
    const pm = {
      _id: "pm1",
      templateId: "portal_solo_p75_solitaire",
      status: "finished",
      finishedAt: now - 30_000,
      score: 800,
      replayEpoch: 2,
    };
    const ctx = mockReplayCtx(pm, now);

    const body = await buildDeferredSoloPortalIngestResponse(ctx, {
      def: soloDef,
      pm: pm as never,
      uid: "u1",
      now,
      matchGameId: "game_a",
      totalScore: 800,
    });

    expect(body.success).toBe(false);
    expect(body.seedScoreThreshold).toBe(1000);
    expect(body.tableSummary.replayOffered).toBe(true);
    expect(body.tableSummary.canReplay).toBe(true);
  });
});
