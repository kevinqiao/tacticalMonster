import type { CasualAsyncTableSummaryUI } from "@/component/battle/games/shared/casualAsyncTableSummaryUI";
import { casualTableSummaryHasReplay } from "@/component/battle/games/shared/casualAsyncTableSummaryUI";
import {
  isCasualSoloP75ChallengeTemplate,
  type CasualGameScoreReportUI,
} from "@/component/battle/games/shared/casualGameScoreReportUI";
import i18n from "@/i18n";

import {
  isValidPortalGameType,
  portalGameDisplayName,
  type PortalGameHistoryRow,
} from "./usePortalManager";

export type PortalWatchGameType = "match_3" | "solitaire" | "block_blast" | "yatz";

export function isPortalHistorySoloChallenge(
  row: Pick<PortalGameHistoryRow, "matchType" | "tournamentId">
): boolean {
  return (
    row.matchType === "solo_p75" ||
    isCasualSoloP75ChallengeTemplate(row.tournamentId)
  );
}

export function portalHistoryTableSummary(
  row: Pick<PortalGameHistoryRow, "tableSummary">
): CasualAsyncTableSummaryUI | null {
  const raw = row.tableSummary;
  if (!raw || typeof raw !== "object") return null;
  const summary = raw as CasualAsyncTableSummaryUI;
  if (!Array.isArray(summary.rows) || summary.rows.length === 0) return null;
  return summary;
}

export function canOpenPortalHistoryReport(
  row: Pick<
    PortalGameHistoryRow,
    "tableSummary" | "matchType" | "tournamentId" | "score"
  >
): boolean {
  if (isPortalHistorySoloChallenge(row)) {
    return row.score != null || portalHistoryTableSummary(row) != null;
  }
  return portalHistoryTableSummary(row) != null;
}

export function portalHistoryReportHasReplay(
  row: Pick<PortalGameHistoryRow, "tableSummary">
): boolean {
  return casualTableSummaryHasReplay(portalHistoryTableSummary(row));
}

/** History 战报：单人挑战与局内结算一致（是否达标，非名次表）。 */
export function buildPortalHistorySoloScoreReport(
  row: Pick<
    PortalGameHistoryRow,
    | "gameType"
    | "title"
    | "score"
    | "seedScoreThreshold"
    | "challengeSuccess"
  >
): CasualGameScoreReportUI {
  const score = row.score ?? 0;
  const target = row.seedScoreThreshold;
  const success =
    typeof row.challengeSuccess === "boolean"
      ? row.challengeSuccess
      : target != null
        ? score >= target
        : undefined;
  const gameLabel = isValidPortalGameType(row.gameType)
    ? portalGameDisplayName(row.gameType)
    : row.title;
  return {
    gameLabel,
    lines: [
      {
        label: i18n.t("scoreReport.matchScore", { ns: "shared.casual" }),
        value: score,
      },
    ],
    totalScore: score,
    ...(target != null && success != null
      ? {
          challenge: {
            targetScore: target,
            achievedScore: score,
            success,
          },
        }
      : {}),
  };
}

export function portalHistorySoloWatchContext(
  row: Pick<PortalGameHistoryRow, "tableSummary">
) {
  const summary = portalHistoryTableSummary(row);
  return summary?.rows.find((r) => r.isYou)?.watchContext ?? null;
}

export function portalWatchGameTypeForRow(gameType: string): PortalWatchGameType | null {
  if (gameType === "solitaire") return "solitaire";
  if (gameType === "block_blast") return "block_blast";
  if (gameType === "yatz") return "yatz";
  if (gameType === "match_3") return "match_3";
  return null;
}
