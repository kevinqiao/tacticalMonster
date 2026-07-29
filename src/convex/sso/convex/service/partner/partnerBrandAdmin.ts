import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internalMutation, internalQuery } from "../../_generated/server";
import { authedAction, authedMutation, authedQuery } from "../../custom/session";
import { getPartnerByPid, requirePartnerStaff, type PartnerRole } from "./partnerStaff";
import { isPlatformOperator } from "./platformOperator";
import {
  partnerThemeJsonValidator,
  resolvePartnerBrand,
  stripLegacyBrandingFromData,
  type PartnerThemeJson,
} from "./partnerBrand";

async function requirePartnerBrandAdmin(
  ctx: (QueryCtx | MutationCtx) & { user: { uid: string } },
  partnerId: number,
  minRole: PartnerRole = "admin"
) {
  if (await isPlatformOperator(ctx, ctx.user.uid)) return;
  await requirePartnerStaff(ctx, partnerId, minRole);
}

const partnerRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("developer"),
  v.literal("viewer")
);

/** Action-safe auth gate (actions have identity.subject, not ctx.user/db). */
export const assertPartnerBrandAdmin = internalMutation({
  args: {
    actorUid: v.string(),
    partnerId: v.number(),
    minRole: partnerRoleValidator,
  },
  handler: async (ctx, args) => {
    if (await isPlatformOperator(ctx, args.actorUid)) return { ok: true as const };
    await requirePartnerStaff(
      { ...ctx, user: { uid: args.actorUid } } as typeof ctx & { user: { uid: string } },
      args.partnerId,
      args.minRole
    );
    return { ok: true as const };
  },
});

async function publishBrandInDb(
  ctx: MutationCtx,
  args: {
    partnerId: number;
    themeJson: PartnerThemeJson;
    logoUrl?: string;
  }
) {
  const partner = await getPartnerByPid(ctx, args.partnerId);
  if (!partner) throw new Error("not_found");
  const prev = partner.brand ?? {};
  const nextVersion = (prev.themeVersion ?? 0) + 1;
  const theme: PartnerThemeJson = { ...args.themeJson, version: nextVersion };
  const logoUrl =
    args.logoUrl?.trim() ||
    theme.assets?.logoUrl?.trim() ||
    prev.logoUrl?.trim() ||
    undefined;
  const sourceUrl =
    theme.sourceUrl?.trim() ||
    prev.sourceUrl?.trim() ||
    partner.host?.trim() ||
    undefined;
  const prevData = (partner.data ?? {}) as Record<string, unknown>;
  const now = Date.now();
  await ctx.db.patch(partner._id, {
    host: partner.host || sourceUrl || undefined,
    brand: {
      sourceUrl,
      themeVersion: nextVersion,
      theme,
      logoUrl,
      updatedAt: now,
    },
    brandDraft: undefined,
    data: stripLegacyBrandingFromData(prevData),
  });
  return {
    themeVersion: nextVersion,
    theme,
    logoUrl,
    sourceUrl,
    slug: partner.slug ?? "",
  };
}

export const getPartnerBrandInternal = internalQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const partner = await getPartnerByPid(ctx, partnerId);
    if (!partner) return null;
    const resolved = resolvePartnerBrand(partner);
    return {
      partnerId,
      host: resolved.host,
      brand: resolved.brand,
      brandDraft: resolved.brandDraft,
      slug: partner.slug ?? "",
    };
  },
});

export const getPartnerBrandAdmin = authedQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    await requirePartnerBrandAdmin(ctx, partnerId, "viewer");
    const partner = await getPartnerByPid(ctx, partnerId);
    if (!partner) return null;
    const resolved = resolvePartnerBrand(partner);
    return {
      partnerId,
      host: resolved.host,
      brand: resolved.brand,
      brandDraft: resolved.brandDraft,
      seededFromLegacy: resolved.seededFromLegacy,
    };
  },
});

