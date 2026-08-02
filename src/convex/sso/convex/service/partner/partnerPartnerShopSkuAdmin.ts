"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { authedAction } from "../../custom/session";
import {
  portalPartnerShopSkuRequest,
  type PortalPartnerShopSkuKind,
} from "../bridge/portalPartnerVoucherSkuBridge";

async function authorize(ctx: any, partnerId: number, minRole: "viewer" | "admin") {
  const result = await ctx.runQuery(
    internal.service.partner.partnerAdmin.assertPartnerVoucherAdminInternal,
    { partnerId, uid: ctx.identity.subject, minRole }
  );
  if (!result.ok) throw new Error(result.error);
}

const kind = v.union(v.literal("virtual"), v.literal("voucher"));
const optionalNullableNumber = v.optional(v.union(v.number(), v.null()));

export const listPartnerShopSkus = authedAction({
  args: { partnerId: v.number(), kind: v.optional(kind) },
  handler: async (ctx, args) => {
    await authorize(ctx, args.partnerId, "viewer");
    return await portalPartnerShopSkuRequest({ ...args, operation: "list" });
  },
});

export const upsertPartnerShopSku = authedAction({
  args: {
    partnerId: v.number(),
    kind,
    skuId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    priceCoins: v.number(),
    grantTicketCount: v.optional(v.number()),
    /** @deprecated Prefer grantTicketCount. */
    grantReplayTokenCount: v.optional(v.number()),
    weeklyPurchaseLimit: optionalNullableNumber,
    sortOrder: v.optional(v.number()),
    active: v.optional(v.boolean()),
    voucherRewardText: v.optional(v.string()),
    voucherValidityDays: optionalNullableNumber,
    listInShop: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await authorize(ctx, args.partnerId, "admin");
    const grantTicketCount = args.grantTicketCount ?? args.grantReplayTokenCount;
    return await portalPartnerShopSkuRequest({
      ...args,
      grantTicketCount,
      kind: args.kind as PortalPartnerShopSkuKind,
      operation: "upsert",
    });
  },
});

export const setPartnerShopSkuActive = authedAction({
  args: { partnerId: v.number(), skuId: v.string(), active: v.boolean() },
  handler: async (ctx, args) => {
    await authorize(ctx, args.partnerId, "admin");
    return await portalPartnerShopSkuRequest({ ...args, operation: "setActive" });
  },
});

export const deletePartnerShopSku = authedAction({
  args: { partnerId: v.number(), skuId: v.string() },
  handler: async (ctx, args) => {
    await authorize(ctx, args.partnerId, "admin");
    return await portalPartnerShopSkuRequest({ ...args, operation: "delete" });
  },
});
