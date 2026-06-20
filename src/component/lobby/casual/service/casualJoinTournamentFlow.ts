import type { JoinCasualRunResult } from "@/convex/casualPlatform/convex/service/tournament/shared/casualTournamentTypes";

import { joinEntryErrorMessage } from "../view/shared/casualEconomyUi";

export type CasualJoinTournamentMutationResult = JoinCasualRunResult | null;

export type ResolvedJoinTournamentOutcome =
  | {
      kind: "ready";
      templateId: string;
      gameId: string;
      runTournamentId: string;
      matchId: string;
      vouchersCharged?: number;
      coinsCharged?: number;
      gemsCharged?: number;
    }
  | {
      kind: "queued";
      templateId: string;
      waitingForPeer: boolean;
      expiresAt?: number;
    }
  | { kind: "failed"; error: string };

/** 将 `joinTournament` 返回值规范为 ready / queued / failed（A/B/C / p75 / 专场共用） */
export function resolveJoinTournamentOutcome(
  result: CasualJoinTournamentMutationResult
): ResolvedJoinTournamentOutcome {
  if (!result || !result.ok) {
    return { kind: "failed", error: joinEntryErrorMessage(result?.error) };
  }
  if (result.queued) {
    return {
      kind: "queued",
      templateId: result.templateId,
      waitingForPeer: result.waitingForPeer,
      expiresAt: result.expiresAt,
    };
  }
  if (!result.gameId) {
    return { kind: "failed", error: joinEntryErrorMessage("join_failed") };
  }
  return {
    kind: "ready",
    templateId: result.templateId,
    gameId: result.gameId,
    runTournamentId: result.runTournamentId,
    matchId: result.matchId,
    vouchersCharged: result.vouchersCharged,
    coinsCharged: result.coinsCharged,
    gemsCharged: result.gemsCharged,
  };
}
