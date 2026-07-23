import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, internalQuery, query } from "../../_generated/server";
import {
  getCampaignBySlugs,
  getPartnerBrandByPartnerId,
  getPartnerBrandBySlug,
  isCampaignLive,
  newId,
} from "./merchantStaff";
import {
  rewardRuleValidator,
  themeJsonValidator,
  campaignRewardModelValidator,
  campaignExperienceTypeValidator,
  displayConfigValidator,
} from "./validators";
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

const replaySettingsValidator = v.object({
  maxReplaysPerMatch: v.optional(v.number()),
  adReplayEnabled: v.optional(v.boolean()),
  adReplayDailyCap: v.optional(v.number()),
  ticketReplayEnabled: v.optional(v.boolean()),
  ticketReplayPriceTickets: v.optional(v.number()),
  coinReplayEnabled: v.optional(v.boolean()),
  coinReplayPriceCoins: v.optional(v.number()),
  coinReplayDailyCap: v.optional(v.union(v.number(), v.null())),
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

function normalizeReplaySettings(
  raw:
    | {
        maxReplaysPerMatch?: number;
        adReplayEnabled?: boolean;
        adReplayDailyCap?: number;
        ticketReplayEnabled?: boolean;
        ticketReplayPriceTickets?: number;
        coinReplayEnabled?: boolean;
        coinReplayPriceCoins?: number;
        coinReplayDailyCap?: number | null;
      }
    | null
    | undefined
) {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, unknown> = {};
  if (typeof raw.maxReplaysPerMatch === "number" && Number.isFinite(raw.maxReplaysPerMatch)) {
    const n = Math.floor(raw.maxReplaysPerMatch);
    if (n >= 0 && n <= 20) out.maxReplaysPerMatch = n;
  }
  if (typeof raw.adReplayEnabled === "boolean") out.adReplayEnabled = raw.adReplayEnabled;
  if (typeof raw.adReplayDailyCap === "number" && Number.isFinite(raw.adReplayDailyCap)) {
    const n = Math.floor(raw.adReplayDailyCap);
    if (n >= 0 && n <= 100) out.adReplayDailyCap = n;
  }
  if (typeof raw.ticketReplayEnabled === "boolean") {
    out.ticketReplayEnabled = raw.ticketReplayEnabled;
  }
  if (
    typeof raw.ticketReplayPriceTickets === "number" &&
    Number.isFinite(raw.ticketReplayPriceTickets)
  ) {
    const n = Math.floor(raw.ticketReplayPriceTickets);
    if (n >= 1 && n <= 100) out.ticketReplayPriceTickets = n;
  }
  if (typeof raw.coinReplayEnabled === "boolean") out.coinReplayEnabled = raw.coinReplayEnabled;
  if (typeof raw.coinReplayPriceCoins === "number" && Number.isFinite(raw.coinReplayPriceCoins)) {
    out.coinReplayPriceCoins = Math.max(0, Math.floor(raw.coinReplayPriceCoins));
  }
  if (raw.coinReplayDailyCap === null) out.coinReplayDailyCap = null;
  else if (typeof raw.coinReplayDailyCap === "number" && Number.isFinite(raw.coinReplayDailyCap)) {
    out.coinReplayDailyCap = Math.max(0, Math.floor(raw.coinReplayDailyCap));
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;

function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

function assertValidSlug(slug: string) {
  if (!slug || !SLUG_RE.test(slug)) throw new Error("slug_invalid");
}

/** Ensure partner_brands row exists (slug required for public URLs). */
export const upsertPartnerBrandCore = internalMutation({
  args: {
    partnerId: v.number(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug);
    assertValidSlug(slug);
    const bySlug = await getPartnerBrandBySlug(ctx, slug);
    if (bySlug && bySlug.partnerId !== args.partnerId) {
      throw new Error("slug_taken");
    }
    const existing = await getPartnerBrandByPartnerId(ctx, args.partnerId);
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { slug, updatedAt: now });
      return { partnerId: args.partnerId, slug };
    }
    await ctx.db.insert("partner_brands", {
      partnerId: args.partnerId,
      slug,
      updatedAt: now,
    });
    return { partnerId: args.partnerId, slug };
  },
});

export const getPartnerBrandInternal = internalQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    return await getPartnerBrandByPartnerId(ctx, partnerId);
  },
});

