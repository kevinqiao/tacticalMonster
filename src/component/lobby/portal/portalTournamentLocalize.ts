import i18n from "@/i18n";

const PORTAL_PLAYER_NS = "portal.player";

/**
 * Shared portal tournament copy via `tournaments.{tournamentId}.title`.
 * Partner `titleOverride` skips shared keys (custom ops copy).
 */
export function localizePortalTournamentTitle(
  tournamentId: string,
  fallback: string,
  titleOverride?: string | null
): string {
  const override = titleOverride?.trim();
  if (override) return override;
  const key = `tournaments.${tournamentId}.title`;
  return i18n.exists(key, { ns: PORTAL_PLAYER_NS })
    ? i18n.t(key, { ns: PORTAL_PLAYER_NS })
    : fallback;
}
