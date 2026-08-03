/**
 * Partner game catalog (static config).
 * All partners are fully open — Campaign/Portal gates are tournament/offering based,
 * not a per-partner games allowlist.
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

export function isRegisteredPartnerGameType(value: string): value is PartnerGameType {
  return (PARTNER_GAME_TYPES as readonly string[]).includes(value);
}

/** Full catalog for every partner (config SoT; no DB allowlist). */
export function readPartnerGames(_partner?: unknown): PartnerGameType[] {
  return [...PARTNER_GAME_TYPES];
}

/** @deprecated Prefer isRegisteredPartnerGameType — partners are not gated by games. */
export function isGameEnabledForPartner(
  _partner: unknown,
  gameType: string
): boolean {
  return isRegisteredPartnerGameType(gameType);
}
