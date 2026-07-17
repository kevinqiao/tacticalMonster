import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internalMutation, internalQuery } from "../../_generated/server";
import {
  DEFAULT_COUPON_VALIDITY_HOURS,
  normalizeCouponActivation,
  normalizeCouponValidity,
  type CouponActivation,
  type CouponValidity,
} from "./couponValidity";
import { newId } from "./merchantStaff";
import {
  couponActivationValidator,
  couponDefStatusValidator,
  couponValidityValidator,
} from "./validators";

export async function getCouponDefForPartner(
  ctx: QueryCtx | MutationCtx,
  args: { partnerId: number; couponDefId: string }
): Promise<Doc<"coupon_defs"> | null> {
  const row = await ctx.db
    .query("coupon_defs")
    .withIndex("by_couponDefId", (q) => q.eq("couponDefId", args.couponDefId))
    .unique();
  if (!row || row.partnerId !== args.partnerId) {
    return null;
  }
  return row;
}

export function couponDefValidity(def: Doc<"coupon_defs"> | null | undefined): CouponValidity {
  return normalizeCouponValidity(def?.validity ?? undefined);
}

export function couponDefActivation(
  def: Doc<"coupon_defs"> | null | undefined
): CouponActivation {
  return normalizeCouponActivation(def?.activation ?? undefined);
}

/** Copy active def rewards onto campaign rules; legacy rules without couponDefId pass through. */
export async function materializeCampaignRewardRules(
  ctx: QueryCtx | MutationCtx,
  partnerId: number,
  rewardRules: Doc<"campaigns">["rewardRules"]
): Promise<Doc<"campaigns">["rewardRules"]> {
  const out: Doc<"campaigns">["rewardRules"] = [];
  for (const rule of rewardRules) {
    if (!rule.couponDefId) {
      out.push(rule);
      continue;
    }
    const def = await getCouponDefForPartner(ctx, {
      partnerId,
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

export const listCouponDefsInternal = internalQuery({
  args: {
    partnerId: v.number(),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("coupon_defs")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", args.partnerId))
      .collect();
    const filtered = args.includeArchived
      ? rows
      : rows.filter((r) => r.status === "active");
    return filtered
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((row) => ({
        ...row,
        validity: couponDefValidity(row),
        activation: couponDefActivation(row),
      }));
  },
});

function resolveValidityArg(args: {
  validity?: CouponValidity;
  validityHours?: number;
}): CouponValidity {
  return normalizeCouponValidity(
    args.validity ??
      (args.validityHours != null
        ? { kind: "duration_hours" as const, hours: args.validityHours }
        : { kind: "duration_hours" as const, hours: DEFAULT_COUPON_VALIDITY_HOURS })
  );
}

const activationKindValidator = v.union(
  v.literal("immediate"),
  v.literal("delay_hours"),
  v.literal("fixed_at")
);

function resolveActivationArg(args: {
  activation?: CouponActivation;
  activationKind?: "immediate" | "delay_hours" | "fixed_at";
  activationAtMs?: number;
  activationDelayHours?: number;
}): CouponActivation {
  if (args.activation != null) {
    return normalizeCouponActivation(args.activation);
  }
  if (args.activationKind === "fixed_at") {
    return normalizeCouponActivation({
      kind: "fixed_at",
      atMs: args.activationAtMs ?? 0,
    });
  }
  if (args.activationKind === "delay_hours") {
    return normalizeCouponActivation({
      kind: "delay_hours",
      hours: args.activationDelayHours ?? 0,
    });
  }
  return normalizeCouponActivation({ kind: "immediate" });
}

function normalizeUsageRules(value: string | undefined): string {
  return value?.trim() ?? "";
}

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
  handler: async (ctx, args) => {
    const label = args.itemLabel.trim() || args.name.trim() || "活动兑换券";
    const name = args.name.trim() || label;
    if (!name) {
      throw new Error("name_required");
    }
    const usageRules = normalizeUsageRules(args.usageRules);
    const validity = resolveValidityArg(args);
    const activation = resolveActivationArg(args);
    const couponDefId = newId("cdef");
    const now = Date.now();
    const reward = {
      type: "free_item" as const,
      itemLabel: label,
      displayText: label,
    };
    await ctx.db.insert("coupon_defs", {
      couponDefId,
      partnerId: args.partnerId,
      name,
      reward,
      status: "active",
      ...(usageRules ? { usageRules } : {}),
      validity,
      activation,
      createdAt: now,
      updatedAt: now,
    });
    return { couponDefId, name, reward, usageRules, validity, activation };
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
  handler: async (ctx, args) => {
    const row = await getCouponDefForPartner(ctx, {
      partnerId: args.partnerId,
      couponDefId: args.couponDefId,
    });
    if (!row) {
      throw new Error("not_found");
    }
    const patch: Partial<Doc<"coupon_defs">> = {
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
    if (args.usageRules !== undefined) {
      patch.usageRules = normalizeUsageRules(args.usageRules);
    }
    if (args.status != null) {
      patch.status = args.status;
    }
    if (args.validity != null || args.validityHours != null) {
      patch.validity = resolveValidityArg({
        validity: args.validity,
        validityHours: args.validityHours,
      });
    }
    if (
      args.activation != null ||
      args.activationKind != null ||
      args.activationAtMs != null ||
      args.activationDelayHours != null
    ) {
      patch.activation = resolveActivationArg({
        activation: args.activation,
        activationKind: args.activationKind,
        activationAtMs: args.activationAtMs,
        activationDelayHours: args.activationDelayHours,
      });
    }
    await ctx.db.patch(row._id, patch);
    return { ok: true as const };
  },
});

export const archiveCouponDefCore = internalMutation({
  args: {
    partnerId: v.number(),
    couponDefId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await getCouponDefForPartner(ctx, {
      partnerId: args.partnerId,
      couponDefId: args.couponDefId,
    });
    if (!row) {
      throw new Error("not_found");
    }
    await ctx.db.patch(row._id, {
      status: "archived",
      updatedAt: Date.now(),
    });
    return { ok: true as const };
  },
});
