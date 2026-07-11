import { describe, expect, it } from "vitest";

import { countPortalModePlaysToday } from "../../component/lobby/portal/3d/portalDailyPlayQuotaClient";
import type { PortalGameHistoryRow } from "../../component/lobby/portal/service/usePortalManager";

describe("countPortalModePlaysToday", () => {
  const now = Date.parse("2026-07-10T12:00:00+08:00");

  it("counts solo history rows in the ops day window", () => {
    const history: PortalGameHistoryRow[] = [
      {
        entryId: "a",
        runTournamentId: "run_a",
        tournamentId: "portal_solo_p75_solitaire",
        title: "solo",
        gameType: "solitaire",
        matchType: "solo_p75",
        score: 100,
        submittedAt: now,
        entryStatus: "submitted",
        runStartedAt: now - 60_000,
      },
      {
        entryId: "b",
        runTournamentId: "run_b",
        tournamentId: "portal_multi_solitaire",
        title: "multi",
        gameType: "solitaire",
        matchType: "multi_ranked",
        score: 200,
        submittedAt: now,
        entryStatus: "submitted",
        runStartedAt: now - 30_000,
      },
      {
        entryId: "c",
        runTournamentId: "run_c",
        tournamentId: "portal_solo_p75_solitaire",
        title: "campaign solo",
        gameType: "solitaire",
        matchType: "solo_p75",
        score: 50,
        submittedAt: now,
        entryStatus: "submitted",
        runStartedAt: now - 10_000,
        campaignId: "camp_1",
      },
    ];
    expect(
      countPortalModePlaysToday({
        gameHistory: history,
        openAssignments: [],
        gameType: "solitaire",
        mode: "solo",
        nowMs: now,
      })
    ).toBe(1);
    expect(
      countPortalModePlaysToday({
        gameHistory: history,
        openAssignments: [],
        gameType: "solitaire",
        mode: "multi",
        nowMs: now,
      })
    ).toBe(1);
  });
});
