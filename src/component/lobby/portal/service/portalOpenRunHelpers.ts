import { getPortalTournamentDefinition } from "@/convex/portal/convex/data/portalTournamentConfigs";
import type { RegisteredPortalGameType } from "@/convex/portal/convex/data/portalGameRegistry";

import type { OpenCasualRunAssignment } from "../../casual/service/casualOpenRunAssignment";
import { isOpenCasualRunExpired } from "../../casual/service/casualOpenRunReconcile";
import type { PortalMatchQueueEntry } from "./usePortalManager";

export function portalAssignmentMatchesGameType(
  a: OpenCasualRunAssignment,
  gameType: RegisteredPortalGameType
): boolean {
  if (a.gameType === gameType) return true;
  const def = getPortalTournamentDefinition(a.templateId);
  return def?.gameType === gameType;
}

export function pickPortalOpenAssignmentsForGameType(
  assigns: OpenCasualRunAssignment[],
  gameType: RegisteredPortalGameType
): OpenCasualRunAssignment[] {
  return assigns
    .filter((a) => portalAssignmentMatchesGameType(a, gameType))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** 排除已超时、待后台 force-end 结算的 open run */
export function pickActivePortalOpenAssignmentsForGameType(
  assigns: OpenCasualRunAssignment[],
  gameType: RegisteredPortalGameType
): OpenCasualRunAssignment[] {
  return pickPortalOpenAssignmentsForGameType(assigns, gameType).filter(
    (a) => !isOpenCasualRunExpired(a)
  );
}

export function portalMatchTypeLabel(templateId: string): string {
  const def = getPortalTournamentDefinition(templateId);
  if (def?.matchType === "solo_p75") return "单人挑战";
  if (def?.matchType === "multi_ranked") return "多人竞技";
  return templateId;
}

export function portalHasOpenAssignmentForMode(
  assigns: OpenCasualRunAssignment[],
  gameType: RegisteredPortalGameType,
  mode: "solo" | "multi"
): boolean {
  const matchType = mode === "solo" ? "solo_p75" : "multi_ranked";
  return pickPortalOpenAssignmentsForGameType(assigns, gameType).some(
    (a) => getPortalTournamentDefinition(a.templateId)?.matchType === matchType
  );
}

export function pickPortalOpenAssignmentForMode(
  assigns: OpenCasualRunAssignment[],
  gameType: RegisteredPortalGameType,
  mode: "solo" | "multi"
): OpenCasualRunAssignment | undefined {
  const matchType = mode === "solo" ? "solo_p75" : "multi_ranked";
  return pickPortalOpenAssignmentsForGameType(assigns, gameType).find(
    (a) => getPortalTournamentDefinition(a.templateId)?.matchType === matchType
  );
}

export function pickPortalMatchQueueForGameType(
  entries: PortalMatchQueueEntry[],
  gameType: RegisteredPortalGameType
): PortalMatchQueueEntry[] {
  return entries.filter((e) => {
    const def = getPortalTournamentDefinition(e.templateId);
    return def?.gameType === gameType && def.matchType === "multi_ranked";
  });
}
