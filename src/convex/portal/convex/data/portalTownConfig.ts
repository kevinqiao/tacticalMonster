/** Partner town URL segment; matches TownPlace nav name. */
export const DEFAULT_TOWN_SLUG = "mayfield";

export const DEFAULT_TOWN_TEMPLATE_ID = "mayfield_standard";
export const DEFAULT_TOWN_TITLE = "Mayfield";

const TOWN_SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;

export type PortalTownBranding = {
  logoUrl?: string;
  titleOverride?: string;
  mapThemeId?: string;
};

export function validateTownSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (!TOWN_SLUG_RE.test(normalized)) {
    throw new Error("invalid_town_slug");
  }
  return normalized;
}

export function resolveTownBranding(
  branding: PortalTownBranding | null | undefined,
  fallbackTitle: string
): PortalTownBranding & { displayTitle: string } {
  const titleOverride = branding?.titleOverride?.trim() || undefined;
  return {
    logoUrl: branding?.logoUrl,
    mapThemeId: branding?.mapThemeId,
    titleOverride,
    displayTitle: titleOverride ?? fallbackTitle,
  };
}