/** Persist host (+ brand.sourceUrl) without syncing. */
export const updatePartnerHost = authedMutation({
  args: {
    partnerId: v.number(),
    host: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePartnerBrandAdmin(ctx, args.partnerId, "admin");
    const partner = await getPartnerByPid(ctx, args.partnerId);
    if (!partner) throw new Error("not_found");
    const host = args.host.trim();
    const prevBrand = { ...(partner.brand ?? {}) };
    await ctx.db.patch(partner._id, {
      host: host || undefined,
      brand: {
        ...prevBrand,
        sourceUrl: host || prevBrand.sourceUrl,
        updatedAt: Date.now(),
      },
    });
    return { ok: true as const, host };
  },
});

export const savePartnerBrandDraft = internalMutation({
  args: {
    partnerId: v.number(),
    host: v.string(),
    themeDraft: partnerThemeJsonValidator,
  },
  handler: async (ctx, args) => {
    const partner = await getPartnerByPid(ctx, args.partnerId);
    if (!partner) throw new Error("not_found");
    const host = args.host.trim();
    const prevBrand = { ...(partner.brand ?? {}) };
    const prevData = (partner.data ?? {}) as Record<string, unknown>;
    await ctx.db.patch(partner._id, {
      host: host || partner.host || undefined,
      brand: {
        ...prevBrand,
        sourceUrl: host || prevBrand.sourceUrl,
        updatedAt: Date.now(),
      },
      brandDraft: args.themeDraft,
      data: stripLegacyBrandingFromData(prevData),
    });
    return { ok: true as const };
  },
});

export const approvePartnerBrandCore = internalMutation({
  args: {
    partnerId: v.number(),
    themeJson: partnerThemeJsonValidator,
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await publishBrandInDb(ctx, args);
  },
});

/** Publish draft or provided theme → SSO `partner.brand` (FE reads SSO directly). */
export const approvePartnerBrand = authedAction({
  args: {
    partnerId: v.number(),
    themeJson: v.optional(partnerThemeJsonValidator),
  },
  handler: async (ctx, args): Promise<{ ok: true; themeVersion: number }> => {
    await ctx.runMutation(internal.service.partner.partnerBrandAdmin.assertPartnerBrandAdmin, {
      actorUid: ctx.identity.subject,
      partnerId: args.partnerId,
      minRole: "admin",
    });
    const partner: {
      brandDraft: PartnerThemeJson | null;
      brand: { theme?: PartnerThemeJson; logoUrl?: string } | null;
    } | null = await ctx.runQuery(
      internal.service.partner.partnerBrandAdmin.getPartnerBrandInternal,
      { partnerId: args.partnerId }
    );
    if (!partner) throw new Error("not_found");
    const themeJson: PartnerThemeJson | undefined =
      args.themeJson ?? partner.brandDraft ?? partner.brand?.theme;
    if (!themeJson) throw new Error("no_theme_draft");

    const published: {
      themeVersion: number;
      theme: PartnerThemeJson;
      logoUrl?: string;
      sourceUrl?: string;
      slug: string;
    } = await ctx.runMutation(
      internal.service.partner.partnerBrandAdmin.approvePartnerBrandCore,
      {
        partnerId: args.partnerId,
        themeJson,
        logoUrl: partner.brand?.logoUrl,
      }
    );

    return { ok: true as const, themeVersion: published.themeVersion };
  },
});

/** Manual theme edit then publish on SSO. */
export const updatePartnerBrandTheme = authedAction({
  args: {
    partnerId: v.number(),
    themeJson: partnerThemeJsonValidator,
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: true; themeVersion: number }> => {
    await ctx.runMutation(internal.service.partner.partnerBrandAdmin.assertPartnerBrandAdmin, {
      actorUid: ctx.identity.subject,
      partnerId: args.partnerId,
      minRole: "admin",
    });
    const published: {
      themeVersion: number;
      theme: PartnerThemeJson;
      logoUrl?: string;
      sourceUrl?: string;
      slug: string;
    } = await ctx.runMutation(
      internal.service.partner.partnerBrandAdmin.approvePartnerBrandCore,
      {
        partnerId: args.partnerId,
        themeJson: args.themeJson,
        logoUrl: args.logoUrl,
      }
    );
    return { ok: true as const, themeVersion: published.themeVersion };
  },
});
