import { v } from "convex/values";
import { query } from "../../_generated/server";
import { authedMutation, authedQuery } from "../../custom/session";
import {
  getCampaignBySlugs,
  getMerchantBySlug,
  isCampaignLive,
  merchantPartnerId,
  newId,
  requireStaff,
} from "./merchantStaff";
import { rewardRuleValidator, themeJsonValidator, campaignRewardModelValidator, campaignExperienceTypeValidator, displayConfigValidator } from "./validators";
import {
  assertCampaignConfig,
  assertStaffCouponDefRefs,
  portalTemplateIdForCampaign,
} from "./campaignRuleValidation";
import { displayCampaignDefaults, resolveExperienceType } from "./campaignExperienceType";
import { materializeCampaignRewardRules } from "./merchantCouponDefs";
import {
  getCampaignSettlementPublic,
  listPublicLeaderboardRankRewards,
  resolveRewardModel,
  usesLeaderboard,
} from "./campaignLeaderboardSettlement";
import { getPublicPassReward } from "./campaignRewardModel";
import { resolveCampaignPosterUrls } from "./campaignPosterUrls";
import { normalizeCampaignDayTimezone } from "./campaignTimeZone";

const playLimitsValidator = v.object({
  maxCouponsPerPlayer: v.number(),
  maxPlaysPerDay: v.optional(v.number()),
  dayTimezone: v.optional(v.string()),
});

function normalizePlayLimits(playLimits: {
  maxCouponsPerPlayer: number;
  maxPlaysPerDay?: number;
  dayTimezone?: string;
}) {
  return {
    maxCouponsPerPlayer: playLimits.maxCouponsPerPlayer,
    ...(playLimits.maxPlaysPerDay != null ? { maxPlaysPerDay: playLimits.maxPlaysPerDay } : {}),
    dayTimezone: normalizeCampaignDayTimezone(playLimits.dayTimezone),
  };
}

export const createMerchant = authedMutation({
  args: {
    slug: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = args.slug.trim().toLowerCase();
    const existing = await getMerchantBySlug(ctx, slug);
    if (existing) {
      throw new Error("slug_taken");
    }
    const merchantId = newId("m");
    const now = Date.now();
    await ctx.db.insert("merchants", {
      merchantId,
      slug,
      name: args.name.trim(),
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("merchant_staff", {
      merchantId,
      uid: ctx.uid,
      role: "owner",
      createdAt: now,
    });
    return { merchantId, slug };
  },
});

export const listMyMerchants = authedQuery({
  args: {},
  handler: async (ctx) => {
    const uid = ctx.uid;
    const staffRows = await ctx.db
      .query("merchant_staff")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();
    const out = [];
    for (const s of staffRows) {
      const m = await ctx.db
        .query("merchants")
        .withIndex("by_merchantId", (q) => q.eq("merchantId", s.merchantId))
        .unique();
      if (m) out.push({ ...m, role: s.role });
    }
    return out;
  },
});

export const createCampaign = authedMutation({
  args: {
    merchantId: v.string(),
    slug: v.string(),
    title: v.string(),
    rulesText: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.number(),
    experienceType: v.optional(campaignExperienceTypeValidator),
    displayConfig: v.optional(displayConfigValidator),
    posterStorageId: v.optional(v.id("_storage")),
    posterPortraitStorageId: v.optional(v.id("_storage")),
    posterLandscapeStorageId: v.optional(v.id("_storage")),
    gameType: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("solo"), v.literal("multi"))),
    rewardModel: v.optional(campaignRewardModelValidator),
    playLimits: v.optional(playLimitsValidator),
    rewardRules: v.optional(v.array(rewardRuleValidator)),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    const slug = args.slug.trim().toLowerCase();
    const dup = await ctx.db
      .query("merchant_campaigns")
      .withIndex("by_merchant_slug", (q) =>
        q.eq("merchantId", args.merchantId).eq("slug", slug)
      )
      .unique();
    if (dup) throw new Error("campaign_slug_taken");

    const experienceType = args.experienceType ?? "game";
    const now = Date.now();
    const campaignId = newId("camp");

    if (experienceType === "display") {
      const defaults = displayCampaignDefaults();
      assertCampaignConfig({
        experienceType: "display",
        ...defaults,
        startsAt: args.startsAt,
        endsAt: args.endsAt,
        posterStorageId: args.posterStorageId,
        posterPortraitStorageId: args.posterPortraitStorageId,
        posterLandscapeStorageId: args.posterLandscapeStorageId,
        displayConfig: args.displayConfig,
        requirePoster: false,
      });
      await ctx.db.insert("merchant_campaigns", {
        campaignId,
        merchantId: args.merchantId,
        slug,
        status: "draft",
        title: args.title.trim(),
        rulesText: args.rulesText,
        startsAt: args.startsAt,
        endsAt: args.endsAt,
        experienceType: "display",
        displayConfig: args.displayConfig,
        posterStorageId: args.posterPortraitStorageId ?? args.posterStorageId,
        posterPortraitStorageId: args.posterPortraitStorageId,
        posterLandscapeStorageId: args.posterLandscapeStorageId,
        ...defaults,
        createdAt: now,
        updatedAt: now,
      });
      return { campaignId, slug };
    }

    if (
      !args.gameType ||
      !args.mode ||
      !args.rewardModel ||
      !args.playLimits ||
      !args.rewardRules
    ) {
      throw new Error("invalid_fields");
    }
    assertStaffCouponDefRefs(args.rewardRules);
    const rewardRules = await materializeCampaignRewardRules(
      ctx,
      args.merchantId,
      args.rewardRules
    );
    assertCampaignConfig({
      experienceType: "game",
      gameType: args.gameType,
      mode: args.mode,
      rewardModel: args.rewardModel,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      rewardRules,
      posterStorageId: args.posterStorageId,
      posterPortraitStorageId: args.posterPortraitStorageId,
      posterLandscapeStorageId: args.posterLandscapeStorageId,
      requirePoster: false,
    });
    await ctx.db.insert("merchant_campaigns", {
      campaignId,
      merchantId: args.merchantId,
      slug,
      status: "draft",
      title: args.title.trim(),
      rulesText: args.rulesText,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      experienceType: "game",
      posterStorageId: args.posterPortraitStorageId ?? args.posterStorageId,
      posterPortraitStorageId: args.posterPortraitStorageId,
      posterLandscapeStorageId: args.posterLandscapeStorageId,
      gameType: args.gameType,
      mode: args.mode,
      rewardModel: args.rewardModel,
      playLimits: normalizePlayLimits(args.playLimits),
      rewardRules,
      createdAt: now,
      updatedAt: now,
    });
    return { campaignId, slug };
  },
});

