import { getPortalTournamentDefinition } from "@/convex/portal/convex/data/portalTournamentConfigs";
import type { RegisteredPartnerGameType } from "@/convex/portal/convex/data/partnerGameRegistry";
import i18n from "@/i18n";

import {
  assignmentMatchesAwaitWatch,
  type CasualGameKind,
  type OpenCasualRunAssignment,
} from "../../casual/service/casualOpenRunAssignment";

export type CampaignAwaitOpenRunWatch = {
  templateId: string;
  gameKind: CasualGameKind;
  campaignId: string;
};
import { isOpenCasualRunExpired } from "../../casual/service/casualOpenRunReconcile";
import type { PortalMatchQueueEntry } from "./usePortalManager";

export function portalAssignmentMatchesGameType(
  a: OpenCasualRunAssignment,
  gameType: RegisteredPartnerGameType
): boolean {
  if (a.gameType === gameType) return true;
  const def = getPortalTournamentDefinition(a.templateId);
  return def?.gameType === gameType;
}

export function pickPortalOpenAssignmentsForGameType(
  assigns: OpenCasualRunAssignment[],
  gameType: RegisteredPartnerGameType
): OpenCasualRunAssignment[] {
  return assigns
    .filter((a) => portalAssignmentMatchesGameType(a, gameType))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** 排除已超时、待后台 force-end 结算的 open run */
export function pickActivePortalOpenAssignmentsForGameType(
  assigns: OpenCasualRunAssignment[],
  gameType: RegisteredPartnerGameType
): OpenCasualRunAssignment[] {
  return pickPortalOpenAssignmentsForGameType(assigns, gameType).filter(
    (a) => !isOpenCasualRunExpired(a)
  );
}

export function portalMatchTypeLabel(templateId: string): string {
  const def = getPortalTournamentDefinition(templateId);
  if (def?.matchType === "solo_p75") {
    return i18n.t("history.matchTypes.solo_p75", { ns: "portal.player" });
  }
  if (def?.matchType === "multi_ranked") {
    if (def.entry.kind === "coins") {
      return i18n.t("history.matchTypes.multi_ranked_coin", { ns: "portal.player" });
    }
    return i18n.t("history.matchTypes.multi_ranked", { ns: "portal.player" });
  }
  if (templateId === "solo_p75") {
    return i18n.t("history.matchTypes.solo_p75", { ns: "portal.player" });
  }
  if (templateId === "multi_ranked") {
    return i18n.t("history.matchTypes.multi_ranked", { ns: "portal.player" });
  }
  return templateId;
}

export function portalHasOpenAssignmentForMode(
  assigns: OpenCasualRunAssignment[],
  gameType: RegisteredPartnerGameType,
  mode: "solo" | "multi"
): boolean {
  const matchType = mode === "solo" ? "solo_p75" : "multi_ranked";
  return pickPortalOpenAssignmentsForGameType(assigns, gameType).some(
    (a) => getPortalTournamentDefinition(a.templateId)?.matchType === matchType
  );
}

export function pickPortalOpenAssignmentForMode(
  assigns: OpenCasualRunAssignment[],
  gameType: RegisteredPartnerGameType,
  mode: "solo" | "multi"
): OpenCasualRunAssignment | undefined {
  const matchType = mode === "solo" ? "solo_p75" : "multi_ranked";
  return pickPortalOpenAssignmentsForGameType(assigns, gameType).find(
    (a) => getPortalTournamentDefinition(a.templateId)?.matchType === matchType
  );
}

/** 仅恢复属于指定活动的 open run（排除超时对局） */
export function pickPortalOpenAssignmentForCampaignMode(
  assigns: OpenCasualRunAssignment[],
  gameType: RegisteredPartnerGameType,
  mode: "solo" | "multi",
  campaignId: string
): OpenCasualRunAssignment | undefined {
  const matchType = mode === "solo" ? "solo_p75" : "multi_ranked";
  return pickActivePortalOpenAssignmentsForGameType(assigns, gameType).find(
    (a) =>
      a.campaignId === campaignId &&
      getPortalTournamentDefinition(a.templateId)?.matchType === matchType
  );
}

/** `joinTournament` 返回 queued 后，等待属于该活动的 open run */
export function findCampaignAwaitOpenAssignment(
  assigns: OpenCasualRunAssignment[],
  watch: CampaignAwaitOpenRunWatch
): OpenCasualRunAssignment | undefined {
  return assigns.find(
    (a) =>
      a.campaignId === watch.campaignId &&
      assignmentMatchesAwaitWatch(a, watch)
  );
}

export function pickPortalMatchQueueForGameType(
  entries: PortalMatchQueueEntry[],
  gameType: RegisteredPartnerGameType
): PortalMatchQueueEntry[] {
  return entries.filter((e) => {
    const def = getPortalTournamentDefinition(e.templateId);
    return def?.gameType === gameType && def.matchType === "multi_ranked";
  });
}
