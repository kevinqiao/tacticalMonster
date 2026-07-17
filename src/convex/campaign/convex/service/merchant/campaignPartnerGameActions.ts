"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { authedAction } from "../../custom/session";
import { requirePartnerCampaignOpsViaHttp } from "../bridge/partnerStaffBridge";
import {
  campaignExperienceTypeValidator,
  campaignRewardModelValidator,
  displayConfigValidator,
  rewardRuleValidator,
  themeJsonValidator,
  couponDefStatusValidator,
} from "./validators";
import { assertGameTypeEnabledForPartner } from "./partnerGamesFromSso";

const playLimitsValidator = v.object({
  maxCouponsPerPlayer: v.number(),
  maxPlaysPerDay: v.optional(v.number()),
  dayTimezone: v.optional(v.string()),
});

async function assertOps(partnerId: number, uid: string, minRole?: "viewer" | "admin") {
  await requirePartnerCampaignOpsViaHttp({
    partnerId,
    uid,
    minRole: minRole ?? "viewer",
  });
}

export const upsertPartnerBrand = authedAction({
  args: { partnerId: v.number(), slug: v.string() },
  handler: async (ctx, args) => {
    await assertOps(args.partnerId, ctx.uid, "admin");
    return await ctx.runMutation(
      internal.service.merchant.merchantCampaigns.upsertPartnerBrandCore,
      args
    );
  },
});

/**
 * Create campaign after verifying gameType ∈ SSO partner.games + campaignOps staff.
 */
export const createCampaign = authedAction({
  args: {
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
    rewardRules: v.optional(v.array(rewardRuleValidator)),
  },
  handler: async (ctx, args) => {
    await assertOps(args.partnerId, ctx.uid);
    const experienceType = args.experienceType ?? "game";
    if (experienceType === "game" && args.gameType) {
      await assertGameTypeEnabledForPartner(args.partnerId, args.gameType);
    }
    return await ctx.runMutation(
      internal.service.merchant.merchantCampaigns.createCampaignCore,
      { ...args, uid: ctx.uid }
    );
  },
});

/** @deprecated alias — use createCampaign */
export const createCampaignWithPartnerGames = createCampaign;

export const updateCampaign = authedAction({
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
    rewardRules: v.optional(v.array(rewardRuleValidator)),
  },
  handler: async (ctx, args) => {
    await assertOps(args.partnerId, ctx.uid);
    if (args.gameType) {
      await assertGameTypeEnabledForPartner(args.partnerId, args.gameType);
    }
    return await ctx.runMutation(
      internal.service.merchant.merchantCampaigns.updateCampaignCore,
      args
    );
  },
});

export const getCampaignForStaff = authedAction({
  args: { partnerId: v.number(), campaignId: v.string() },
  handler: async (ctx, args) => {
    await assertOps(args.partnerId, ctx.uid);
    return await ctx.runQuery(
      internal.service.merchant.merchantCampaigns.getCampaignForStaffInternal,
      args
    );
  },
});

export const updateCampaignStatus = authedAction({
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
    await assertOps(args.partnerId, ctx.uid);
    return await ctx.runMutation(
      internal.service.merchant.merchantCampaigns.updateCampaignStatusCore,
      args
    );
  },
});

export const listCampaigns = authedAction({
  args: { partnerId: v.number() },
  handler: async (ctx, args) => {
    await assertOps(args.partnerId, ctx.uid);
    return await ctx.runQuery(
      internal.service.merchant.merchantCampaigns.listCampaignsInternal,
      args
    );
  },
});

export const generatePosterUploadUrl = authedAction({
  args: { partnerId: v.number() },
  handler: async (ctx, args) => {
    await assertOps(args.partnerId, ctx.uid);
    return await ctx.runMutation(
      internal.service.merchant.merchantCampaigns.generatePosterUploadUrlCore,
      args
    );
  },
});

export const attachCampaignPoster = authedAction({
  args: {
    partnerId: v.number(),
    campaignId: v.string(),
    storageId: v.id("_storage"),
    variant: v.optional(v.union(v.literal("portrait"), v.literal("landscape"))),
  },
  handler: async (ctx, args) => {
    await assertOps(args.partnerId, ctx.uid);
    return await ctx.runMutation(
      internal.service.merchant.merchantCampaigns.attachCampaignPosterCore,
      args
    );
  },
});

export const updatePartnerBrandUrl = authedAction({
  args: { partnerId: v.number(), brandSourceUrl: v.string() },
  handler: async (ctx, args) => {
    await assertOps(args.partnerId, ctx.uid, "admin");
    return await ctx.runMutation(
      internal.service.merchant.merchantCampaigns.updatePartnerBrandUrlCore,
      args
    );
  },
});

export const approvePartnerTheme = authedAction({
  args: { partnerId: v.number(), themeJson: themeJsonValidator },
  handler: async (ctx, args) => {
    await assertOps(args.partnerId, ctx.uid, "admin");
    return await ctx.runMutation(
      internal.service.merchant.merchantCampaigns.approvePartnerThemeCore,
      args
    );
  },
});

export const listCouponDefsForStaff = authedAction({
  args: {
    partnerId: v.number(),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await assertOps(args.partnerId, ctx.uid);
    return await ctx.runQuery(
      internal.service.merchant.merchantCouponDefs.listCouponDefsInternal,
      args
    );
  },
});

const couponActivationKindArg = v.union(
  v.literal("immediate"),
  v.literal("delay_hours"),
  v.literal("fixed_at")
);

export const createCouponDef = authedAction({
  args: {
    partnerId: v.number(),
    name: v.string(),
    itemLabel: v.string(),
    usageRules: v.optional(v.string()),
    validityHours: v.optional(v.number()),
    activationKind: v.optional(couponActivationKindArg),
    activationAtMs: v.optional(v.number()),
    activationDelayHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertOps(args.partnerId, ctx.uid);
    return await ctx.runMutation(
      internal.service.merchant.merchantCouponDefs.createCouponDefCore,
      args
    );
  },
});

export const updateCouponDef = authedAction({
  args: {
    partnerId: v.number(),
    couponDefId: v.string(),
    name: v.optional(v.string()),
    itemLabel: v.optional(v.string()),
    usageRules: v.optional(v.string()),
    status: v.optional(couponDefStatusValidator),
    validityHours: v.optional(v.number()),
    activationKind: v.optional(couponActivationKindArg),
    activationAtMs: v.optional(v.number()),
    activationDelayHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertOps(args.partnerId, ctx.uid);
    return await ctx.runMutation(
      internal.service.merchant.merchantCouponDefs.updateCouponDefCore,
      args
    );
  },
});

export const archiveCouponDef = authedAction({
  args: {
    partnerId: v.number(),
    couponDefId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertOps(args.partnerId, ctx.uid);
    return await ctx.runMutation(
      internal.service.merchant.merchantCouponDefs.archiveCouponDefCore,
      args
    );
  },
});