export const updateCampaign = authedMutation({
  args: {
    merchantId: v.string(),
    campaignId: v.string(),
    title: v.optional(v.string()),
    rulesText: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    experienceType: v.optional(campaignExperienceTypeValidator),
    displayConfig: v.optional(displayConfigValidator),
    posterStorageId: v.optional(v.id("_storage")),
    posterPortraitStorageId: v.optional(v.id("_storage")),
    posterLandscapeStorageId: v.optional(v.id("_storage")),
    gameType: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("solo"), v.literal("multi"))),
    rewardModel: v.optional(campaignRewardModelValidator),
    playLimits: v.optional(playLimitsValidator),
    rewardRules: v.optional(v.array(rewardRuleValidator)),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    const row = await ctx.db
      .query("merchant_campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique();
    if (!row || row.merchantId !== args.merchantId) throw new Error("not_found");
    if (row.status === "ended") throw new Error("campaign_ended");

    const experienceType =
      args.experienceType ?? resolveExperienceType(row);

    const next = {
      title: args.title?.trim() ?? row.title,
      rulesText: args.rulesText !== undefined ? args.rulesText : row.rulesText,
      startsAt: args.startsAt ?? row.startsAt,
      endsAt: args.endsAt ?? row.endsAt,
      experienceType,
      displayConfig:
        args.displayConfig !== undefined ? args.displayConfig : row.displayConfig,
      posterStorageId:
        args.posterStorageId !== undefined ? args.posterStorageId : row.posterStorageId,
      posterPortraitStorageId:
        args.posterPortraitStorageId !== undefined
          ? args.posterPortraitStorageId
          : row.posterPortraitStorageId,
      posterLandscapeStorageId:
        args.posterLandscapeStorageId !== undefined
          ? args.posterLandscapeStorageId
          : row.posterLandscapeStorageId,
      gameType: args.gameType ?? row.gameType,
      mode: args.mode ?? row.mode,
      rewardModel: args.rewardModel ?? row.rewardModel,
      playLimits:
        args.playLimits != null ? normalizePlayLimits(args.playLimits) : row.playLimits,
      rewardRules: args.rewardRules ?? row.rewardRules,
    };

    if (row.status === "live") {
      const structural =
        args.startsAt != null ||
        args.endsAt != null ||
        args.experienceType != null ||
        args.displayConfig != null ||
        args.gameType != null ||
        args.mode != null ||
        args.rewardModel != null ||
        args.rewardRules != null ||
        args.playLimits != null;
      if (structural) throw new Error("live_campaign_locked");
    }

    let rewardRules = next.rewardRules;
    if (args.rewardRules != null && experienceType === "game") {
      assertStaffCouponDefRefs(args.rewardRules);
      rewardRules = await materializeCampaignRewardRules(
        ctx,
        args.merchantId,
        args.rewardRules
      );
    }
    const resolved = { ...next, rewardRules };

    assertCampaignConfig({
      experienceType: resolved.experienceType,
      gameType: resolved.gameType,
      mode: resolved.mode,
      rewardModel: resolved.rewardModel,
      startsAt: resolved.startsAt,
      endsAt: resolved.endsAt,
      rewardRules: resolved.rewardRules,
      posterStorageId: resolved.posterStorageId,
      posterPortraitStorageId: resolved.posterPortraitStorageId,
      posterLandscapeStorageId: resolved.posterLandscapeStorageId,
      displayConfig: resolved.displayConfig,
      // Poster is enforced when going live (updateCampaignStatus), not on every save.
      requirePoster: false,
    });
    const posterStorageId =
      resolved.posterPortraitStorageId ??
      resolved.posterStorageId ??
      row.posterStorageId;
    await ctx.db.patch(row._id, {
      ...resolved,
      posterStorageId,
      updatedAt: Date.now(),
    });
    return { ok: true as const };
  },
});

