"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { action } from "../../_generated/server";
import { authedAction } from "../../custom/session";

const DEV_BOOTSTRAP_SECRET = "dev-local-platform-bootstrap";

function assertBootstrapSecret(provided: string) {
  const secret = process.env.PLATFORM_BOOTSTRAP_SECRET?.trim() || DEV_BOOTSTRAP_SECRET;
  if (provided !== secret) {
    throw new Error("forbidden");
  }
}

function parseHexColor(input: string | undefined): string | null {
  if (!input) return null;
  const m = input.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return null;
  return input.trim();
}

function extractMetaThemeColor(html: string): string | null {
  const m = html.match(
    /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i
  );
  return m?.[1] ? parseHexColor(m[1]) ?? m[1] : null;
}

function extractFontFamily(html: string): string {
  const gf = html.match(/fonts\.googleapis\.com\/css2?\?family=([^"&:]+)/i);
  if (gf?.[1]) {
    return decodeURIComponent(gf[1].replace(/\+/g, " ")) + ", system-ui, sans-serif";
  }
  return "system-ui, -apple-system, sans-serif";
}

function buildThemeFromExtract(sourceUrl: string, primary: string) {
  return {
    version: 1,
    sourceUrl,
    mode: "light" as const,
    brand: {
      primary,
      onPrimary: "#ffffff",
      background: "#fafafa",
      surface: "#ffffff",
      text: "#1a1a1a",
      textMuted: "rgba(26,26,26,0.62)",
      fontFamily: "system-ui, sans-serif",
      radiusMd: "12px",
    },
    shell: {
      ctaBg: primary,
      ctaText: "#ffffff",
      headerBg: "rgba(255,255,255,0.92)",
      posterFrameRadius: "16px",
    },
  };
}

function isAllowedSourceUrl(url: string): boolean {
  if (url.startsWith("https://")) return true;
  return /^http:\/\/localhost(:\d+)?(\/|$)/i.test(url);
}

/**
 * Sync theme from partner website URL into SSO brandDraft.
 * Persists host + brand.sourceUrl from the same URL.
 */
export const syncPartnerBrandFromUrl = authedAction({
  args: {
    partnerId: v.number(),
    sourceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.service.partner.partnerBrandAdmin.assertPartnerBrandAdmin, {
      actorUid: ctx.identity.subject,
      partnerId: args.partnerId,
      minRole: "admin",
    });

    const url = args.sourceUrl.trim();
    if (!isAllowedSourceUrl(url)) {
      return { ok: false as const, error: "https_required" as const };
    }

    let html = "";
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "TacticalMonster-PartnerBrandSync/1.0" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) {
        return { ok: false as const, error: "fetch_failed" as const };
      }
      html = await res.text();
    } catch {
      return { ok: false as const, error: "fetch_failed" as const };
    }

    const themeColor = extractMetaThemeColor(html) ?? "#2563eb";
    const fontFamily = extractFontFamily(html);
    const draft = buildThemeFromExtract(url, themeColor);
    draft.brand.fontFamily = fontFamily;
    draft.shell.ctaBg = themeColor;

    await ctx.runMutation(internal.service.partner.partnerBrandAdmin.savePartnerBrandDraft, {
      partnerId: args.partnerId,
      host: url,
      themeDraft: draft,
    });

    return { ok: true as const, themeDraft: draft };
  },
});

/** Ops CLI: brand sync with bootstrap secret (no interactive admin session). */
export const syncPartnerBrandFromUrlOps = action({
  args: {
    bootstrapSecret: v.string(),
    partnerId: v.number(),
    sourceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    assertBootstrapSecret(args.bootstrapSecret);

    const url = args.sourceUrl.trim();
    if (!isAllowedSourceUrl(url)) {
      return { ok: false as const, error: "https_required" as const };
    }

    let html = "";
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "TacticalMonster-PartnerBrandSync/1.0" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) {
        return { ok: false as const, error: "fetch_failed" as const };
      }
      html = await res.text();
    } catch {
      return { ok: false as const, error: "fetch_failed" as const };
    }

    const themeColor = extractMetaThemeColor(html) ?? "#2563eb";
    const fontFamily = extractFontFamily(html);
    const draft = buildThemeFromExtract(url, themeColor);
    draft.brand.fontFamily = fontFamily;
    draft.shell.ctaBg = themeColor;

    await ctx.runMutation(internal.service.partner.partnerBrandAdmin.savePartnerBrandDraft, {
      partnerId: args.partnerId,
      host: url,
      themeDraft: draft,
    });

    return { ok: true as const, themeDraft: draft };
  },
});
