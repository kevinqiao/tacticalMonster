import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";

function campaignVoucherGrantSource(grantKey: string): string {
  return `campaign:${grantKey}`;
}

function campaignVoucherCode(preferredCode?: string): string | undefined {
  const normalized = preferredCode?.trim().toUpperCase();
  return normalized || undefined;
}

/**
 * Grants a partner-owned voucher SKU for a Campaign reward.
 * Display fields and expiry are always derived from the Portal SKU, not HTTP input.
 */
export const grantCampaignVoucher = internalMutation({
  args: {
    uid: v.string(),
    partnerId: v.number(),
    campaignId: v.string(),
    portalSkuId: v.string(),
    grantKey: v.string(),
    preferredCode: v.optional(v.string()),
    maxCouponsPerPlayer: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const source = campaignVoucherGrantSource(args.grantKey);
    const existing = await ctx.db
      .query("portal_backpack_items")
      .withIndex("by_source", (q) => q.eq("source", source))
      .first();
    if (existing) {
      return {
        ok: true as const,
        itemId: String(existing._id),
        code: existing.code,
        deduped: true as const,
      };
    }

    const sku = await ctx.db
      .query("portal_shop_skus")
      .withIndex("by_skuId", (q) => q.eq("skuId", args.portalSkuId))
      .unique();
    if (!sku || sku.skuKind !== "voucher" || !sku.partnerIds?.includes(args.partnerId)) {
      return { ok: false as const, error: "voucher_sku_not_found" as const };
    }

    if (args.maxCouponsPerPlayer != null && args.maxCouponsPerPlayer >= 1) {
      const rows = await ctx.db
        .query("portal_backpack_items")
        .withIndex("by_campaignId_uid", (q) =>
          q.eq("campaignId", args.campaignId).eq("uid", args.uid)
        )
        .collect();
      const count = rows.filter(
        (row) =>
          row.status === "owned" || row.status === "pending_use" || row.status === "redeemed"
      ).length;
      if (count >= args.maxCouponsPerPlayer) {
        return { ok: false as const, error: "coupon_limit_reached" as const };
      }
    }

    const preferredCode = campaignVoucherCode(args.preferredCode);
    if (preferredCode) {
      const codeTaken = await ctx.db
        .query("portal_backpack_items")
        .withIndex("by_code", (q) => q.eq("code", preferredCode))
        .unique();
      if (codeTaken) {
        return { ok: false as const, error: "voucher_code_taken" as const };
      }
    }

    const now = Date.now();
    const expiresAt =
      sku.voucherValidityDays != null
        ? now + sku.voucherValidityDays * 24 * 60 * 60 * 1000
        : undefined;
    const code =
      preferredCode ??
      `PV-${now.toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const itemId = await ctx.db.insert("portal_backpack_items", {
      uid: args.uid,
      skuId: sku.skuId,
      title: sku.title,
      rewardText: sku.voucherRewardText,
      code,
      status: "owned",
      partnerId: args.partnerId,
      campaignId: args.campaignId,
      source,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true as const, itemId: String(itemId), code, deduped: false as const };
  },
});
