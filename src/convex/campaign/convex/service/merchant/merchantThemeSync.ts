"use node";

import { v } from "convex/values";
import { authedAction } from "../../custom/session";
import { internal } from "../../_generated/api";
import { requirePartnerCampaignOpsViaHttp } from "../bridge/partnerStaffBridge";

function parseHexColor(input: string | undefined): string | null {
  if (!input) return null;
  const m = input.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return null;
  return input.trim();
}

function extractMetaThemeColor(html: string): string | null {
  const m = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i);
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

export const syncThemeFromUrl = authedAction({
  args: {
    partnerId: v.number(),
    sourceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePartnerCampaignOpsViaHttp({
      partnerId: args.partnerId,
      uid: ctx.uid,
      minRole: "admin",
    });

    const url = args.sourceUrl.trim();
    if (!url.startsWith("https://")) {
      return { ok: false as const, error: "https_required" as const };
    }

    let html = "";
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "TacticalMonster-CampaignThemeSync/1.0" },
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

    await ctx.runMutation(internal.service.merchant.merchantThemeSyncMutations.saveSyncJob, {
      partnerId: args.partnerId,
      sourceUrl: url,
      rawExtract: html.slice(0, 8000),
      themeDraft: draft,
    });

    return { ok: true as const, themeDraft: draft };
  },
});
