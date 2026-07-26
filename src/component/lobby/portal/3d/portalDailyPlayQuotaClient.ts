import {
  CASUAL_TASK_OPS_TIME_ZONE,
  dailyWindowMsForOpsZone,
} from "@/convex/portal/convex/utils/casualTaskPeriod";
import {
  getPortalTournamentDefinition,
  portalTournamentUsesPlayEntryLadder,
} from "@/convex/portal/convex/data/portalTournamentConfigs";
import type { OpenCasualRunAssignment } from "../../casual/service/casualOpenRunAssignment";
import type { PortalGameHistoryRow } from "../service/usePortalManager";

function isPortalMatchType(matchType: string | null | undefined): boolean {
  return matchType === "solo_p75" || matchType === "multi_ranked";
}

/**
 * Count today's portal plays for a mode.
 * - `entryLadderOnly: true` (default): free/ad/ticket quota — excludes coin/gem tables.
 * - `entryLadderOnly: false`: home "Played N today" — includes all tables.
 */
export function countPortalModePlaysToday(args: {
  gameHistory: PortalGameHistoryRow[];
  openAssignments: OpenCasualRunAssignment[];
  mode: "solo" | "multi";
  /** When set, only count this tournament template. */
  templateId?: string;
  /** Lobby quotaScope: count solo+multi together. */
  allModes?: boolean;
  /**
   * When true (default), skip coin/gem entry templates (free→ad→ticket ladder).
   * When false, count every non-campaign play (home mode counter).
   */
  entryLadderOnly?: boolean;
  /** @deprecated Ignored — use templateId for per-tournament. */
  gameType?: string;
  nowMs?: number;
}): number {
  const entryLadderOnly = args.entryLadderOnly !== false;
  const matchType = args.mode === "solo" ? "solo_p75" : "multi_ranked";
  const templateId = args.templateId?.trim() || null;
  if (templateId && entryLadderOnly) {
    const scopeDef = getPortalTournamentDefinition(templateId);
    if (scopeDef && !portalTournamentUsesPlayEntryLadder(scopeDef)) return 0;
  }
  const { startsAt, endsAt } = dailyWindowMsForOpsZone(
    args.nowMs ?? Date.now(),
    CASUAL_TASK_OPS_TIME_ZONE
  );

  const counted = new Set<string>();
  for (const row of args.gameHistory) {
    if (row.campaignId) continue;
    if (!isPortalMatchType(row.matchType)) continue;
    if (!args.allModes && row.matchType !== matchType) continue;
    if (templateId && row.tournamentId !== templateId) continue;
    if (entryLadderOnly) {
      const rowDef = getPortalTournamentDefinition(row.tournamentId);
      if (rowDef && !portalTournamentUsesPlayEntryLadder(rowDef)) continue;
    }
    const at = row.runStartedAt ?? row.submittedAt ?? 0;
    if (at < startsAt || at > endsAt) continue;
    counted.add(row.runTournamentId ?? row.entryId);
  }

  for (const a of args.openAssignments) {
    if (a.campaignId) continue;
    const def = getPortalTournamentDefinition(a.templateId);
    if (!def || !isPortalMatchType(def.matchType)) continue;
    if (entryLadderOnly && !portalTournamentUsesPlayEntryLadder(def)) continue;
    if (!args.allModes && def.matchType !== matchType) continue;
    if (templateId && a.templateId !== templateId) continue;
    if (a.createdAt < startsAt || a.createdAt > endsAt) continue;
    counted.add(a.runTournamentId || a.gameId);
  }

  return counted.size;
}
