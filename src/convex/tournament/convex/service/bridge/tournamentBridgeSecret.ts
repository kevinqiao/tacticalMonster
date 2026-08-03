const DEV_TOURNAMENT_BRIDGE_SECRET = "dev-local-tournament-bridge";

/** Shared secret for Convex-to-Convex HTTP calls into tournament (e.g. tacticalMonster proxy). */
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
