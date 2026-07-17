import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";

function couponActivatesAt(row: { activatesAt?: number; issuedAt: number }): number {
  return typeof row.activatesAt === "number" ? row.activatesAt : row.issuedAt;
}

export const validateCouponCodeCore = internalQuery({
  args: { partnerId: v.number(), code: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .unique();
    if (!row || row.partnerId !== args.partnerId) {
      return { ok: false as const, error: "not_found" as const };
    }
    if (row.status !== "issued") {
      return { ok: false as const, error: row.status as string };
    }
    const now = Date.now();
    const activatesAt = couponActivatesAt(row);
    if (now < activatesAt) {
      return { ok: false as const, error: "not_yet_active" as const };
    }
    if (now > row.expiresAt) {
      return { ok: false as const, error: "expired" as const };
    }
    return {
      ok: true as const,
      coupon: {
        couponId: row.couponId,
        code: row.code,
        rewardSnapshot: row.rewardSnapshot,
        issuedAt: row.issuedAt,
        activatesAt,
        expiresAt: row.expiresAt,
      },
    };
  },
});

export const redeemCouponCore = internalMutation({
  args: {
    storeId: v.string(),
    partnerId: v.number(),
    uid: v.string(),
    code: v.string(),
    staffNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .unique();
    if (!row || row.partnerId !== args.partnerId) {
      return { ok: false as const, error: "not_found" as const };
    }
    if (row.status !== "issued") {
      return { ok: false as const, error: row.status as string };
    }
    const now = Date.now();
    const activatesAt = couponActivatesAt(row);
    if (now < activatesAt) {
      return { ok: false as const, error: "not_yet_active" as const };
    }
    if (now > row.expiresAt) {
      await ctx.db.patch(row._id, { status: "expired" });
      return { ok: false as const, error: "expired" as const };
    }
    await ctx.db.patch(row._id, {
      status: "redeemed",
      redeemedAt: now,
      redeemedAtStoreId: args.storeId,
      redeemedByStaffUid: args.uid,
      staffNote: args.staffNote,
    });
    return { ok: true as const, couponId: row.couponId };
  },
});

export const voidCouponCore = internalMutation({
  args: {
    partnerId: v.number(),
    couponId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("coupons")
      .withIndex("by_couponId", (q) => q.eq("couponId", args.couponId))
      .unique();
    if (!row || row.partnerId !== args.partnerId) {
      return { ok: false as const, error: "not_found" };
    }
    await ctx.db.patch(row._id, { status: "void" });
    return { ok: true as const };
  },
});
