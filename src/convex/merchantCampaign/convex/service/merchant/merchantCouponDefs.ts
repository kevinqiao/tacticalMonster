import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { authedMutation, authedQuery } from "../../custom/session";
import { newId, requireStaff } from "./merchantStaff";
import {
  couponDefStatusValidator,
} from "./validators";

export async function getCouponDefForMerchant(
  ctx: QueryCtx | MutationCtx,
  args: { merchantId: string; couponDefId: string }
): Promise<Doc<"merchant_coupon_defs"> | null> {
  const row = await ctx.db
    .query("merchant_coupon_defs")
    .withIndex("by_couponDefId", (q) => q.eq("couponDefId", args.couponDefId))
    .unique();
  if (!row || row.merchantId !== args.merchantId) {
    return null;
  }
  return row;
}

/** Copy active def rewards onto campaign rules; legacy rules without couponDefId pass through. */
export async function materializeCampaignRewardRules(
  ctx: QueryCtx | MutationCtx,
  merchantId: string,
  rewardRules: Doc<"merchant_campaigns">["rewardRules"]
): Promise<Doc<"merchant_campaigns">["rewardRules"]> {
  const out: Doc<"merchant_campaigns">["rewardRules"] = [];
  for (const rule of rewardRules) {
    if (!rule.couponDefId) {
      out.push(rule);
      continue;
    }
    const def = await getCouponDefForMerchant(ctx, {
      merchantId,
      couponDefId: rule.couponDefId,
    });
    if (!def) {
      throw new Error("coupon_def_not_found");
    }
    if (def.status !== "active") {
      throw new Error("coupon_def_not_active");
    }
    out.push({
      ...rule,
      reward: def.reward,
    });
  }
  return out;
}

export const listCouponDefsForStaff = authedQuery({
  args: {
    merchantId: v.string(),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    const rows = await ctx.db
      .query("merchant_coupon_defs")
      .withIndex("by_merchantId", (q) => q.eq("merchantId", args.merchantId))
      .collect();
    const filtered = args.includeArchived
      ? rows
      : rows.filter((r) => r.status === "active");
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const createCouponDef = authedMutation({
  args: {
    merchantId: v.string(),
    name: v.string(),
    itemLabel: v.string(),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    const label = args.itemLabel.trim() || args.name.trim() || "活动兑换券";
    const name = args.name.trim() || label;
    if (!name) {
      throw new Error("name_required");
    }
    const couponDefId = newId("cdef");
    const now = Date.now();
    const reward = {
      type: "free_item" as const,
      itemLabel: label,
      displayText: label,
    };
    await ctx.db.insert("merchant_coupon_defs", {
      couponDefId,
      merchantId: args.merchantId,
      name,
      reward,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    return { couponDefId, name, reward };
  },
});

export const updateCouponDef = authedMutation({
  args: {
    merchantId: v.string(),
    couponDefId: v.string(),
    name: v.optional(v.string()),
    itemLabel: v.optional(v.string()),
    status: v.optional(couponDefStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    const row = await getCouponDefForMerchant(ctx, {
      merchantId: args.merchantId,
      couponDefId: args.couponDefId,
    });
    if (!row) {
      throw new Error("not_found");
    }
    const patch: Partial<Doc<"merchant_coupon_defs">> = {
      updatedAt: Date.now(),
    };
    if (args.name != null) {
      patch.name = args.name.trim() || row.name;
    }
    if (args.itemLabel != null) {
      const label = args.itemLabel.trim() || row.name;
      patch.reward = {
        type: "free_item",
        itemLabel: label,
        displayText: label,
      };
    }
    if (args.status != null) {
      patch.status = args.status;
    }
    await ctx.db.patch(row._id, patch);
    return { ok: true as const };
  },
});

export const archiveCouponDef = authedMutation({
  args: {
    merchantId: v.string(),
    couponDefId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, { merchantId: args.merchantId, uid: ctx.uid });
    const row = await getCouponDefForMerchant(ctx, {
      merchantId: args.merchantId,
      couponDefId: args.couponDefId,
    });
    if (!row) {
      throw new Error("not_found");
    }
    await ctx.db.patch(row._id, { status: "archived", updatedAt: Date.now() });
    return { ok: true as const };
  },
});
