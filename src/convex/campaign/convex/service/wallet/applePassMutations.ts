import { v } from "convex/values";

import { internalMutation, internalQuery } from "../../_generated/server";

function randomAuthToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const getCouponForPassInternal = internalQuery({
  args: { couponId: v.string() },
  handler: async (ctx, { couponId }) => {
    return await ctx.db
      .query("coupons")
      .withIndex("by_couponId", (q) => q.eq("couponId", couponId))
      .unique();
  },
});

export const ensurePassAuthToken = internalMutation({
  args: { couponId: v.string(), uid: v.string() },
  handler: async (ctx, { couponId, uid }) => {
    const row = await ctx.db
      .query("coupons")
      .withIndex("by_couponId", (q) => q.eq("couponId", couponId))
      .unique();
    if (!row || row.uid !== uid) {
      return { ok: false as const, error: "not_found" as const };
    }
    if (row.passAuthToken) {
      return {
        ok: true as const,
        authToken: row.passAuthToken,
        couponId: row.couponId,
      };
    }
    const authToken = randomAuthToken();
    const now = Date.now();
    await ctx.db.patch(row._id, {
      passAuthToken: authToken,
      passUpdatedAt: now,
    });
    return { ok: true as const, authToken, couponId: row.couponId };
  },
});

export const bumpPassUpdatedAt = internalMutation({
  args: { couponId: v.string() },
  handler: async (ctx, { couponId }) => {
    const row = await ctx.db
      .query("coupons")
      .withIndex("by_couponId", (q) => q.eq("couponId", couponId))
      .unique();
    if (!row) return { ok: false as const };
    await ctx.db.patch(row._id, { passUpdatedAt: Date.now() });
    return { ok: true as const, couponId: row.couponId };
  },
});

export const registerDevice = internalMutation({
  args: {
    deviceLibraryIdentifier: v.string(),
    pushToken: v.string(),
    passTypeIdentifier: v.string(),
    serialNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("wallet_pass_devices")
      .withIndex("by_serial_device", (q) =>
        q.eq("serialNumber", args.serialNumber).eq("deviceLibraryIdentifier", args.deviceLibraryIdentifier)
      )
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        pushToken: args.pushToken,
        passTypeIdentifier: args.passTypeIdentifier,
        updatedAt: now,
      });
      return { ok: true as const, created: false };
    }
    await ctx.db.insert("wallet_pass_devices", {
      deviceLibraryIdentifier: args.deviceLibraryIdentifier,
      pushToken: args.pushToken,
      passTypeIdentifier: args.passTypeIdentifier,
      serialNumber: args.serialNumber,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true as const, created: true };
  },
});

export const unregisterDevice = internalMutation({
  args: {
    deviceLibraryIdentifier: v.string(),
    passTypeIdentifier: v.string(),
    serialNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("wallet_pass_devices")
      .withIndex("by_serial_device", (q) =>
        q.eq("serialNumber", args.serialNumber).eq("deviceLibraryIdentifier", args.deviceLibraryIdentifier)
      )
      .unique();
    if (existing && existing.passTypeIdentifier === args.passTypeIdentifier) {
      await ctx.db.delete(existing._id);
    }
    return { ok: true as const };
  },
});

export const listUpdatedSerialsForDevice = internalQuery({
  args: {
    deviceLibraryIdentifier: v.string(),
    passTypeIdentifier: v.string(),
    passesUpdatedSince: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const regs = await ctx.db
      .query("wallet_pass_devices")
      .withIndex("by_device_passType", (q) =>
        q
          .eq("deviceLibraryIdentifier", args.deviceLibraryIdentifier)
          .eq("passTypeIdentifier", args.passTypeIdentifier)
      )
      .collect();

    const sinceMs = args.passesUpdatedSince
      ? Number(args.passesUpdatedSince) || Date.parse(args.passesUpdatedSince)
      : NaN;
    const serials: string[] = [];
    let lastUpdated = 0;

    for (const reg of regs) {
      const coupon = await ctx.db
        .query("coupons")
        .withIndex("by_couponId", (q) => q.eq("couponId", reg.serialNumber))
        .unique();
      if (!coupon) continue;
      const updated = coupon.passUpdatedAt ?? coupon.issuedAt;
      if (!Number.isFinite(sinceMs) || updated > sinceMs) {
        serials.push(reg.serialNumber);
      }
      if (updated > lastUpdated) lastUpdated = updated;
    }

    return {
      serialNumbers: serials,
      lastUpdated: String(lastUpdated || Date.now()),
    };
  },
});

export const listPushTokensForSerial = internalQuery({
  args: { serialNumber: v.string() },
  handler: async (ctx, { serialNumber }) => {
    const rows = await ctx.db
      .query("wallet_pass_devices")
      .withIndex("by_serial", (q) => q.eq("serialNumber", serialNumber))
      .collect();
    return rows.map((r) => r.pushToken);
  },
});

export const getCouponBySerialForPass = internalQuery({
  args: {
    serialNumber: v.string(),
    passTypeIdentifier: v.string(),
    authToken: v.string(),
  },
  handler: async (ctx, args) => {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_couponId", (q) => q.eq("couponId", args.serialNumber))
      .unique();
    if (!coupon?.passAuthToken || coupon.passAuthToken !== args.authToken) {
      return null;
    }
    return coupon;
  },
});
