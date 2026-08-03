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
  couponDefStatusValidator,
} from "./validators";
import { listPartnerVoucherSkusViaHttp } from "../bridge/portalPartnerVoucherGrantBridge";

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

async function assertOps(partnerId: number, uid: string, minRole?: "viewer" | "admin") {
  await requirePartnerCampaignOpsViaHttp({
    partnerId,
    uid,
    minRole: minRole ?? "viewer",
  });
}

// `upsertPartnerBrand` removed — partner_brands table no longer exists;
// slug→partnerId resolves only via SSO `partner.slug`.

/** Create campaign (tournamentId = Portal desk SoT). */
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
    tournamentId: v.optional(v.string()),
    rewardModel: v.optional(campaignRewardModelValidator),
    playLimits: v.optional(playLimitsValidator),
    replaySettings: v.optional(replaySettingsValidator),
    rewardRules: v.optional(v.array(rewardRuleValidator)),
  },
  handler: async (ctx, args) => {
    await assertOps(args.partnerId, ctx.uid);
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
    tournamentId: v.optional(v.string()),
    rewardModel: v.optional(campaignRewardModelValidator),
    playLimits: v.optional(playLimitsValidator),
    replaySettings: v.optional(v.union(replaySettingsValidator, v.null())),
    rewardRules: v.optional(v.array(rewardRuleValidator)),
  },
  handler: async (ctx, args) => {
    await assertOps(args.partnerId, ctx.uid);
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

/** Portal voucher SKUs are the preferred reward products for new campaigns. */
export const listPartnerVoucherSkusForStaff = authedAction({
  args: { partnerId: v.number() },
  handler: async (ctx, args) => {
    await assertOps(args.partnerId, ctx.uid);
    const result = await listPartnerVoucherSkusViaHttp(args.partnerId);
    if (!result.ok) throw new Error(result.error);
    return result.skus;
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
