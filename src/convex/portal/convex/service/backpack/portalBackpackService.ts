import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { authedMutation, authedQuery } from "../../custom/session";

const backpackStatus = v.union(
  v.literal("owned"),
  v.literal("pending_use"),
  v.literal("redeemed"),
  v.literal("expired"),
  v.literal("void")
);

function voucherCode(): string {
  return `PV-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

/** Player-facing backpack, including historical voucher states. */
export const listMyBackpackItems = authedQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("portal_backpack_items")
      .withIndex("by_uid_createdAt", (q) => q.eq("uid", ctx.uid))
      .order("desc")
      .collect();
    return rows.map((row) => ({
      itemId: String(row._id),
      skuId: row.skuId,
      title: row.title,
      rewardText: row.rewardText ?? "",
      code: row.code,
      status: row.expiresAt != null && row.expiresAt <= now && row.status === "owned"
        ? "expired"
        : row.status,
      expiresAt: row.expiresAt ?? null,
      useRequestedAt: row.useRequestedAt ?? null,
      redeemedAt: row.redeemedAt ?? null,
      createdAt: row.createdAt,
    }));
  },
});

export const requestUseBackpackVoucher = authedMutation({
  args: { itemId: v.id("portal_backpack_items") },
  handler: async (ctx, { itemId }) => {
    const item = await ctx.db.get(itemId);
    if (!item || item.uid !== ctx.uid) return { ok: false as const, error: "not_found" as const };
    if (item.expiresAt != null && item.expiresAt <= Date.now()) {
      await ctx.db.patch(itemId, { status: "expired", updatedAt: Date.now() });
      return { ok: false as const, error: "expired" as const };
    }
    if (item.status !== "owned") {
      return { ok: false as const, error: "not_available" as const };
    }
    const now = Date.now();
    await ctx.db.patch(itemId, {
      status: "pending_use",
      useRequestedAt: now,
      updatedAt: now,
    });
    return { ok: true as const };
  },
});

export const cancelUseBackpackVoucher = authedMutation({
  args: { itemId: v.id("portal_backpack_items") },
  handler: async (ctx, { itemId }) => {
    const item = await ctx.db.get(itemId);
    if (!item || item.uid !== ctx.uid) return { ok: false as const, error: "not_found" as const };
    if (item.status !== "pending_use") {
      return { ok: false as const, error: "not_pending" as const };
    }
    await ctx.db.patch(itemId, {
      status: "owned",
      useRequestedAt: undefined,
      updatedAt: Date.now(),
    });
    return { ok: true as const };
  },
});

/** Shop/campaign fulfillment entry point. Never accept voucher display details from clients. */
export const grantBackpackVoucher = internalMutation({
  args: {
    uid: v.string(),
    skuId: v.string(),
    title: v.string(),
    rewardText: v.optional(v.string()),
    partnerId: v.optional(v.number()),
    campaignId: v.optional(v.string()),
    source: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    preferredCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.source) {
      const existing = await ctx.db
        .query("portal_backpack_items")
        .filter((q) => q.eq(q.field("source"), args.source))
        .first();
      if (existing) return { ok: true as const, itemId: existing._id };
    }
    const now = Date.now();
    const itemId = await ctx.db.insert("portal_backpack_items", {
      ...args,
      code: args.preferredCode?.trim().toUpperCase() || voucherCode(),
      status: "owned",
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true as const, itemId };
  },
});

/** Partner bridge primitives; authorization belongs to the SSO/HTTP boundary. */
export const listPartnerPendingVouchers = internalMutation({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("portal_backpack_items")
      .withIndex("by_partner_status", (q) =>
        q.eq("partnerId", partnerId).eq("status", "pending_use")
      )
      .collect();
    return rows
      .filter((row) => row.expiresAt == null || row.expiresAt > now)
      .map((row) => ({
        itemId: String(row._id),
        uid: row.uid,
        skuId: row.skuId,
        title: row.title,
        rewardText: row.rewardText ?? "",
        code: row.code,
        useRequestedAt: row.useRequestedAt ?? null,
        expiresAt: row.expiresAt ?? null,
        createdAt: row.createdAt,
      }));
  },
});

/** Alias kept for the partner/SSO bridge contract. */
export const listPartnerVouchers = listPartnerPendingVouchers;

export const confirmPartnerVoucherUse = internalMutation({
  args: { partnerId: v.number(), itemId: v.id("portal_backpack_items") },
  handler: async (ctx, { partnerId, itemId }) => {
    const item = await ctx.db.get(itemId);
    if (!item || item.partnerId !== partnerId) {
      return { ok: false as const, error: "not_found" as const };
    }
    if (item.expiresAt != null && item.expiresAt <= Date.now()) {
      await ctx.db.patch(itemId, { status: "expired", updatedAt: Date.now() });
      return { ok: false as const, error: "expired" as const };
    }
    if (item.status !== "pending_use") {
      return { ok: false as const, error: "not_pending" as const };
    }
    const now = Date.now();
    await ctx.db.patch(itemId, {
      status: "redeemed",
      redeemedAt: now,
      redeemChannel: "player_request",
      updatedAt: now,
    });
    return { ok: true as const };
  },
});

export const rejectPartnerVoucherUse = internalMutation({
  args: { partnerId: v.number(), itemId: v.id("portal_backpack_items") },
  handler: async (ctx, { partnerId, itemId }) => {
    const item = await ctx.db.get(itemId);
    if (!item || item.partnerId !== partnerId) {
      return { ok: false as const, error: "not_found" as const };
    }
    if (item.status !== "pending_use") {
      return { ok: false as const, error: "not_pending" as const };
    }
    await ctx.db.patch(itemId, {
      status: "owned",
      useRequestedAt: undefined,
      updatedAt: Date.now(),
    });
    return { ok: true as const };
  },
});

export const redeemPartnerVoucherByCode = internalMutation({
  args: { partnerId: v.number(), code: v.string() },
  handler: async (ctx, { partnerId, code }) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return { ok: false as const, error: "invalid_code" as const };
    const item = await ctx.db
      .query("portal_backpack_items")
      .withIndex("by_code", (q) => q.eq("code", normalized))
      .unique();
    if (!item || item.partnerId !== partnerId) {
      return { ok: false as const, error: "not_found" as const };
    }
    if (item.expiresAt != null && item.expiresAt <= Date.now()) {
      await ctx.db.patch(item._id, { status: "expired", updatedAt: Date.now() });
      return { ok: false as const, error: "expired" as const };
    }
    if (!["owned", "pending_use"].includes(item.status)) {
      return { ok: false as const, error: "not_redeemable" as const };
    }
    const now = Date.now();
    await ctx.db.patch(item._id, {
      status: "redeemed",
      redeemedAt: now,
      redeemChannel: "partner_admin",
      updatedAt: now,
    });
    return { ok: true as const, itemId: String(item._id), title: item.title };
  },
});

/** Campaign bridge: mirror a Campaign coupon's terminal status onto its same-code backpack item. */
export const syncCampaignVoucherStatusByCode = internalMutation({
  args: {
    partnerId: v.number(),
    campaignId: v.string(),
    code: v.string(),
    status: v.union(v.literal("redeemed"), v.literal("void")),
    actorUid: v.optional(v.string()),
    storeId: v.optional(v.string()),
    staffNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();
    if (!code) return { ok: false as const, error: "invalid_code" as const };
    const item = await ctx.db
      .query("portal_backpack_items")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (
      !item ||
      item.partnerId !== args.partnerId ||
      item.campaignId !== args.campaignId
    ) {
      return { ok: false as const, error: "not_found" as const };
    }
    if (item.status === args.status) {
      return { ok: true as const, itemId: String(item._id), deduped: true as const };
    }

    const now = Date.now();
    await ctx.db.patch(item._id, {
      status: args.status,
      ...(args.status === "redeemed"
        ? {
            redeemedAt: now,
            redeemChannel: "store_staff" as const,
            ...(args.storeId ? { redeemedAtStoreId: args.storeId } : {}),
            ...(args.actorUid ? { redeemedByStaffUid: args.actorUid } : {}),
            ...(args.staffNote ? { staffNote: args.staffNote } : {}),
          }
        : {}),
      updatedAt: now,
    });
    return { ok: true as const, itemId: String(item._id), deduped: false as const };
  },
});

export const voidPartnerVoucher = internalMutation({
  args: { partnerId: v.number(), itemId: v.id("portal_backpack_items") },
  handler: async (ctx, { partnerId, itemId }) => {
    const item = await ctx.db.get(itemId);
    if (!item || item.partnerId !== partnerId) {
      return { ok: false as const, error: "not_found" as const };
    }
    if (!["owned", "pending_use"].includes(item.status)) {
      return { ok: false as const, error: "not_voidable" as const };
    }
    await ctx.db.patch(itemId, { status: "void", updatedAt: Date.now() });
    return { ok: true as const };
  },
});

export const redeemPartnerVoucher = internalMutation({
  args: {
    itemId: v.id("portal_backpack_items"),
    channel: v.optional(
      v.union(
        v.literal("partner_admin"),
        v.literal("player_request"),
        v.literal("store_staff")
      )
    ),
  },
  handler: async (ctx, { itemId, channel }) => {
    const item = await ctx.db.get(itemId);
    if (!item || !["owned", "pending_use"].includes(item.status)) {
      return { ok: false as const, error: "not_redeemable" as const };
    }
    const now = Date.now();
    await ctx.db.patch(itemId, {
      status: "redeemed",
      redeemedAt: now,
      redeemChannel: channel ?? "partner_admin",
      updatedAt: now,
    });
    return { ok: true as const };
  },
});

export const backpackItemStatusValidator = backpackStatus;