/** Used by campaignPartnerGameActions after SSO partner.games check. */
export const createCampaignCore = internalMutation({
  args: {
    uid: v.string(),
    partnerId: v.number(),
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
    replaySettings: v.optional(replaySettingsValidator),
    rewardRules: v.optional(v.array(rewardRuleValidator)),
  },
  handler: async (ctx, args) => {
    return await createCampaignHandler(ctx, args);
  },
});

async function createCampaignHandler(
  ctx: import("../../_generated/server").MutationCtx,
  args: {
    uid: string;
    partnerId: number;
    slug: string;
    title: string;
    rulesText?: string;
    startsAt: number;
    endsAt: number;
    experienceType?: "game" | "display";
    displayConfig?: unknown;
    posterStorageId?: import("../../_generated/dataModel").Id<"_storage">;
    posterPortraitStorageId?: import("../../_generated/dataModel").Id<"_storage">;
    posterLandscapeStorageId?: import("../../_generated/dataModel").Id<"_storage">;
    gameType?: string;
    mode?: "solo" | "multi";
    rewardModel?: "pass_per_run" | "competitive_leaderboard";
    playLimits?: {
      maxCouponsPerPlayer: number;
      maxPlaysPerDay?: number;
      dayTimezone?: string;
    };
    replaySettings?: {
      maxReplaysPerMatch?: number;
      adReplayEnabled?: boolean;
      adReplayDailyCap?: number;
      ticketReplayEnabled?: boolean;
      ticketReplayPriceTickets?: number;
      coinReplayEnabled?: boolean;
      coinReplayPriceCoins?: number;
      coinReplayDailyCap?: number | null;
    };
    rewardRules?: Doc<"campaigns">["rewardRules"];
  }
) {
  const brand = await getPartnerBrandByPartnerId(ctx, args.partnerId);
  if (!brand) throw new Error("partner_brand_required");

  const slug = normalizeSlug(args.slug);
  assertValidSlug(slug);
  const dup = await ctx.db
    .query("campaigns")
    .withIndex("by_partner_slug", (q) =>
      q.eq("partnerId", args.partnerId).eq("slug", slug)
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
      displayConfig: args.displayConfig as never,
      requirePoster: false,
    });
    await ctx.db.insert("campaigns", {
      campaignId,
      partnerId: args.partnerId,
      slug,
      status: "draft",
      title: args.title.trim(),
      rulesText: args.rulesText,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      experienceType: "display",
      displayConfig: args.displayConfig as never,
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
  assertStaffCouponDefRefs(args.rewardRules as never);
  const rewardRules = await materializeCampaignRewardRules(
    ctx,
    args.partnerId,
    args.rewardRules as never
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
  await ctx.db.insert("campaigns", {
    campaignId,
    partnerId: args.partnerId,
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
    playLimits: normalizePlayLimits(
      args.playLimits ?? { maxCouponsPerPlayer: 1 }
    ),
    ...(() => {
      const replaySettings = normalizeReplaySettings(args.replaySettings);
      return replaySettings ? { replaySettings } : {};
    })(),
    rewardRules,
    createdAt: now,
    updatedAt: now,
  });
  return { campaignId, slug };
}

export const updateCampaignCore = internalMutation({
  args: {
    partnerId: v.number(),
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
    replaySettings: v.optional(v.union(replaySettingsValidator, v.null())),
    rewardRules: v.optional(v.array(rewardRuleValidator)),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique();
    if (!row || row.partnerId !== args.partnerId) throw new Error("not_found");
    if (row.status === "ended") throw new Error("campaign_ended");
    const settlement = await getCampaignSettlementPublic(ctx, row.campaignId);
    if (settlement.status === "done") {
      throw new Error("campaign_settled_locked");
    }

    const experienceType = args.experienceType ?? resolveExperienceType(row);

    // null / empty partial clears the field (Convex patch treats undefined as unset).
    const nextReplay =
      args.replaySettings === null
        ? undefined
        : args.replaySettings !== undefined
          ? normalizeReplaySettings(args.replaySettings)
          : row.replaySettings;

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
      replaySettings: nextReplay,
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
        args.partnerId,
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

export const getCampaignForStaffInternal = internalQuery({
  args: { partnerId: v.number(), campaignId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique();
    if (!row || row.partnerId !== args.partnerId) return null;
    const brand = await getPartnerBrandByPartnerId(ctx, args.partnerId);
    const posterUrls = await resolveCampaignPosterUrls(ctx, row);
    return {
      ...row,
      partnerSlug: brand?.slug ?? "",
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

export const updateCampaignStatusCore = internalMutation({
  args: {
    partnerId: v.number(),
    campaignId: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("live"),
      v.literal("ended")
    ),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique();
    if (!row || row.partnerId !== args.partnerId) throw new Error("not_found");
    if (args.status === "live" || args.status === "scheduled") {
      const settlement = await getCampaignSettlementPublic(ctx, row.campaignId);
      if (settlement.status === "done") {
        throw new Error("campaign_settled_cannot_relive");
      }
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

export const listCampaignsInternal = internalQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("campaigns")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", args.partnerId))
      .collect();
    return await Promise.all(
      rows.map(async (campaign) => ({
        ...campaign,
        settlement: await getCampaignSettlementPublic(ctx, campaign.campaignId),
      }))
    );
  },
});

function partnerPublicFields(
  brand: {
    partnerId: number;
    slug: string;
    logoStorageId?: string;
  },
  name: string,
  logoUrl: string | null
) {
  return {
    partnerId: brand.partnerId,
    slug: brand.slug,
    name,
    logoUrl,
  };
}

/** Resolve partnerId from public partner slug (partner_brands). */
export const resolvePartnerByPartnerSlug = query({
  args: { partnerSlug: v.string() },
  handler: async (ctx, args) => {
    const brand = await getPartnerBrandBySlug(ctx, args.partnerSlug.trim().toLowerCase());
    if (!brand) return null;
    return {
      partnerId: brand.partnerId,
      partnerSlug: brand.slug,
    };
  },
});

export const listPartnerCampaignsPublic = query({
  args: { partnerSlug: v.string() },
  handler: async (ctx, args) => {
    const brand = await getPartnerBrandBySlug(ctx, args.partnerSlug.trim().toLowerCase());
    if (!brand) return [];

    const rows = await ctx.db
      .query("campaigns")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", brand.partnerId))
      .collect();

    // ended 仍可浏览榜/战绩/券；draft 等不对玩家公开
    const visible = rows.filter(
      (c) =>
        c.status === "live" || c.status === "scheduled" || c.status === "ended"
    );

    const statusRank = (status: string): number => {
      if (status === "live") return 0;
      if (status === "scheduled") return 1;
      if (status === "ended") return 2;
      return 9;
    };

    visible.sort((a, b) => {
      const byStatus = statusRank(a.status) - statusRank(b.status);
      if (byStatus !== 0) return byStatus;
      // 进行中/未开始：即将开始靠前；已结束：刚结束靠前
      if (a.status === "ended") return b.endsAt - a.endsAt;
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
    partnerSlug: v.string(),
    campaignSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const bundle = await getCampaignBySlugs(ctx, args.partnerSlug, args.campaignSlug);
    if (!bundle) return null;
    const { brand, campaign } = bundle;
    const posterUrls = await resolveCampaignPosterUrls(ctx, campaign);
    let logoUrl: string | null = null;
    if (brand.logoStorageId) {
      logoUrl = await ctx.storage.getUrl(brand.logoStorageId);
    }
    const theme = campaign.themeOverride ?? brand.themeJson ?? null;
    const experienceType = resolveExperienceType(campaign);
    const partnerName = brand.slug;

    if (experienceType === "display") {
      return {
        partner: partnerPublicFields(brand, partnerName, logoUrl),
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
      partner: partnerPublicFields(brand, partnerName, logoUrl),
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

export const generatePosterUploadUrlCore = internalMutation({
  args: { partnerId: v.number() },
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachCampaignPosterCore = internalMutation({
  args: {
    partnerId: v.number(),
    campaignId: v.string(),
    storageId: v.id("_storage"),
    variant: v.optional(v.union(v.literal("portrait"), v.literal("landscape"))),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique();
    if (!row || row.partnerId !== args.partnerId) throw new Error("not_found");
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

export const updatePartnerBrandUrlCore = internalMutation({
  args: {
    partnerId: v.number(),
    brandSourceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await getPartnerBrandByPartnerId(ctx, args.partnerId);
    if (!row) throw new Error("not_found");
    await ctx.db.patch(row._id, {
      brandSourceUrl: args.brandSourceUrl.trim(),
      updatedAt: Date.now(),
    });
    return { ok: true as const };
  },
});

export const approvePartnerThemeCore = internalMutation({
  args: {
    partnerId: v.number(),
    themeJson: themeJsonValidator,
  },
  handler: async (ctx, args) => {
    const row = await getPartnerBrandByPartnerId(ctx, args.partnerId);
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
