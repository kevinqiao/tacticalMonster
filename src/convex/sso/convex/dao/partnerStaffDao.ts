import { v } from "convex/values";

import { internalQuery } from "../_generated/server";

export const findByPartnerUid = internalQuery({
  args: { partnerId: v.number(), uid: v.string() },
  handler: async (ctx, { partnerId, uid }) => {
    return await ctx.db
      .query("partner_staff")
      .withIndex("by_partner_uid", (q) => q.eq("partnerId", partnerId).eq("uid", uid))
      .unique();
  },
});

export const anyForUid = internalQuery({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const row = await ctx.db
      .query("partner_staff")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .first();
    return row !== null;
  },
});

/** Match web accountId to a partner_staff row (supports /partner/admin without ?partnerId). */
export const resolveWebPartnerStaffSession = internalQuery({
  args: {
    accountId: v.string(),
    partnerId: v.optional(v.number()),
  },
  handler: async (ctx, { accountId, partnerId }) => {
    const staffRows =
      partnerId !== undefined
        ? await ctx.db
            .query("partner_staff")
            .withIndex("by_partner", (q) => q.eq("partnerId", partnerId))
            .collect()
        : await ctx.db.query("partner_staff").collect();

    for (const staff of staffRows) {
      if (partnerId !== undefined && staff.partnerId !== partnerId) continue;

      const identity = await ctx.db
        .query("auth_identities")
        .withIndex("by_uid", (q) => q.eq("uid", staff.uid))
        .first();
      if (!identity || identity.provider !== "web") continue;
      if (identity.subject !== accountId) continue;

      return { uid: staff.uid, partnerId: staff.partnerId };
    }

    return null;
  },
});
