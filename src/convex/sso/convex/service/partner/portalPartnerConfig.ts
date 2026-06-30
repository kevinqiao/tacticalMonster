/** Keep aligned with portal portalGameRegistry PORTAL_GAME_TYPES. */
export const PORTAL_GAME_TYPES = [
  "solitaire",
  "block_blast",
  "match_3",
  "tower_arena",
  "yatz",
] as const;

export type PortalGameType = (typeof PORTAL_GAME_TYPES)[number];

const PORTAL_KEY_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;

export function normalizePortalKey(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isRegisteredPortalGameType(value: string): value is PortalGameType {
  return (PORTAL_GAME_TYPES as readonly string[]).includes(value);
}

export function validatePortalKey(key: string): string {
  const normalized = normalizePortalKey(key);
  if (!normalized) throw new Error("portal_key_required");
  if (!PORTAL_KEY_RE.test(normalized)) throw new Error("portal_key_invalid");
  if (isRegisteredPortalGameType(normalized)) throw new Error("portal_key_conflicts_game_type");
  return normalized;
}

export function sanitizePortalGames(games: string[]): PortalGameType[] {
  const out: PortalGameType[] = [];
  for (const g of games) {
    const trimmed = g.trim();
    if (!trimmed) continue;
    if (!isRegisteredPortalGameType(trimmed)) throw new Error("portal_game_invalid");
    if (!out.includes(trimmed)) out.push(trimmed);
  }
  if (out.length === 0) throw new Error("portal_games_required");
  return out;
}

export function readPortalGamesFromPartnerData(data: unknown): PortalGameType[] {
  if (!data || typeof data !== "object") return [...PORTAL_GAME_TYPES];
  const games = (data as { portalGames?: unknown }).portalGames;
  if (!Array.isArray(games) || games.length === 0) return [...PORTAL_GAME_TYPES];
  return games.filter((g): g is PortalGameType => typeof g === "string" && isRegisteredPortalGameType(g));
}
