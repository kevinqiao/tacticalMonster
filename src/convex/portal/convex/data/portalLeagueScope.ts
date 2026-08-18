import type { Id } from "../_generated/dataModel";

/** Competitive partition — not the wallet `scopeKey` (shared vs isolated). */
export type LeagueScopeKind = "town" | "lobby" | "game";

export type LeagueScope = {
  leagueScopeKey: string;
  kind: LeagueScopeKind;
  lobbyId?: Id<"portal_lobbies">;
  gameType?: string;
  townId?: string;
};

export function townLeagueScopeKey(townId: string): string {
  return `town:${townId}`;
}

export function lobbyLeagueScopeKey(lobbyId: string): string {
  return `lobby:${lobbyId}`;
}

export function gameLeagueScopeKey(gameType: string): string {
  return `game:${gameType}`;
}

export function isTownLeagueScopeKey(key: string | undefined | null): boolean {
  return Boolean(key && key.startsWith("town:"));
}

export function isLobbyLeagueScopeKey(key: string | undefined | null): boolean {
  return Boolean(key && key.startsWith("lobby:"));
}

export function isGameLeagueScopeKey(key: string | undefined | null): boolean {
  return Boolean(key && key.startsWith("game:"));
}

export function townIdFromLeagueScopeKey(key: string): string | undefined {
  return key.startsWith("town:") ? key.slice("town:".length) || undefined : undefined;
}

export function lobbyIdFromLeagueScopeKey(key: string): Id<"portal_lobbies"> | undefined {
  if (!key.startsWith("lobby:")) return undefined;
  const id = key.slice("lobby:".length);
  return id ? (id as Id<"portal_lobbies">) : undefined;
}

export function gameTypeFromLeagueScopeKey(key: string): string | undefined {
  return key.startsWith("game:") ? key.slice("game:".length) || undefined : undefined;
}

export function parseLeagueScopeKey(key: string): LeagueScope {
  if (isTownLeagueScopeKey(key)) {
    return { leagueScopeKey: key, kind: "town", townId: townIdFromLeagueScopeKey(key) };
  }
  if (isLobbyLeagueScopeKey(key)) {
    return { leagueScopeKey: key, kind: "lobby", lobbyId: lobbyIdFromLeagueScopeKey(key) };
  }
  if (isGameLeagueScopeKey(key)) {
    return { leagueScopeKey: key, kind: "game", gameType: gameTypeFromLeagueScopeKey(key) };
  }
  return { leagueScopeKey: key, kind: "game" };
}

export function resolveLeagueScope(args: {
  lobbyId?: Id<"portal_lobbies"> | null;
  gameType?: string | null;
  leagueScopeKey?: string | null;
}): LeagueScope | null {
  if (args.leagueScopeKey) {
    const parsed = parseLeagueScopeKey(args.leagueScopeKey);
    if (parsed.kind === "lobby" && !parsed.lobbyId && args.lobbyId) {
      return { ...parsed, lobbyId: args.lobbyId };
    }
    if (parsed.kind === "game" && !parsed.gameType && args.gameType) {
      return { ...parsed, gameType: args.gameType };
    }
    return parsed;
  }
  if (args.lobbyId) {
    return {
      leagueScopeKey: lobbyLeagueScopeKey(args.lobbyId),
      kind: "lobby",
      lobbyId: args.lobbyId,
    };
  }
  if (args.gameType) {
    return {
      leagueScopeKey: gameLeagueScopeKey(args.gameType),
      kind: "game",
      gameType: args.gameType,
    };
  }
  return null;
}

export function leagueScopeDisplaySlug(scope: LeagueScope): string {
  if (scope.kind === "town") return "town";
  if (scope.kind === "game") return scope.gameType ?? "game";
  return "lobby";
}

export function isLobbyLeagueScope(
  scope: LeagueScope
): scope is LeagueScope & { kind: "lobby"; lobbyId: Id<"portal_lobbies"> } {
  return scope.kind === "lobby" && Boolean(scope.lobbyId);
}

/** @deprecated All resolved scopes are key-scoped. Prefer `scope.leagueScopeKey`. */
export function isKeyLeagueScope(scope: LeagueScope): boolean {
  return Boolean(scope.leagueScopeKey);
}
