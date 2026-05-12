/** Shared result types for casual tournament join / queue flows. */

export type JoinCasualRunResult =
  | {
      ok: true;
      runTournamentId: string;
      matchId: string;
      gameId: string;
      templateId: string;
      vouchersCharged?: number;
      coinsCharged?: number;
      gemsCharged?: number;
      activityIds?: string[];
    }
  | { ok: true; queued: true; templateId: string }
  | { ok: false; error: string };
