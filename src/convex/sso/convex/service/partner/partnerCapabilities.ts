/**
 * Partner capability flags — sole source of truth for Portal vs Campaign Ops.
 * Unset / missing → both false.
 */

export type PartnerCapabilities = {
  portalGames: boolean;
  campaignOps: boolean;
};

const DEFAULT_CAPABILITIES: PartnerCapabilities = {
  portalGames: false,
  campaignOps: false,
};

export function readPartnerCapabilities(partner: {
  capabilities?: { portalGames?: boolean; campaignOps?: boolean } | null;
} | null | undefined): PartnerCapabilities {
  const caps = partner?.capabilities;
  if (!caps || typeof caps !== "object") {
    return { ...DEFAULT_CAPABILITIES };
  }
  return {
    portalGames: caps.portalGames === true,
    campaignOps: caps.campaignOps === true,
  };
}

export function partnerHasPortalGames(partner: {
  capabilities?: { portalGames?: boolean; campaignOps?: boolean } | null;
} | null | undefined): boolean {
  return readPartnerCapabilities(partner).portalGames;
}

export function partnerHasCampaignOps(partner: {
  capabilities?: { portalGames?: boolean; campaignOps?: boolean } | null;
} | null | undefined): boolean {
  return readPartnerCapabilities(partner).campaignOps;
}

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;

/** Reserved under `/cc/{slug}` and `/gc/{slug}` — must not be partner public slugs. */
const RESERVED_PARTNER_SLUGS = new Set(["home", "merchant", "preview"]);

export function normalizePartnerSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Validate public partner slug for Portal `/gc/{slug}` and Campaign `/cc/{slug}`.
 * empty → undefined (cleared) when `required` is false (default).
 * Game-type ids (solitaire, …) are allowed — portal URLs are lobby-based.
 */
export function validatePartnerSlug(
  raw: string | undefined,
  opts?: { required?: boolean }
): string | undefined {
  if (raw === undefined) {
    if (opts?.required) throw new Error("slug_required");
    return undefined;
  }
  const normalized = normalizePartnerSlug(raw);
  if (!normalized) {
    if (opts?.required) throw new Error("slug_required");
    return undefined;
  }
  if (!SLUG_RE.test(normalized)) throw new Error("slug_invalid");
  if (RESERVED_PARTNER_SLUGS.has(normalized)) throw new Error("slug_reserved");
  return normalized;
}

/** Require a non-empty partner slug (Portal partner activation). */
export function requirePartnerSlug(raw: string | undefined): string {
  const slug = validatePartnerSlug(raw, { required: true });
  if (!slug) throw new Error("slug_required");
  return slug;
}
