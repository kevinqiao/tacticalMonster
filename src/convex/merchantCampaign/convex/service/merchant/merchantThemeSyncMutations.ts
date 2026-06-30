import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";
import { requireStaff } from "./merchantStaff";
import { themeJsonValidator } from "./validators";

export const assertStaff = internalQuery({
  args: { merchantId: v.string(), uid: v.string() },
  handler: async (ctx, args) => {
    await requireStaff(ctx, args);
    return { ok: true as const };
  },
});

export const saveSyncJob = internalMutation({
  args: {
    merchantId: v.string(),
    sourceUrl: v.string(),
    rawExtract: v.string(),
    themeDraft: themeJsonValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("merchant_theme_sync_jobs", {
      merchantId: args.merchantId,
      sourceUrl: args.sourceUrl,
      status: "needs_review",
      rawExtract: args.rawExtract,
      themeDraft: args.themeDraft,
      syncedAt: Date.now(),
    });
    const merchant = await ctx.db
      .query("merchants")
      .withIndex("by_merchantId", (q) => q.eq("merchantId", args.merchantId))
      .unique();
    if (merchant) {
      await ctx.db.patch(merchant._id, {
        brandSourceUrl: args.sourceUrl,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getLatestSyncJob = internalQuery({
  args: { merchantId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("merchant_theme_sync_jobs")
      .withIndex("by_merchant", (q) => q.eq("merchantId", args.merchantId))
      .order("desc")
      .take(1);
    return rows[0] ?? null;
  },
});
