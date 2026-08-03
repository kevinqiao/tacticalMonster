/**
 * SSO SoT helpers for partner.data.lobbyOpsMode.
 * Portal SoT seeded via portalGcOpsBridge (partner-gc-ops-settings).
 */

export type LobbyOpsMode = "isolated" | "shared";

export const DEFAULT_LEGACY_LOBBY_OPS_MODE: LobbyOpsMode = "shared";
export const DEFAULT_NEW_PARTNER_LOBBY_OPS_MODE: LobbyOpsMode = "isolated";

export function normalizeLobbyOpsMode(raw: unknown): LobbyOpsMode | undefined {
  if (raw === "isolated" || raw === "shared") return raw;
  return undefined;
}

export function resolveLobbyOpsMode(raw: unknown): LobbyOpsMode {
  return normalizeLobbyOpsMode(raw) ?? DEFAULT_LEGACY_LOBBY_OPS_MODE;
}

export function readLobbyOpsModeFromPartnerData(
  data: Record<string, unknown> | null | undefined
): LobbyOpsMode | null {
  return normalizeLobbyOpsMode(data?.lobbyOpsMode) ?? null;
}

export function applyLobbyOpsModeToPartnerData(
  data: Record<string, unknown>,
  mode: LobbyOpsMode | null | undefined
): Record<string, unknown> {
  const next = { ...data };
  if (mode === undefined) return next;
  if (mode === null) {
    delete next.lobbyOpsMode;
    return next;
  }
  next.lobbyOpsMode = mode;
  return next;
}
