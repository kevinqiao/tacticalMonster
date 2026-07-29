import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalMutation, internalQuery, query } from "../../_generated/server";
import { authedMutation, authedQuery } from "../../custom/session";
import {
  PLATFORM_STATUS_KEY,
  toPlatformStatusSnapshot,
  type PlatformStatusMode,
  type PlatformStatusRow,
} from "../../../../shared/platformStatus/platformStatusShared";
import { getPlatformStaffRow, requirePlatformStaff } from "./platformStaff";
import { isPlatformOperator } from "./platformOperator";

const modeValidator = v.union(
  v.literal("normal"),
  v.literal("pre_notice"),
  v.literal("maintenance")
);

async function loadStatusRow(ctx: {
  db: {
    query: (table: "platform_status") => {
      withIndex: (
        name: "by_key",
        fn: (q: { eq: (field: "key", value: typeof PLATFORM_STATUS_KEY) => unknown }) => unknown
      ) => { unique: () => Promise<(PlatformStatusRow & { _id: any }) | null> };
    };
  };
}) {
  return await ctx.db
    .query("platform_status")
    .withIndex("by_key", (q) => q.eq("key", PLATFORM_STATUS_KEY))
    .unique();
}

/** Public boot / shell subscription — no auth required. */
export const getPlatformStatus = query({
  args: {},
  handler: async (ctx) => {
    return toPlatformStatusSnapshot(await loadStatusRow(ctx));
  },
});

export const getPlatformStatusInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return toPlatformStatusSnapshot(await loadStatusRow(ctx));
  },
});

export const getModeInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await loadStatusRow(ctx);
    return (row?.mode ?? "normal") as PlatformStatusMode;
  },
});

/** Admin panel: same payload as public, gated for clarity. */
export const getPlatformStatusAdmin = authedQuery({
  args: {},
  handler: async (ctx) => {
    await requirePlatformStaff(ctx, "viewer");
    return toPlatformStatusSnapshot(await loadStatusRow(ctx));
  },
});

export const setPlatformStatus = authedMutation({
  args: {
    mode: modeValidator,
    title: v.optional(v.string()),
    message: v.optional(v.string()),
    plannedStartAt: v.optional(v.union(v.number(), v.null())),
    plannedEndAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    await requirePlatformStaff(ctx, "admin");
    const now = Date.now();
    const title = typeof args.title === "string" ? args.title.trim().slice(0, 120) : "";
    const message = typeof args.message === "string" ? args.message.trim().slice(0, 500) : "";
    const plannedStartAt =
      typeof args.plannedStartAt === "number" && Number.isFinite(args.plannedStartAt)
        ? Math.floor(args.plannedStartAt)
        : undefined;
    const plannedEndAt =
      typeof args.plannedEndAt === "number" && Number.isFinite(args.plannedEndAt)
        ? Math.floor(args.plannedEndAt)
        : undefined;

    const existing = await loadStatusRow(ctx);
    const patch: PlatformStatusRow = {
      key: PLATFORM_STATUS_KEY,
      mode: args.mode,
      title: title || undefined,
      message: message || undefined,
      plannedStartAt,
      plannedEndAt,
      updatedAt: now,
      updatedBy: ctx.user.uid,
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

    await ctx.scheduler.runAfter(
      0,
      internal.service.partner.platformStatusSync.syncPlatformStatusToPeers,
      {}
    );

    return { ok: true as const, status: toPlatformStatusSnapshot(patch) };
  },
});

/** Used by SSO session wrappers: allow platform staff during maintenance. */
export const canBypassMaintenanceInternal = internalQuery({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const trimmed = uid.trim();
    if (!trimmed) return false;
    if (await isPlatformOperator(ctx, trimmed)) return true;
    const row = await getPlatformStaffRow(ctx, trimmed);
    return row != null;
  },
});
