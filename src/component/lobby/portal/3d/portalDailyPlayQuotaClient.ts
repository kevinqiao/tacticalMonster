import {
  CASUAL_TASK_OPS_TIME_ZONE,
  dailyWindowMsForOpsZone,
} from "@/convex/portal/convex/utils/casualTaskPeriod";
import {
  getPortalTournamentDefinition,
  portalTournamentIdForMode,
} from "@/convex/portal/convex/data/portalTournamentConfigs";
import type { OpenCasualRunAssignment } from "../../casual/service/casualOpenRunAssignment";
import type { PortalGameHistoryRow } from "../service/usePortalManager";

/** 从已订阅的战绩 / 进行中对局统计今日场次（与 lobby 刷新同源，挑战后会立刻变）。 */
export function countPortalModePlaysToday(args: {
  gameHistory: PortalGameHistoryRow[];
  openAssignments: OpenCasualRunAssignment[];
  gameType: string;
  mode: "solo" | "multi";
  nowMs?: number;
}): number {
  const matchType = args.mode === "solo" ? "solo_p75" : "multi_ranked";
  const expectedTemplateId = portalTournamentIdForMode(args.gameType, args.mode);
  const { startsAt, endsAt } = dailyWindowMsForOpsZone(
    args.nowMs ?? Date.now(),
    CASUAL_TASK_OPS_TIME_ZONE
  );

  const counted = new Set<string>();
  for (const row of args.gameHistory) {
    if (row.campaignId) continue;
    if (row.gameType !== args.gameType) continue;
    const modeOk =
      row.matchType === matchType ||
      (expectedTemplateId != null && row.tournamentId === expectedTemplateId);
    if (!modeOk) continue;
    const at = row.runStartedAt ?? row.submittedAt ?? 0;
    if (at < startsAt || at > endsAt) continue;
    counted.add(row.runTournamentId ?? row.entryId);
  }

  for (const a of args.openAssignments) {
    if (a.campaignId) continue;
    if (a.gameType != null && a.gameType !== args.gameType) continue;
    const def = getPortalTournamentDefinition(a.templateId);
    const modeOk =
      (def != null &&
        def.gameType === args.gameType &&
        def.matchType === matchType) ||
      (expectedTemplateId != null && a.templateId === expectedTemplateId);
    if (!modeOk) continue;
    if (a.createdAt < startsAt || a.createdAt > endsAt) continue;
    counted.add(a.runTournamentId || a.gameId);
  }

  return counted.size;
}
