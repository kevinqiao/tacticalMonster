/**
 * Partner-level lobby economy isolation.
 * - isolated: wallets / shop counters / ad-replay usage partitioned by lobby
 * - shared: partner-wide economy (legacy default when unset)
 *
 * Matchmaking and player_seeds are never partitioned by this flag.
 */

export type PortalLobbyOpsMode = "isolated" | "shared";

export const PORTAL_LOBBY_OPS_MODES = ["isolated", "shared"] as const;

/** Legacy / unset partners behave as shared (no balance mutation on deploy). */
export const DEFAULT_LEGACY_LOBBY_OPS_MODE: PortalLobbyOpsMode = "shared";

/** New partners created via Platform Admin default to isolated. */
export const DEFAULT_NEW_PARTNER_LOBBY_OPS_MODE: PortalLobbyOpsMode = "isolated";

export function normalizeLobbyOpsMode(raw: unknown): PortalLobbyOpsMode | undefined {
  if (raw === "isolated" || raw === "shared") return raw;
  return undefined;
}

export function resolveLobbyOpsMode(raw: unknown): PortalLobbyOpsMode {
  return normalizeLobbyOpsMode(raw) ?? DEFAULT_LEGACY_LOBBY_OPS_MODE;
}

export function economyScopeKey(
  mode: PortalLobbyOpsMode,
  lobbyId: string | null | undefined
): string {
  if (mode === "shared" || !lobbyId) return "shared";
  return `lobby:${lobbyId}`;
}
