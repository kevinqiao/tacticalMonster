import { v } from "convex/values";

import { findIdentityByUid } from "./authIdentityHelpers";
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

/**
 * Match web accountId → partner_staff (supports /partner/admin without ?partnerId).
 * Walks all web identities for the accountId so namespaced uid drift still resolves.
 */
export const resolveWebPartnerStaffSession = internalQuery({
  args: {
    accountId: v.string(),
    partnerId: v.optional(v.number()),
  },
  handler: async (ctx, { accountId, partnerId }) => {
    const identities = await ctx.db
      .query("auth_identities")
      .withIndex("by_provider_subject", (q) =>
        q.eq("provider", "web").eq("subject", accountId)
      )
      .collect();

    const uids = new Set<string>();
    for (const id of identities) {
      if (id.uid) uids.add(id.uid);
    }

    // Legacy: staff row uid may not have a by_provider_subject hit if subject drifted.
    if (uids.size === 0) {
      const staffRows =
        partnerId !== undefined
          ? await ctx.db
              .query("partner_staff")
              .withIndex("by_partner", (q) => q.eq("partnerId", partnerId))
              .collect()
          : await ctx.db.query("partner_staff").collect();

      for (const staff of staffRows) {
        if (partnerId !== undefined && staff.partnerId !== partnerId) continue;
        const identity = await findIdentityByUid(ctx, staff.uid);
        if (!identity || identity.provider !== "web") continue;
        if (identity.subject !== accountId) continue;
        return { uid: staff.uid, partnerId: staff.partnerId };
      }
      return null;
    }

    for (const uid of uids) {
      const staffRows = await ctx.db
        .query("partner_staff")
        .withIndex("by_uid", (q) => q.eq("uid", uid))
        .collect();
      for (const staff of staffRows) {
        if (partnerId !== undefined && staff.partnerId !== partnerId) continue;
        return { uid: staff.uid, partnerId: staff.partnerId };
      }
    }

    return null;
  },
});
