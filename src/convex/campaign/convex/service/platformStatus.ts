import { v } from "convex/values";

import { internalMutation, internalQuery } from "../_generated/server";
import {
  PLATFORM_STATUS_KEY,
  toPlatformStatusSnapshot,
  type PlatformStatusMode,
  type PlatformStatusRow,
} from "../../../shared/platformStatus/platformStatusShared";

const modeValidator = v.union(
  v.literal("normal"),
  v.literal("pre_notice"),
  v.literal("maintenance")
);

export const getModeInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("platform_status")
      .withIndex("by_key", (q) => q.eq("key", PLATFORM_STATUS_KEY))
      .unique();
    return (row?.mode ?? "normal") as PlatformStatusMode;
  },
});

export const getPlatformStatusInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("platform_status")
      .withIndex("by_key", (q) => q.eq("key", PLATFORM_STATUS_KEY))
      .unique();
    return toPlatformStatusSnapshot(row ?? null);
  },
});

export const upsertFromBridgeInternal = internalMutation({
  args: {
    mode: modeValidator,
    title: v.optional(v.string()),
    message: v.optional(v.string()),
    plannedStartAt: v.optional(v.union(v.number(), v.null())),
    plannedEndAt: v.optional(v.union(v.number(), v.null())),
    updatedAt: v.number(),
    updatedBy: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("platform_status")
      .withIndex("by_key", (q) => q.eq("key", PLATFORM_STATUS_KEY))
      .unique();
    const patch: PlatformStatusRow = {
      key: PLATFORM_STATUS_KEY,
      mode: args.mode,
      title: args.title?.trim() || undefined,
      message: args.message?.trim() || undefined,
      plannedStartAt:
        typeof args.plannedStartAt === "number" ? args.plannedStartAt : undefined,
      plannedEndAt: typeof args.plannedEndAt === "number" ? args.plannedEndAt : undefined,
      updatedAt: args.updatedAt,
      updatedBy: typeof args.updatedBy === "string" ? args.updatedBy : undefined,
    };
    if (existing) {
      await ctx.db.patch(existing._id, {
        mode: patch.mode,
        title: patch.title,
        message: patch.message,
        plannedStartAt: patch.plannedStartAt,
        plannedEndAt: patch.plannedEndAt,
        updatedAt: patch.updatedAt,
        updatedBy: patch.updatedBy,
      });
    } else {
      await ctx.db.insert("platform_status", patch);
    }
    return { ok: true as const };
  },
});
