import { v } from "convex/values";
import { query } from "../../_generated/server";
import { authedMutation } from "../../custom/session";
import { requireStaff } from "./merchantStaff";

export const validateCouponCode = query({
  args: { merchantId: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("merchant_coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .unique();
    if (!row || row.merchantId !== args.merchantId) {
      return { ok: false as const, error: "not_found" as const };
    }
    if (row.status !== "issued") {
      return { ok: false as const, error: row.status as string };
    }
    if (Date.now() > row.expiresAt) {
      return { ok: false as const, error: "expired" as const };
    }
    return {
      ok: true as const,
      coupon: {
        couponId: row.couponId,
        code: row.code,
        rewardSnapshot: row.rewardSnapshot,
        issuedAt: row.issuedAt,
        expiresAt: row.expiresAt,
      },
    };
  },
});

export const redeemCoupon = authedMutation({
  args: {
    merchantId: v.string(),
    code: v.string(),
    staffNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    const row = await ctx.db
      .query("merchant_coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .unique();
    if (!row || row.merchantId !== args.merchantId) {
      return { ok: false as const, error: "not_found" as const };
    }
    if (row.status !== "issued") {
      return { ok: false as const, error: row.status as string };
    }
    if (Date.now() > row.expiresAt) {
      await ctx.db.patch(row._id, { status: "expired" });
      return { ok: false as const, error: "expired" as const };
    }
    await ctx.db.patch(row._id, {
      status: "redeemed",
      redeemedAt: Date.now(),
      redeemedByStaffUid: ctx.uid,
      staffNote: args.staffNote,
    });
    return { ok: true as const, couponId: row.couponId };
  },
});

export const voidCoupon = authedMutation({
  args: {
    merchantId: v.string(),
    couponId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    const row = await ctx.db
      .query("merchant_coupons")
      .withIndex("by_couponId", (q) => q.eq("couponId", args.couponId))
      .unique();
    if (!row || row.merchantId !== args.merchantId) {
      return { ok: false as const, error: "not_found" as const };
    }
    await ctx.db.patch(row._id, { status: "void" });
    return { ok: true as const };
  },
});
