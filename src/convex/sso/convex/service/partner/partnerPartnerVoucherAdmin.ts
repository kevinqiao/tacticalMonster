"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { authedAction } from "../../custom/session";
import { portalPartnerVoucherRequest } from "../bridge/portalPartnerVoucherSkuBridge";

async function authorize(
  ctx: Parameters<typeof portalPartnerVoucherRequest>[0] extends never ? never : any,
  partnerId: number,
  minRole: "viewer" | "admin"
) {
  const result = await ctx.runQuery(
    internal.service.partner.partnerAdmin.assertPartnerVoucherAdminInternal,
    { partnerId, uid: ctx.identity.subject, minRole }
  );
  if (!result.ok) throw new Error(result.error);
}

export const listPartnerVouchers = authedAction({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    await authorize(ctx, partnerId, "viewer");
    return await portalPartnerVoucherRequest({ partnerId, operation: "list" });
  },
});

export const confirmPartnerVoucherUse = authedAction({
  args: { partnerId: v.number(), itemId: v.string() },
  handler: async (ctx, { partnerId, itemId }) => {
    await authorize(ctx, partnerId, "admin");
    return await portalPartnerVoucherRequest({ partnerId, operation: "confirm", itemId });
  },
});

export const rejectPartnerVoucherUse = authedAction({
  args: { partnerId: v.number(), itemId: v.string() },
  handler: async (ctx, { partnerId, itemId }) => {
    await authorize(ctx, partnerId, "admin");
    return await portalPartnerVoucherRequest({ partnerId, operation: "reject", itemId });
  },
});

export const redeemPartnerVoucher = authedAction({
  args: { partnerId: v.number(), code: v.string() },
  handler: async (ctx, { partnerId, code }) => {
    await authorize(ctx, partnerId, "admin");
    return await portalPartnerVoucherRequest({ partnerId, operation: "redeem", code: code.trim() });
  },
});

export const voidPartnerVoucher = authedAction({
  args: { partnerId: v.number(), itemId: v.string() },
  handler: async (ctx, { partnerId, itemId }) => {
    await authorize(ctx, partnerId, "admin");
    return await portalPartnerVoucherRequest({ partnerId, operation: "void", itemId });
  },
});
