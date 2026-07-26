import type { Id } from "../../_generated/dataModel";
import type { PortalQuotaScope } from "../../data/portalQuotaScope";

export type PlayEntryContext = {
  lobbyId?: Id<"portal_lobbies"> | null;
  tournamentId?: string | null;
};

export type EntryUsageBucket = {
  lobbyId?: Id<"portal_lobbies">;
  tournamentId?: string;
};

/**
 * Map quotaScope + join context → which lobby/tournament fields to store on
 * ad/ticket daily usage rows. Free-play counting uses the same scope rules
 * separately (see countPortalPlaysForQuotaScope).
 */
export function entryUsageBucketForScope(
  quotaScope: PortalQuotaScope,
  entryCtx?: PlayEntryContext | null
): EntryUsageBucket {
  const lobbyId = entryCtx?.lobbyId ?? undefined;
  const tournamentId = entryCtx?.tournamentId?.trim() || undefined;
  if (quotaScope === "tournament" && tournamentId) {
    return {
      ...(lobbyId ? { lobbyId } : {}),
      tournamentId,
    };
  }
  if ((quotaScope === "lobby" || quotaScope === "mode") && lobbyId) {
    // mode-in-lobby and lobby: both key ad/ticket usage by lobby (+ mode column)
    return { lobbyId };
  }
  return {};
}

export function usageRowMatchesBucket(
  row: { lobbyId?: Id<"portal_lobbies">; tournamentId?: string },
  bucket: EntryUsageBucket
): boolean {
  const rowLobby = row.lobbyId ?? undefined;
  const rowTournament = row.tournamentId?.trim() || undefined;
  const wantLobby = bucket.lobbyId ?? undefined;
  const wantTournament = bucket.tournamentId?.trim() || undefined;
  return rowLobby === wantLobby && rowTournament === wantTournament;
}
