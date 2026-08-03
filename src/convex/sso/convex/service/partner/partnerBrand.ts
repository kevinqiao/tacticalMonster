import { v } from "convex/values";

/** Shared theme shape (aligned with Campaign themeJsonValidator). */
export const partnerThemeJsonValidator = v.object({
  version: v.number(),
  sourceUrl: v.optional(v.string()),
  mode: v.union(v.literal("light"), v.literal("dark")),
  brand: v.object({
    primary: v.string(),
    onPrimary: v.string(),
    background: v.string(),
    surface: v.string(),
    text: v.string(),
    textMuted: v.string(),
    fontFamily: v.string(),
    radiusMd: v.string(),
  }),
  shell: v.object({
    ctaBg: v.string(),
    ctaText: v.string(),
    headerBg: v.string(),
    posterFrameRadius: v.string(),
  }),
  assets: v.optional(
    v.object({
      logoUrl: v.optional(v.string()),
    })
  ),
});

export type PartnerThemeJson = {
  version: number;
  sourceUrl?: string;
  mode: "light" | "dark";
  brand: {
    primary: string;
    onPrimary: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    fontFamily: string;
    radiusMd: string;
  };
  shell: {
    ctaBg: string;
    ctaText: string;
    headerBg: string;
    posterFrameRadius: string;
  };
  assets?: { logoUrl?: string };
};

export type PartnerBrand = {
  sourceUrl?: string;
  themeVersion?: number;
  theme?: PartnerThemeJson;
  logoUrl?: string;
  updatedAt?: number;
};

type PartnerBrandRow = {
  host?: string | null;
  brand?: PartnerBrand | null;
  brandDraft?: PartnerThemeJson | null;
  data?: unknown;
};

function legacyBranding(data: unknown): { logoUrl?: string; primaryColor?: string } {
  if (!data || typeof data !== "object") return {};
  const branding = (data as { branding?: unknown }).branding;
  if (!branding || typeof branding !== "object") return {};
  const b = branding as { logoUrl?: unknown; primaryColor?: unknown };
  return {
    logoUrl: typeof b.logoUrl === "string" ? b.logoUrl.trim() || undefined : undefined,
    primaryColor:
      typeof b.primaryColor === "string" ? b.primaryColor.trim() || undefined : undefined,
  };
}

/** Seed a minimal theme from legacy primaryColor when no theme published yet. */
export function themeFromPrimaryColor(
  primary: string,
  sourceUrl?: string
): PartnerThemeJson {
  const p = primary.trim() || "#2563eb";
  return {
    version: 1,
    sourceUrl,
    mode: "light",
    brand: {
      primary: p,
      onPrimary: "#ffffff",
      background: "#fafafa",
      surface: "#ffffff",
      text: "#1a1a1a",
      textMuted: "rgba(26,26,26,0.62)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      radiusMd: "12px",
    },
    shell: {
      ctaBg: p,
      ctaText: "#ffffff",
      headerBg: "rgba(255,255,255,0.92)",
      posterFrameRadius: "16px",
    },
  };
}

/** Resolve published brand with legacy data.branding seed (read path only). */
export function resolvePartnerBrand(partner: PartnerBrandRow): {
  host: string;
  brand: PartnerBrand;
  brandDraft: PartnerThemeJson | null;
  seededFromLegacy: boolean;
} {
  const host = (partner.host ?? "").trim();
  const legacy = legacyBranding(partner.data);
  const existing = partner.brand ?? {};
  let seededFromLegacy = false;

  let theme = existing.theme;
  let logoUrl = existing.logoUrl?.trim() || undefined;
  let sourceUrl = existing.sourceUrl?.trim() || host || undefined;

  if (!logoUrl && legacy.logoUrl) {
    logoUrl = legacy.logoUrl;
    seededFromLegacy = true;
  }
  if (!theme && legacy.primaryColor) {
    theme = themeFromPrimaryColor(legacy.primaryColor, sourceUrl);
    seededFromLegacy = true;
  }
  if (theme?.assets?.logoUrl && !logoUrl) {
    logoUrl = theme.assets.logoUrl.trim() || undefined;
  }

  return {
    host,
    brand: {
      sourceUrl,
      themeVersion: existing.themeVersion,
      theme,
      logoUrl,
      updatedAt: existing.updatedAt,
    },
    brandDraft: partner.brandDraft ?? null,
    seededFromLegacy,
  };
}

export function stripLegacyBrandingFromData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...data };
  delete next.branding;
  delete next.defaultLandingPath;
  delete next.websiteUrl;
  return next;
}
