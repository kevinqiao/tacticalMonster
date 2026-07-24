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
}): PartnerCapabilities {
  const caps = partner.capabilities;
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
}): boolean {
  return readPartnerCapabilities(partner).portalGames;
}

export function partnerHasCampaignOps(partner: {
  capabilities?: { portalGames?: boolean; campaignOps?: boolean } | null;
}): boolean {
  return readPartnerCapabilities(partner).campaignOps;
}

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;

/** Reserved under `/cc/{slug}` — must not be partner public slugs. */
const RESERVED_CAMPAIGN_PARTNER_SLUGS = new Set(["home", "merchant"]);

export function normalizePartnerSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Validate public campaign slug; empty → undefined (cleared). */
export function validatePartnerSlug(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const normalized = normalizePartnerSlug(raw);
  if (!normalized) return undefined;
  if (!SLUG_RE.test(normalized)) throw new Error("slug_invalid");
  if (RESERVED_CAMPAIGN_PARTNER_SLUGS.has(normalized)) throw new Error("slug_reserved");
  return normalized;
}
