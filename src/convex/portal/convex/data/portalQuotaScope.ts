/**
 * How free / ad / ticket daily pools are shared inside a lobby (or partner default).
 *
 * - mode: one pool per solo|multi (across tournaments / gameTypes in scope)
 * - lobby: one free pool for the whole lobby (all modes + tournaments);
 *          ad/ticket caps stay per-mode but usage is lobby-scoped
 * - tournament: each tournament template has its own pool
 */
export type PortalQuotaScope = "mode" | "lobby" | "tournament";

export const PORTAL_QUOTA_SCOPES = ["mode", "lobby", "tournament"] as const;

export function normalizePortalQuotaScope(
  raw: unknown
): PortalQuotaScope | undefined {
  if (raw === "mode" || raw === "lobby" || raw === "tournament") return raw;
  return undefined;
}

/** Default when unset: share by solo/multi (current product default). */
export function resolvePortalQuotaScope(
  raw: unknown
): PortalQuotaScope {
  return normalizePortalQuotaScope(raw) ?? "mode";
}