export const getCampaignForStaff = authedQuery({
  args: { merchantId: v.string(), campaignId: v.string() },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    const row = await ctx.db
      .query("merchant_campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique();
    if (!row || row.merchantId !== args.merchantId) return null;
    const merchant = await ctx.db
      .query("merchants")
      .withIndex("by_merchantId", (q) => q.eq("merchantId", args.merchantId))
      .unique();
    const posterUrls = await resolveCampaignPosterUrls(ctx, row);
    return {
      ...row,
      merchantSlug: merchant?.slug ?? "",
      ...posterUrls,
      experienceType: resolveExperienceType(row),
      rewardModel: resolveExperienceType(row) === "game" ? resolveRewardModel(row) : undefined,
      portalTemplateId:
        resolveExperienceType(row) === "game"
          ? portalTemplateIdForCampaign(row.gameType, row.mode)
          : null,
    };
  },
});

export const updateCampaignStatus = authedMutation({
  args: {
    merchantId: v.string(),
    campaignId: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("live"),
      v.literal("ended")
    ),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    const row = await ctx.db
      .query("merchant_campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique();
    if (!row || row.merchantId !== args.merchantId) throw new Error("not_found");
    if (args.status === "live" || args.status === "scheduled") {
      assertCampaignConfig({
        experienceType: resolveExperienceType(row),
        gameType: row.gameType,
        mode: row.mode,
        rewardModel: row.rewardModel,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        rewardRules: row.rewardRules,
        posterStorageId: row.posterStorageId,
        posterPortraitStorageId: row.posterPortraitStorageId,
        posterLandscapeStorageId: row.posterLandscapeStorageId,
        displayConfig: row.displayConfig,
      });
    }
    await ctx.db.patch(row._id, { status: args.status, updatedAt: Date.now() });
    return { ok: true as const };
  },
});

export const listCampaigns = authedQuery({
  args: { merchantId: v.string() },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    return await ctx.db
      .query("merchant_campaigns")
      .withIndex("by_merchantId", (q) => q.eq("merchantId", args.merchantId))
      .collect();
  },
});

function merchantPublicFields(
  merchant: {
    merchantId: string;
    slug: string;
    name: string;
    partnerId?: number;
    logoStorageId?: string;
  },
  logoUrl: string | null
) {
  return {
    merchantId: merchant.merchantId,
    slug: merchant.slug,
    name: merchant.name,
    partnerId: merchantPartnerId(merchant),
    logoUrl,
  };
}

export const resolvePartnerByMerchantSlug = query({
  args: { merchantSlug: v.string() },
  handler: async (ctx, args) => {
    const merchant = await getMerchantBySlug(ctx, args.merchantSlug.trim().toLowerCase());
    if (!merchant || merchant.status !== "active") return null;
    return {
      partnerId: merchantPartnerId(merchant),
      merchantSlug: merchant.slug,
      merchantName: merchant.name,
    };
  },
});

export const listMerchantCampaignsPublic = query({
  args: { merchantSlug: v.string() },
  handler: async (ctx, args) => {
    const merchant = await getMerchantBySlug(ctx, args.merchantSlug.trim().toLowerCase());
    if (!merchant || merchant.status !== "active") return [];

    const rows = await ctx.db
      .query("merchant_campaigns")
      .withIndex("by_merchantId", (q) => q.eq("merchantId", merchant.merchantId))
      .collect();

    const visible = rows.filter(
      (c) => c.status === "live" || c.status === "scheduled"
    );

    visible.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "live" ? -1 : 1;
      }
      return a.startsAt - b.startsAt;
    });

    const out = [];
    for (const campaign of visible) {
      const posterUrls = await resolveCampaignPosterUrls(ctx, campaign);
      out.push({
        slug: campaign.slug,
        title: campaign.title,
        status: campaign.status,
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
        experienceType: resolveExperienceType(campaign),
        gameType: campaign.gameType,
        ...posterUrls,
        ctaLabel:
          campaign.displayConfig?.cta?.kind && campaign.displayConfig.cta.kind !== "none"
            ? campaign.displayConfig.cta.label
            : undefined,
      });
    }
    return out;
  },
});

