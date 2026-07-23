import { describe, expect, it, vi } from "vitest";

import {
  isPortalAdReplayChannel,
  isPortalAdReplayMockEnabled,
  isPortalAdReplayTemplate,
  isUnlimitedAdReplayDailyCap,
  PORTAL_AD_REPLAY_DAILY_CAP,
} from "../../../data/portalAdReplayConfig";
import {
  defaultPortalReplaySettings,
  PORTAL_MAX_REPLAYS_PER_MATCH_DEFAULT,
} from "../../../data/portalPartnerReplaySettings";
import { dailyPeriodKey } from "../../../utils/casualTaskPeriod";
import { shouldDeferSoloSettleForPortalAdReplay } from "../../tournament/submit/casualRunIngestHelpers";
import {
  countAdReplayClaimsForDay,
  hasAdReplayClaimForMatch,
  hasAdReplayClaimForReplayAttempt,
  buildPortalAdReplayOffer,
  resolveSourceReplayEpoch,
  adReplayClaimDedupeKey,
} from "../portalAdReplayService";
import { resolveReplayConfig } from "../partnerAdReplayConfig";

vi.mock("../../tournament/shared/casualPlayerGameTypes", () => ({
  findPlayerGameByGameId: vi.fn(async () => ({
    gameId: "game_a",
    uid: "u1",
    replayEpoch: 2,
  })),
}));

vi.mock("../partnerAdReplayConfig", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../partnerAdReplayConfig")>();
  return {
    ...actual,
    resolveReplayConfig: vi.fn(async () => ({
      ...defaultPortalReplaySettings(PORTAL_AD_REPLAY_DAILY_CAP),
      // Allow multi-epoch offer tests to focus on claim/window logic.
      maxReplaysPerMatch: 10,
    })),
    loadCampaignReplaySettingsForMatchGame: vi.fn(async () => null),
  };
});
describe("portalAdReplayConfig", () => {
  it("detects portal tournament templates", () => {
    expect(isPortalAdReplayTemplate("portal_solo_p75_solitaire")).toBe(true);
    expect(isPortalAdReplayTemplate("portal_multi_block_blast")).toBe(true);
    expect(isPortalAdReplayTemplate("casual_solo_foo")).toBe(false);
  });

  it("validates ad replay channels", () => {
    expect(isPortalAdReplayChannel("crazygames")).toBe(true);
    expect(isPortalAdReplayChannel("poki")).toBe(true);
    expect(isPortalAdReplayChannel("dev")).toBe(true);
    expect(isPortalAdReplayChannel("unknown")).toBe(false);
  });

  it("reads mock flag from env", () => {
    const prevMock = process.env.PORTAL_AD_REPLAY_MOCK;
    const prevDeployment = process.env.CONVEX_DEPLOYMENT;
    process.env.PORTAL_AD_REPLAY_MOCK = "1";
    process.env.CONVEX_DEPLOYMENT = "prod:merry-skunk-952";
    expect(isPortalAdReplayMockEnabled()).toBe(true);
    process.env.PORTAL_AD_REPLAY_MOCK = "0";
    expect(isPortalAdReplayMockEnabled()).toBe(false);
    process.env.PORTAL_AD_REPLAY_MOCK = "";
    process.env.CONVEX_DEPLOYMENT = "dev:local-team";
    expect(isPortalAdReplayMockEnabled()).toBe(true);
    process.env.PORTAL_AD_REPLAY_MOCK = prevMock;
    process.env.CONVEX_DEPLOYMENT = prevDeployment;
  });

  it("defaults daily ad-replay cap to unlimited", () => {
    expect(isUnlimitedAdReplayDailyCap(PORTAL_AD_REPLAY_DAILY_CAP)).toBe(true);
  });

  it("marks portal solo templates as eligible for deferred settle", () => {
    expect(shouldDeferSoloSettleForPortalAdReplay("portal_solo_p75_solitaire")).toBe(true);
    expect(shouldDeferSoloSettleForPortalAdReplay("casual_solo_foo")).toBe(false);
  });
});

