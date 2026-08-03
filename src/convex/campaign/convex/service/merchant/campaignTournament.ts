/**
 * Campaign play desk SoT = Portal tournamentId.
 * gameType / mode are derived from the tournament definition (not stored).
 */

import {
  getPortalTournamentDefinition,
  isJoinableCasualTournament,
  listPlayCasualTournaments,
  portalTournamentIdForMode,
  type PortalTournamentDefinition,
} from "../../../../portal/convex/data/portalTournamentConfigs";

export type CampaignPlayMode = "solo" | "multi";

export type ResolvedCampaignTournament = {
  tournamentId: string;
  gameType: string;
  mode: CampaignPlayMode;
  title: string;
  def: PortalTournamentDefinition;
};

export function matchTypeToCampaignMode(
  matchType: PortalTournamentDefinition["matchType"]
): CampaignPlayMode {
  return matchType === "multi_ranked" ? "multi" : "solo";
}

export function requireCampaignTournament(
  tournamentId: string
): ResolvedCampaignTournament {
  const id = tournamentId.trim();
  const def = getPortalTournamentDefinition(id);
  if (!def || !isJoinableCasualTournament(def)) {
    throw new Error("unknown_tournament");
  }
  return {
    tournamentId: id,
    gameType: def.gameType,
    mode: matchTypeToCampaignMode(def.matchType),
    title: def.title,
    def,
  };
}

/** Read path: prefer tournamentId; legacy gameType+mode → default free desk. */
export function resolveCampaignTournament(campaign: {
  tournamentId?: string | null;
  gameType?: string | null;
  mode?: CampaignPlayMode | string | null;
  experienceType?: string | null;
}): ResolvedCampaignTournament | null {
  if (campaign.experienceType === "display") return null;

  const rawId =
    typeof campaign.tournamentId === "string" ? campaign.tournamentId.trim() : "";
  if (rawId) {
    const def = getPortalTournamentDefinition(rawId);
    if (!def) return null;
    return {
      tournamentId: rawId,
      gameType: def.gameType,
      mode: matchTypeToCampaignMode(def.matchType),
      title: def.title,
      def,
    };
  }

  const gameType =
    typeof campaign.gameType === "string" ? campaign.gameType.trim() : "";
  const mode = campaign.mode === "multi" ? "multi" : "solo";
  if (!gameType || gameType.startsWith("_")) return null;
  const mapped = portalTournamentIdForMode(gameType, mode);
  if (!mapped) return null;
  const def = getPortalTournamentDefinition(mapped);
  if (!def) return null;
  return {
    tournamentId: mapped,
    gameType: def.gameType,
    mode: matchTypeToCampaignMode(def.matchType),
    title: def.title,
    def,
  };
}

export function listCampaignTournamentOptions(): Array<{
  tournamentId: string;
  title: string;
  gameType: string;
  mode: CampaignPlayMode;
  label: string;
}> {
  return listPlayCasualTournaments().map((t) => {
    const mode: CampaignPlayMode =
      t.matchType === "multi_ranked" ? "multi" : "solo";
    return {
      tournamentId: t.tournamentId,
      title: t.title,
      gameType: t.gameType,
      mode,
      label: `${t.title} · ${mode === "solo" ? "Solo" : "Multi"}`,
    };
  });
}

/** @deprecated Only for one-shot backfill of pre-tournamentId rows. */
export function legacyDefaultTournamentId(
  gameType: string,
  mode: CampaignPlayMode
): string | null {
  return portalTournamentIdForMode(gameType, mode);
}
