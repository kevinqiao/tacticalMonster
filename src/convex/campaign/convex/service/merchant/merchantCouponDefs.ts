import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internalMutation, internalQuery } from "../../_generated/server";
import {
  couponActivationValidator,
  couponDefStatusValidator,
  couponValidityValidator,
} from "./validators";

/**
 * `coupon_defs` no longer exists — Portal-owned voucher SKUs
 * (`portalSkuId` on reward rules) replace Campaign-local coupon definitions.
 * These are deprecated stubs kept only so older staff-UI call sites keep
 * compiling; all mutating entry points now throw.
 */

/**
 * Staff-created campaigns must reference a Portal voucher SKU instead of a
 * local coupon def; `assertStaffCouponDefRefs` (campaignRuleValidation.ts)
 * already enforces `portalSkuId` presence before this runs, so this is now a
 * pass-through kept for call-site compatibility.
 */
export async function materializeCampaignRewardRules(
  _ctx: QueryCtx | MutationCtx,
  _partnerId: number,
  rewardRules: Doc<"campaigns">["rewardRules"]
): Promise<Doc<"campaigns">["rewardRules"]> {
  for (const rule of rewardRules) {
    if (!rule.portalSkuId?.trim()) {
      throw new Error("portal_sku_required");
    }
  }
  return rewardRules;
}

export const listCouponDefsInternal = internalQuery({
  args: {
    partnerId: v.number(),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async () => {
    return [] as Array<never>;
  },
});

const activationKindValidator = v.union(
  v.literal("immediate"),
  v.literal("delay_hours"),
  v.literal("fixed_at")
);

export const createCouponDefCore = internalMutation({
  args: {
    partnerId: v.number(),
    name: v.string(),
    itemLabel: v.string(),
    usageRules: v.optional(v.string()),
    validity: v.optional(couponValidityValidator),
    validityHours: v.optional(v.number()),
    activation: v.optional(couponActivationValidator),
    activationKind: v.optional(activationKindValidator),
    activationAtMs: v.optional(v.number()),
    activationDelayHours: v.optional(v.number()),
  },
  handler: async () => {
    throw new Error("deprecated_use_portal_voucher_sku");
  },
});

export const updateCouponDefCore = internalMutation({
  args: {
    partnerId: v.number(),
    couponDefId: v.string(),
    name: v.optional(v.string()),
    itemLabel: v.optional(v.string()),
    usageRules: v.optional(v.string()),
    status: v.optional(couponDefStatusValidator),
    validity: v.optional(couponValidityValidator),
    validityHours: v.optional(v.number()),
    activation: v.optional(couponActivationValidator),
    activationKind: v.optional(activationKindValidator),
    activationAtMs: v.optional(v.number()),
    activationDelayHours: v.optional(v.number()),
  },
  handler: async () => {
    throw new Error("deprecated_use_portal_voucher_sku");
  },
});

export const archiveCouponDefCore = internalMutation({
  args: {
    partnerId: v.number(),
    couponDefId: v.string(),
  },
  handler: async () => {
    throw new Error("deprecated_use_portal_voucher_sku");
  },
});