function mockAdReplayCtx(rows: {
  claims?: Array<{ uid: string; matchGameId: string; dayKey: string; replayEpoch?: number }>;
}) {
  const claims = rows.claims ?? [];
  return {
    db: {
      query: (table: string) => ({
        withIndex: (
          indexName: string,
          fn: (q: { eq: (k: string, v: string | number) => { eq?: (k: string, v: string | number) => unknown } }) => unknown
        ) => {
          const filters: Record<string, string | number> = {};
          const builder = {
            eq: (key: string, value: string | number) => {
              filters[key] = value;
              if (key === "uid") {
                return {
                  eq: (k2: string, v2: string | number) => {
                    filters[k2] = v2;
                    if (k2 === "matchGameId" && indexName === "by_uid_matchGameId_replayEpoch") {
                      return {
                        eq: (k3: string, v3: string | number) => {
                          filters[k3] = v3;
                          return builder;
                        },
                      };
                    }
                    return builder;
                  },
                };
              }
              return builder;
            },
            first: async () => {
              if (table !== "portal_ad_replay_claims") return null;
              if (indexName === "by_uid_matchGameId_replayEpoch") {
                return (
                  claims.find(
                    (c) =>
                      c.uid === filters.uid &&
                      c.matchGameId === filters.matchGameId &&
                      (c.replayEpoch ?? 0) === filters.replayEpoch
                  ) ?? null
                );
              }
              return (
                claims.find(
                  (c) =>
                    c.uid === filters.uid &&
                    (filters.matchGameId == null || c.matchGameId === filters.matchGameId)
                ) ?? null
              );
            },
            collect: async () => {
              if (table !== "portal_ad_replay_claims") return [];
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

describe("portalAdReplayService helpers", () => {
  it("counts claims for a day", async () => {
    const ctx = mockAdReplayCtx({
      claims: [
        { uid: "u1", matchGameId: "game_a", dayKey: "d:2026-07-07" },
        { uid: "u1", matchGameId: "game_b", dayKey: "d:2026-07-07" },
        { uid: "u1", matchGameId: "game_c", dayKey: "d:2026-07-06" },
      ],
    });
    expect(await countAdReplayClaimsForDay(ctx, "u1", "d:2026-07-07")).toBe(2);
  });

  it("consumeAdReplayDailySlot enforces the daily cap", async () => {
    const { consumeAdReplayDailySlot, readAdReplayUsedToday } = await import(
      "../portalAdReplayService"
    );
    const dayKey = "d:2026-07-09";
    const usage: { uid: string; dayKey: string; usedCount: number }[] = [];
    const ctx = {
      db: {
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
              unique: async () => {
                if (table !== "portal_ad_replay_daily_usage") return null;
                return (
                  usage.find((u) => u.uid === filters.uid && u.dayKey === filters.dayKey) ?? null
                );
              },
              collect: async () => {
                if (table !== "portal_ad_replay_claims") return [];
                return [];
              },
            };
            fn({ eq: builder.eq.bind(builder) });
            return builder;
          },
        }),
        insert: async (table: string, doc: { uid: string; dayKey: string; usedCount: number }) => {
          if (table === "portal_ad_replay_daily_usage") usage.push({ ...doc });
          return "id1";
        },
        patch: async (
          _id: string,
          patch: { usedCount: number }
        ) => {
          const row = usage.find((u) => u.uid === "u1" && u.dayKey === dayKey);
          if (row) row.usedCount = patch.usedCount;
        },
      },
    } as never;

    const cap = 5;
    for (let i = 0; i < cap; i++) {
      const r = await consumeAdReplayDailySlot(ctx, {
        uid: "u1",
        dayKey,
        now: Date.now(),
        cap,
      });
      expect(r.ok).toBe(true);
    }
    expect(await readAdReplayUsedToday(ctx, "u1", dayKey)).toBe(cap);
    const blocked = await consumeAdReplayDailySlot(ctx, {
      uid: "u1",
      dayKey,
      now: Date.now(),
      cap,
    });
    expect(blocked).toEqual({ ok: false, error: "daily_cap_reached" });
  });

  it("dedupes duplicate replayEpoch on the same matchGameId for daily cap", async () => {
    const dayKey = "d:2026-07-08";
    const ctx = mockAdReplayCtx({
      claims: [
        { uid: "u1", matchGameId: "game_a", dayKey, replayEpoch: 2 },
        { uid: "u1", matchGameId: "game_a", dayKey, replayEpoch: 1 },
        { uid: "u1", matchGameId: "game_a", dayKey, replayEpoch: 0 },
        { uid: "u1", matchGameId: "game_a", dayKey, replayEpoch: 0 },
        { uid: "u1", matchGameId: "game_a", dayKey, replayEpoch: 0 },
      ],
    });
    expect(await countAdReplayClaimsForDay(ctx, "u1", dayKey)).toBe(3);
    expect(adReplayClaimDedupeKey("game_a", 0)).toBe("game_a:0");
  });

  it("detects existing claim for match", async () => {
    const ctx = mockAdReplayCtx({
      claims: [{ uid: "u1", matchGameId: "game_a", dayKey: "d:2026-07-07" }],
    });
    expect(await hasAdReplayClaimForMatch(ctx, "u1", "game_a")).toBe(true);
    expect(await hasAdReplayClaimForMatch(ctx, "u1", "game_b")).toBe(false);
  });

  it("allows a new ad replay claim per replayEpoch on the same gameId", async () => {
    const ctx = mockAdReplayCtx({
      claims: [
        { uid: "u1", matchGameId: "game_a", dayKey: "d:2026-07-07", replayEpoch: 0 },
      ],
    });
    expect(await hasAdReplayClaimForReplayAttempt(ctx, "u1", "game_a", 0)).toBe(true);
    expect(await hasAdReplayClaimForReplayAttempt(ctx, "u1", "game_a", 1)).toBe(false);
  });

  it("does not block replayEpoch 2 when claims exist only for earlier epochs", async () => {
    const ctx = mockAdReplayCtx({
      claims: [
        { uid: "u1", matchGameId: "game_a", dayKey: "d:2026-07-07", replayEpoch: 0 },
        { uid: "u1", matchGameId: "game_a", dayKey: "d:2026-07-07", replayEpoch: 1 },
      ],
    });
    expect(await hasAdReplayClaimForReplayAttempt(ctx, "u1", "game_a", 2)).toBe(false);
  });

  it("resolveSourceReplayEpoch uses max of pg and pm", () => {
    expect(resolveSourceReplayEpoch({ replayEpoch: 2 }, { replayEpoch: 1 })).toBe(2);
    expect(resolveSourceReplayEpoch({ replayEpoch: 1 }, { replayEpoch: 2 })).toBe(2);
    expect(resolveSourceReplayEpoch(null, { replayEpoch: 1 })).toBe(1);
    expect(resolveSourceReplayEpoch({}, {})).toBe(0);
  });

  it("does not false-block canReplay when pg replayEpoch lags pm", async () => {
    const { findPlayerGameByGameId } = await import(
      "../../tournament/shared/casualPlayerGameTypes"
    );
    vi.mocked(findPlayerGameByGameId).mockResolvedValueOnce({
      gameId: "game_a",
      uid: "u1",
      replayEpoch: 1,
    } as never);

    const now = Date.now();
    const dayKey = dailyPeriodKey(now);
    const pm = {
      _id: "pm1",
      templateId: "portal_solo_p75_solitaire",
      status: "finished",
      finishedAt: now - 30_000,
      score: 800,
      replayEpoch: 2,
    };
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
    const ctx = {
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
              first: async () => null,
              unique: async () => null,
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

    const offer = await buildPortalAdReplayOffer(ctx, {
      uid: "u1",
      pm: pm as never,
      now,
      matchGameId: "game_a",
      tableSummary: {
        maxPlayers: 1,
        rows: [{ rank: 1, score: 800, displayLabel: "你", isYou: true }],
      },
      def: soloDef,
      challengeSuccess: false,
    });

    expect(offer.replayOffered).toBe(true);
    expect(offer.canReplay).toBe(true);
  });

  it("offers ad replay on second+ failure when prior epochs are claimed", async () => {
    const now = Date.now();
    const dayKey = dailyPeriodKey(now);
    const pm = {
      _id: "pm1",
      templateId: "portal_solo_p75_solitaire",
      status: "finished",
      finishedAt: now - 30_000,
      score: 800,
      replayEpoch: 2,
    };
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
    const ctx = {
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
              first: async () => null,
              unique: async () => null,
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

    const tableSummary = {
      maxPlayers: 1,
      rows: [{ rank: 1, score: 800, displayLabel: "你", isYou: true }],
    };

    const offer = await buildPortalAdReplayOffer(ctx, {
      uid: "u1",
      pm: pm as never,
      now,
      matchGameId: "game_a",
      tableSummary,
      def: soloDef,
      challengeSuccess: false,
    });

    expect(offer.replayOffered).toBe(true);
    expect(offer.canReplay).toBe(true);
    expect(offer.adReplayDailyRemaining).toBeGreaterThan(0);
  });

  it("blocks offer when replayEpoch reaches maxReplaysPerMatch (default 1)", async () => {
    expect(PORTAL_MAX_REPLAYS_PER_MATCH_DEFAULT).toBe(1);
    vi.mocked(resolveReplayConfig).mockResolvedValueOnce({
      ...defaultPortalReplaySettings(PORTAL_AD_REPLAY_DAILY_CAP),
      maxReplaysPerMatch: 1,
    });

    const now = Date.now();
    const pm = {
      _id: "pm1",
      templateId: "portal_solo_p75_solitaire",
      status: "finished",
      finishedAt: now - 30_000,
      score: 800,
      replayEpoch: 1,
    };
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
    const ctx = {
      db: {
        get: async (id: string) => (id === "pm1" ? pm : null),
        query: () => ({
          withIndex: () => ({
            eq: () => ({
              eq: () => ({
                first: async () => null,
                unique: async () => null,
                collect: async () => [],
              }),
              first: async () => null,
              unique: async () => null,
              collect: async () => [],
            }),
            first: async () => null,
            unique: async () => null,
            collect: async () => [],
          }),
        }),
      },
    } as never;

    const { findPlayerGameByGameId } = await import(
      "../../tournament/shared/casualPlayerGameTypes"
    );
    vi.mocked(findPlayerGameByGameId).mockResolvedValueOnce({
      gameId: "game_a",
      uid: "u1",
      replayEpoch: 1,
    } as never);

    const offer = await buildPortalAdReplayOffer(ctx, {
      uid: "u1",
      pm: pm as never,
      now,
      matchGameId: "game_a",
      tableSummary: {
        maxPlayers: 1,
        rows: [{ rank: 1, score: 800, displayLabel: "你", isYou: true }],
      },
      def: soloDef,
      challengeSuccess: false,
    });

    expect(offer.replayOffered).toBe(true);
    expect(offer.canReplay).toBe(false);
  });
});

describe("portalAdReplayEligibility", () => {
  it("solo challenge: replay only when not meeting target", async () => {
    const {
      isPortalAdReplayOfferEligible,
      isSoloChallengeEligibleForAdReplay,
    } = await import("../portalAdReplayEligibility");
    const soloDef = {
      tournamentId: "portal_solo_p75_solitaire",
      title: "S",
      gameType: "solitaire",
      matchType: "solo_p75" as const,
      status: "open",
      maxPlayers: 1,
      entry: { kind: "none" as const },
    };
    expect(isSoloChallengeEligibleForAdReplay(soloDef, false)).toBe(true);
    expect(isSoloChallengeEligibleForAdReplay(soloDef, true)).toBe(false);
    expect(
      isPortalAdReplayOfferEligible({
        def: soloDef,
        tableSummary: { maxPlayers: 1, rows: [{ rank: 1, score: 100, displayLabel: "你", isYou: true }] },
        challengeSuccess: true,
      })
    ).toBe(false);
  });

  it("multi: suppress replay when rank 1 and board fully scored", async () => {
    const { isMultiplayerWinnerAllScoredSuppressAdReplay, isPortalAdReplayOfferEligible } =
      await import("../portalAdReplayEligibility");
    const multiDef = {
      tournamentId: "portal_multi_solitaire",
      title: "M",
      gameType: "solitaire",
      matchType: "multi_ranked" as const,
      status: "open",
      maxPlayers: 5,
      entry: { kind: "none" as const },
    };
    const tableSummary = {
      maxPlayers: 5,
      isBoardStable: true,
      rows: [
        { rank: 1, score: 500, rowState: "scored" as const, displayLabel: "你", isYou: true },
        { rank: 2, score: 400, rowState: "scored" as const, displayLabel: "NeonFox", isYou: false, isBot: true },
        { rank: 3, score: 300, rowState: "scored" as const, displayLabel: "QuietRiver", isYou: false, isBot: true },
      ],
    };
    expect(isMultiplayerWinnerAllScoredSuppressAdReplay(multiDef, tableSummary)).toBe(true);
    expect(
      isPortalAdReplayOfferEligible({ def: multiDef, tableSummary, challengeSuccess: undefined })
    ).toBe(false);
  });

  it("multi: allow replay when not rank 1 even if board stable", async () => {
    const { isPortalAdReplayOfferEligible } = await import("../portalAdReplayEligibility");
    const multiDef = {
      tournamentId: "portal_multi_solitaire",
      title: "M",
      gameType: "solitaire",
      matchType: "multi_ranked" as const,
      status: "open",
      maxPlayers: 5,
      entry: { kind: "none" as const },
    };
    const tableSummary = {
      maxPlayers: 5,
      isBoardStable: true,
      rows: [
        { rank: 1, score: 500, rowState: "scored" as const, displayLabel: "NeonFox", isYou: false, isBot: true },
        { rank: 2, score: 400, rowState: "scored" as const, displayLabel: "你", isYou: true },
      ],
    };
    expect(
      isPortalAdReplayOfferEligible({ def: multiDef, tableSummary, challengeSuccess: undefined })
    ).toBe(true);
  });
});

describe("casualPlayerMatchStatus portal replay window", () => {
  it("allows replay window for portal templates", async () => {
    const { getReplayWindowMs, canUseReplayForTemplate } = await import(
      "../../tournament/shared/casualPlayerMatchStatus"
    );
    expect(getReplayWindowMs("portal_solo_p75_solitaire")).toBeGreaterThan(0);
    expect(canUseReplayForTemplate("portal_solo_p75_solitaire")).toBe(true);
  });
});
