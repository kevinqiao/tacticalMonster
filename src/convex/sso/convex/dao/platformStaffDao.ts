import { v } from "convex/values";

import { internalMutation, internalQuery } from "../_generated/server";
import type { PlatformStaffRole } from "../service/partner/platformStaff";

export const findByUid = internalQuery({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    return await ctx.db
      .query("platform_staff")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
  },
});

export const anyExists = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("platform_staff").first();
    return row !== null;
  },
});

export const insertStaff = internalMutation({
  args: {
    uid: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("viewer")),
  },
  handler: async (ctx, { uid, role }) => {
    const existing = await ctx.db
      .query("platform_staff")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("platform_staff", {
      uid,
      role: role as PlatformStaffRole,
      createdAt: Date.now(),
    });
  },
});
