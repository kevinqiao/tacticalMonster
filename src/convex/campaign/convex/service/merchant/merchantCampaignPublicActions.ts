import { v } from "convex/values";

import { action } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { resolvePartnerBySlugViaHttp } from "../bridge/partnerSlugResolveBridge";

/**
 * Public campaign APIs (actions) for legacy slug-based callers.
 * Resolve partnerId via SSO `partner.slug` only — no brand merge.
 * FE page loads use public queries + `usePartnerManager()` for brand.
 */

/** Resolve partnerId from public partner slug (SSO `partner.slug`). */
export const resolvePartnerByPartnerSlug = action({
  args: { partnerSlug: v.string() },
  handler: async (_ctx, args) => {
    const resolved = await resolvePartnerBySlugViaHttp(args.partnerSlug);
    if (!resolved.ok) return null;
    return {
      partnerId: resolved.partnerId,
      partnerSlug: resolved.partnerSlug,
    };
  },
});

export const listPartnerCampaignsPublic = action({
  args: { partnerSlug: v.string() },
  handler: async (ctx, args): Promise<unknown[]> => {
    const resolved = await resolvePartnerBySlugViaHttp(args.partnerSlug);
    if (!resolved.ok) return [];
    const rows = await ctx.runQuery(
      internal.service.merchant.merchantCampaigns.listPartnerCampaignsPublicInternal,
      { partnerId: resolved.partnerId }
    );
    return rows ?? [];
  },
});

export const getCampaignPublic = action({
  args: {
    partnerSlug: v.string(),
    campaignSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const resolved = await resolvePartnerBySlugViaHttp(args.partnerSlug);
    if (!resolved.ok) return null;

    const bundle = await ctx.runQuery(
      internal.service.merchant.merchantCampaigns.getCampaignPublicInternal,
      { partnerId: resolved.partnerId, campaignSlug: args.campaignSlug }
    );
    if (!bundle) return null;

    return {
      partner: {
        partnerId: resolved.partnerId,
        slug: resolved.partnerSlug,
        name: resolved.name?.trim() || resolved.partnerSlug,
        logoUrl: null as string | null,
      },
      campaign: bundle.campaign,
      theme: bundle.themeOverride,
    };
  },
});
