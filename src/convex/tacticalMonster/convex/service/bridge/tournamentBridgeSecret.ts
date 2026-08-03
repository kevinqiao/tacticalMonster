const DEV_TOURNAMENT_BRIDGE_SECRET = "dev-local-tournament-bridge";

export function tournamentBridgeSecret(): string {
  const s =
    process.env.TOURNAMENT_BRIDGE_SECRET ??
    process.env.GAME_BRIDGE_SECRET ??
    process.env.PORTAL_GAME_BRIDGE_SECRET;
  if (typeof s === "string" && s.trim().length > 0) {
    return s.trim();
  }
  return DEV_TOURNAMENT_BRIDGE_SECRET;
}

export const TOURNAMENT_BRIDGE_HEADER = "X-Tournament-Bridge-Secret";

export function tournamentBridgeHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    [TOURNAMENT_BRIDGE_HEADER]: tournamentBridgeSecret(),
    ...extra,
  };
}
