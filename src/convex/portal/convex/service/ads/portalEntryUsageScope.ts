import type { Id } from "../../_generated/dataModel";
import { isTownLeagueScopeKey } from "../../data/portalLeagueScope";
import type { PortalQuotaScope } from "../../data/portalQuotaScope";

export type PlayEntryContext = {
  lobbyId?: Id<"portal_lobbies"> | null;
  tournamentId?: string | null;
  /** Town ad/ticket/solo-success partition — not shared with Lobby. */
  scopeKey?: string | null;
};

export type EntryUsageBucket = {
  lobbyId?: Id<"portal_lobbies">;
  tournamentId?: string;
  scopeKey?: string;
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
  const scopeKey = entryCtx?.scopeKey?.trim() || undefined;
  if (scopeKey && isTownLeagueScopeKey(scopeKey)) {
    return { scopeKey };
  }
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

/** Town free-play counts only town-opened rows; Lobby counts exclude town. */
export function playCountsTowardEntryScope(
  joinLeagueScopeKey: string | null | undefined,
  scopeKey?: string | null
): boolean {
  const joinKey = joinLeagueScopeKey?.trim() || undefined;
  const want = scopeKey?.trim() || undefined;
  if (want && isTownLeagueScopeKey(want)) {
    return joinKey === want;
  }
  return !isTownLeagueScopeKey(joinKey);
}

export function usageRowMatchesBucket(
  row: {
    lobbyId?: Id<"portal_lobbies">;
    tournamentId?: string;
    scopeKey?: string;
  },
  bucket: EntryUsageBucket
): boolean {
  const rowScope = row.scopeKey ?? undefined;
  const wantScope = bucket.scopeKey ?? undefined;
  if (wantScope || rowScope) {
    return rowScope === wantScope;
  }
  const rowLobby = row.lobbyId ?? undefined;
  const rowTournament = row.tournamentId?.trim() || undefined;
  const wantLobby = bucket.lobbyId ?? undefined;
  const wantTournament = bucket.tournamentId?.trim() || undefined;
  return rowLobby === wantLobby && rowTournament === wantTournament;
}
