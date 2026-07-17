/**
 * Partner portal/campaign game allowlist helpers.
 * Catalog: keep aligned with portal partnerGameRegistry PARTNER_GAME_TYPES.
 * DB: partner.games (top-level). Caps portal URLs and merchant campaign gameType.
 */

export const PARTNER_GAME_TYPES = [
  "solitaire",
  "block_blast",
  "match_3",
  "tower_arena",
  "yatz",
] as const;

export type PartnerGameType = (typeof PARTNER_GAME_TYPES)[number];

export const PARTNER_GAME_LABELS: Record<PartnerGameType, string> = {
  solitaire: "Solitaire",
  block_blast: "Block Blast",
  match_3: "Match-3",
  tower_arena: "Tower Arena",
  yatz: "Yatz",
};

const PORTAL_KEY_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;

export function normalizePortalKey(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isRegisteredPartnerGameType(value: string): value is PartnerGameType {
  return (PARTNER_GAME_TYPES as readonly string[]).includes(value);
}

export function validatePortalKey(key: string): string {
  const normalized = normalizePortalKey(key);
  if (!normalized) throw new Error("portal_key_required");
  if (!PORTAL_KEY_RE.test(normalized)) throw new Error("portal_key_invalid");
  if (isRegisteredPartnerGameType(normalized)) throw new Error("portal_key_conflicts_game_type");
  return normalized;
}

export function sanitizePartnerGames(games: string[]): PartnerGameType[] {
  const out: PartnerGameType[] = [];
  for (const g of games) {
    const trimmed = g.trim();
    if (!trimmed) continue;
    if (!isRegisteredPartnerGameType(trimmed)) throw new Error("portal_game_invalid");
    if (!out.includes(trimmed)) out.push(trimmed);
  }
  if (out.length === 0) throw new Error("portal_games_required");
  return out;
}

/** partner.games; unset/empty → full registry (all enabled). */
export function readPartnerGames(partner: {
  games?: string[] | null;
}): PartnerGameType[] {
  const games = partner.games;
  if (!Array.isArray(games) || games.length === 0) return [...PARTNER_GAME_TYPES];
  return games.filter((g): g is PartnerGameType => typeof g === "string" && isRegisteredPartnerGameType(g));
}

export function isGameEnabledForPartner(
  partner: { games?: string[] | null },
  gameType: string
): boolean {
  return readPartnerGames(partner).includes(gameType as PartnerGameType);
}
