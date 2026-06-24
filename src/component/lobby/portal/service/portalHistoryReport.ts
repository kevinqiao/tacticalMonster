import type { CasualAsyncTableSummaryUI } from "@/component/battle/games/shared/casualAsyncTableSummaryUI";
import { casualTableSummaryHasReplay } from "@/component/battle/games/shared/casualAsyncTableSummaryUI";

import type { PortalGameHistoryRow } from "./usePortalManager";

export type PortalWatchGameType = "match_3" | "solitaire" | "block_blast" | "yatz";

export function portalHistoryTableSummary(
  row: Pick<PortalGameHistoryRow, "tableSummary">
): CasualAsyncTableSummaryUI | null {
  const raw = row.tableSummary;
  if (!raw || typeof raw !== "object") return null;
  const summary = raw as CasualAsyncTableSummaryUI;
  if (!Array.isArray(summary.rows) || summary.rows.length === 0) return null;
  return summary;
}

export function canOpenPortalHistoryReport(row: Pick<PortalGameHistoryRow, "tableSummary">): boolean {
  return portalHistoryTableSummary(row) != null;
}

export function portalHistoryReportHasReplay(row: Pick<PortalGameHistoryRow, "tableSummary">): boolean {
  return casualTableSummaryHasReplay(portalHistoryTableSummary(row));
}

export function portalWatchGameTypeForRow(gameType: string): PortalWatchGameType | null {
  if (gameType === "solitaire") return "solitaire";
  if (gameType === "block_blast") return "block_blast";
  if (gameType === "yatz") return "yatz";
  if (gameType === "match_3") return "match_3";
  return null;
}
