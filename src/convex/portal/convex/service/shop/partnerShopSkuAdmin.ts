import { v } from "convex/values";

import { internalMutation, internalQuery } from "../../_generated/server";
import { resolveGrantTicketCount } from "../../data/portalShopCatalog";

const skuKind = v.union(v.literal("virtual"), v.literal("voucher"));

const skuInput = {
  partnerId: v.number(),
  skuId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  priceCoins: v.number(),
  grantTicketCount: v.optional(v.number()),
  /** @deprecated Prefer grantTicketCount. */
  grantReplayTokenCount: v.optional(v.number()),
  weeklyPurchaseLimit: v.optional(v.union(v.number(), v.null())),
  sortOrder: v.optional(v.number()),
  active: v.optional(v.boolean()),
  voucherRewardText: v.optional(v.string()),
  voucherValidityDays: v.optional(v.union(v.number(), v.null())),
  listInShop: v.optional(v.boolean()),
};

function skuPrefix(kind: "virtual" | "voucher", partnerId: number) {
  return `partner_${partnerId}_${kind}_`;
}

function validateSku(args: {
  partnerId: number;
  skuId: string;
  title: string;
  priceCoins: number;
  grantTicketCount?: number;
  grantReplayTokenCount?: number;
  voucherValidityDays?: number | null;
}) {
  if (!Number.isInteger(args.partnerId) || args.partnerId < 0) throw new Error("invalid_partner");
  if (!args.skuId.startsWith(skuPrefix("virtual", args.partnerId)) &&
      !args.skuId.startsWith(skuPrefix("voucher", args.partnerId))) {
    throw new Error("sku_id_must_be_partner_scoped");
  }
  if (!args.title.trim() || args.title.trim().length > 120) throw new Error("invalid_title");
  if (!Number.isInteger(args.priceCoins) || args.priceCoins < 0 || args.priceCoins > 1_000_000) {
    throw new Error("invalid_price");
  }
  const tickets = resolveGrantTicketCount(args);
  if (args.grantTicketCount != null || args.grantReplayTokenCount != null) {
    if (!Number.isInteger(tickets) || tickets < 0) throw new Error("invalid_grant");
  }
  if (args.voucherValidityDays != null &&
      (!Number.isInteger(args.voucherValidityDays) || args.voucherValidityDays <= 0)) {
    throw new Error("invalid_validity");
  }
}

export const listPartnerShopSkusInternal = internalQuery({
  args: { partnerId: v.number(), kind: v.optional(skuKind) },
  handler: async (ctx, { partnerId, kind }) => {
    const rows = await ctx.db.query("portal_shop_skus").collect();
    return rows
      .filter((row) => row.partnerIds?.includes(partnerId) && (!kind || row.skuKind === kind))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.skuId.localeCompare(b.skuId))
      .map((row) => {
        const grantTicketCount = resolveGrantTicketCount(row);
        return {
          skuId: row.skuId,
          skuKind: row.skuKind ?? "virtual",
          title: row.title,
          description: row.description ?? "",
          priceCoins: row.priceCoins,
          grantTicketCount,
          grantReplayTokenCount: grantTicketCount,
          weeklyPurchaseLimit: row.weeklyPurchaseLimit ?? null,
          sortOrder: row.sortOrder,
          active: row.active,
          voucherRewardText: row.voucherRewardText ?? "",
          voucherValidityDays: row.voucherValidityDays ?? null,
          listInShop: row.listInShop !== false,
        };
      });
  },
});

export const upsertPartnerShopSkuInternal = internalMutation({
  args: { kind: skuKind, ...skuInput },
  handler: async (ctx, args) => {
    validateSku(args);
    if (!args.skuId.startsWith(skuPrefix(args.kind, args.partnerId))) {
      throw new Error("sku_id_kind_mismatch");
    }
    const existing = await ctx.db
      .query("portal_shop_skus")
      .withIndex("by_skuId", (q) => q.eq("skuId", args.skuId))
      .unique();
    if (existing && !existing.partnerIds?.includes(args.partnerId)) throw new Error("sku_owned_by_other");

    const grantTicketCount =
      args.kind === "virtual" ? resolveGrantTicketCount(args) : undefined;
    const payload = {
      skuId: args.skuId,
      skuKind: args.kind,
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      priceCoins: args.priceCoins,
      grantTicketCount,
      weeklyPurchaseLimit: args.weeklyPurchaseLimit ?? undefined,
      sortOrder: args.sortOrder ?? 1000,
      active: args.active ?? true,
      partnerIds: [args.partnerId],
      shopSection: args.kind,
      voucherRewardText: args.kind === "voucher" ? args.voucherRewardText?.trim() || undefined : undefined,
      voucherValidityDays: args.kind === "voucher" ? args.voucherValidityDays ?? undefined : undefined,
      listInShop: args.kind === "voucher" ? args.listInShop !== false : undefined,
    };
    if (existing) await ctx.db.patch(existing._id, payload);
    else await ctx.db.insert("portal_shop_skus", payload);
    return { ok: true as const };
  },
});

export const setPartnerShopSkuActiveInternal = internalMutation({
  args: { partnerId: v.number(), skuId: v.string(), active: v.boolean() },
  handler: async (ctx, { partnerId, skuId, active }) => {
    const row = await ctx.db.query("portal_shop_skus").withIndex("by_skuId", (q) => q.eq("skuId", skuId)).unique();
    if (!row || !row.partnerIds?.includes(partnerId)) throw new Error("not_found");
    await ctx.db.patch(row._id, { active });
    return { ok: true as const };
  },
});

export const deletePartnerShopSkuInternal = internalMutation({
  args: { partnerId: v.number(), skuId: v.string() },
  handler: async (ctx, { partnerId, skuId }) => {
    const row = await ctx.db.query("portal_shop_skus").withIndex("by_skuId", (q) => q.eq("skuId", skuId)).unique();
    if (!row || !row.partnerIds?.includes(partnerId)) throw new Error("not_found");
    await ctx.db.delete(row._id);
    return { ok: true as const };
  },
});