export const getCampaignPublic = query({
  args: {
    merchantSlug: v.string(),
    campaignSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const bundle = await getCampaignBySlugs(ctx, args.merchantSlug, args.campaignSlug);
    if (!bundle) return null;
    const { merchant, campaign } = bundle;
    const posterUrls = await resolveCampaignPosterUrls(ctx, campaign);
    let logoUrl: string | null = null;
    if (merchant.logoStorageId) {
      logoUrl = await ctx.storage.getUrl(merchant.logoStorageId);
    }
    const theme = campaign.themeOverride ?? merchant.themeJson ?? null;
    const experienceType = resolveExperienceType(campaign);

    if (experienceType === "display") {
      return {
        merchant: merchantPublicFields(merchant, logoUrl),
        campaign: {
          campaignId: campaign.campaignId,
          slug: campaign.slug,
          status: campaign.status,
          title: campaign.title,
          rulesText: campaign.rulesText,
          startsAt: campaign.startsAt,
          endsAt: campaign.endsAt,
          experienceType: "display" as const,
          displayConfig: campaign.displayConfig ?? null,
          ...posterUrls,
          live: isCampaignLive(campaign),
          highlightText: campaign.displayConfig?.highlightText ?? null,
        },
        theme,
      };
    }

    const rewardModel = resolveRewardModel(campaign);
    const settlement = await getCampaignSettlementPublic(ctx, campaign.campaignId);
    return {
      merchant: merchantPublicFields(merchant, logoUrl),
      campaign: {
        campaignId: campaign.campaignId,
        slug: campaign.slug,
        status: campaign.status,
        title: campaign.title,
        rulesText: campaign.rulesText,
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
        experienceType: "game" as const,
        gameType: campaign.gameType,
        mode: campaign.mode,
        rewardModel,
        hasLeaderboard: usesLeaderboard(rewardModel),
        ...posterUrls,
        live: isCampaignLive(campaign),
        settlement,
        playLimits: campaign.playLimits,
        leaderboardRankRewards: listPublicLeaderboardRankRewards(campaign),
        passReward: getPublicPassReward(campaign),
      },
      theme,
    };
  },
});

export const generatePosterUploadUrl = authedMutation({
  args: { merchantId: v.string() },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachCampaignPoster = authedMutation({
  args: {
    merchantId: v.string(),
    campaignId: v.string(),
    storageId: v.id("_storage"),
    variant: v.optional(v.union(v.literal("portrait"), v.literal("landscape"))),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    const row = await ctx.db
      .query("merchant_campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique();
    if (!row || row.merchantId !== args.merchantId) throw new Error("not_found");
    const variant = args.variant ?? "portrait";
    const patch =
      variant === "landscape"
        ? { posterLandscapeStorageId: args.storageId }
        : {
            posterPortraitStorageId: args.storageId,
            posterStorageId: args.storageId,
          };
    await ctx.db.patch(row._id, { ...patch, updatedAt: Date.now() });
    return { ok: true as const };
  },
});

export const updateMerchantBrandUrl = authedMutation({
  args: {
    merchantId: v.string(),
    brandSourceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    const row = await ctx.db
      .query("merchants")
      .withIndex("by_merchantId", (q) => q.eq("merchantId", args.merchantId))
      .unique();
    if (!row) throw new Error("not_found");
    await ctx.db.patch(row._id, {
      brandSourceUrl: args.brandSourceUrl.trim(),
      updatedAt: Date.now(),
    });
    return { ok: true as const };
  },
});

export const approveMerchantTheme = authedMutation({
  args: {
    merchantId: v.string(),
    themeJson: themeJsonValidator,
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    const row = await ctx.db
      .query("merchants")
      .withIndex("by_merchantId", (q) => q.eq("merchantId", args.merchantId))
      .unique();
    if (!row) throw new Error("not_found");
    const nextVersion = (row.themeVersion ?? 0) + 1;
    await ctx.db.patch(row._id, {
      themeJson: { ...args.themeJson, version: nextVersion },
      themeVersion: nextVersion,
      updatedAt: Date.now(),
    });
    return { themeVersion: nextVersion };
  },
});
