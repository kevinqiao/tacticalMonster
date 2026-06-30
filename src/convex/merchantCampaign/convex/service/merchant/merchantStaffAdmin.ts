import { v } from "convex/values";

import type { QueryCtx } from "../../_generated/server";
import { internalQuery } from "../../_generated/server";
import { authedMutation, authedQuery } from "../../custom/session";
import {
  getMerchantStaffRow,
  requireStaff,
  type MerchantStaffRole,
} from "./merchantStaff";
import { merchantStaffRoleValidator } from "./validators";

async function getMerchantById(ctx: QueryCtx, merchantId: string) {
  return await ctx.db
    .query("merchants")
    .withIndex("by_merchantId", (q) => q.eq("merchantId", merchantId))
    .unique();
}

export const assertMerchantStaffInternal = internalQuery({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const row = await ctx.db
      .query("merchant_staff")
      .withIndex("by_uid", (q) => q.eq("uid", uid.trim()))
      .first();
    if (!row) {
      return { ok: false as const, error: "not_merchant_staff" as const };
    }
    return { ok: true as const };
  },
});

export const assertMerchantOwnerInternal = internalQuery({
  args: {
    merchantId: v.string(),
    uid: v.string(),
  },
  handler: async (ctx, { merchantId, uid }) => {
    const merchant = await getMerchantById(ctx, merchantId);
    if (!merchant) {
      return { ok: false as const, error: "not_found" as const };
    }
    const row = await getMerchantStaffRow(ctx, merchantId, uid);
    if (!row || row.role !== "owner") {
      return { ok: false as const, error: "forbidden" as const };
    }
    return {
      ok: true as const,
      partnerId: typeof merchant.partnerId === "number" ? merchant.partnerId : 0,
    };
  },
});

export const listMerchantTeam = authedQuery({
  args: { merchantId: v.string() },
  handler: async (ctx, { merchantId }) => {
    const actor = await requireStaff(ctx, { merchantId, uid: ctx.uid });
    const merchant = await getMerchantById(ctx, merchantId);
    if (!merchant) throw new Error("not_found");

    const rows = await ctx.db
      .query("merchant_staff")
      .withIndex("by_merchant", (q) => q.eq("merchantId", merchantId))
      .collect();

    return {
      merchantId,
      merchantName: merchant.name,
      partnerId: typeof merchant.partnerId === "number" ? merchant.partnerId : 0,
      myRole: actor.role as MerchantStaffRole,
      members: rows
        .map((row) => ({
          uid: row.uid,
          role: row.role as MerchantStaffRole,
          createdAt: row.createdAt,
        }))
        .sort((a, b) => a.createdAt - b.createdAt),
    };
  },
});

export const addMerchantStaff = authedMutation({
  args: {
    merchantId: v.string(),
    uid: v.string(),
    role: merchantStaffRoleValidator,
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid, minRole: "owner" });

    const targetUid = args.uid.trim();
    if (!targetUid) throw new Error("uid_required");
    if (args.role === "owner") throw new Error("cannot_add_owner");

    const merchant = await getMerchantById(ctx, args.merchantId);
    if (!merchant) throw new Error("not_found");

    const existing = await getMerchantStaffRow(ctx, args.merchantId, targetUid);
    if (existing) throw new Error("already_member");

    await ctx.db.insert("merchant_staff", {
      merchantId: args.merchantId,
      uid: targetUid,
      role: args.role,
      createdAt: Date.now(),
    });
    return { ok: true as const, uid: targetUid };
  },
});

export const removeMerchantStaff = authedMutation({
  args: {
    merchantId: v.string(),
    uid: v.string(),
  },
  handler: async (ctx, { merchantId, uid }) => {
    await requireStaff(ctx, { merchantId, uid: ctx.uid, minRole: "owner" });

    const targetUid = uid.trim();
    const row = await getMerchantStaffRow(ctx, merchantId, targetUid);
    if (!row) throw new Error("not_found");

    const actorUid = ctx.uid;
    if (row.role === "owner" && actorUid !== targetUid) {
      const owners = await ctx.db
        .query("merchant_staff")
        .withIndex("by_merchant", (q) => q.eq("merchantId", merchantId))
        .collect();
      const ownerCount = owners.filter((o) => o.role === "owner").length;
      if (ownerCount <= 1) throw new Error("last_owner");
    }

    await ctx.db.delete(row._id);
    return { ok: true as const };
  },
});
