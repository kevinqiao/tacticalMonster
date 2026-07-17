import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";
import { themeJsonValidator } from "./validators";
import { getPartnerBrandByPartnerId } from "./merchantStaff";

export const saveSyncJob = internalMutation({
  args: {
    partnerId: v.number(),
    sourceUrl: v.string(),
    rawExtract: v.string(),
    themeDraft: themeJsonValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("theme_sync_jobs", {
      partnerId: args.partnerId,
      sourceUrl: args.sourceUrl,
      status: "needs_review",
      rawExtract: args.rawExtract,
      themeDraft: args.themeDraft,
      syncedAt: Date.now(),
    });
    const brand = await getPartnerBrandByPartnerId(ctx, args.partnerId);
    if (brand) {
      await ctx.db.patch(brand._id, {
        brandSourceUrl: args.sourceUrl,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getLatestSyncJob = internalQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("theme_sync_jobs")
      .withIndex("by_partner", (q) => q.eq("partnerId", args.partnerId))
      .order("desc")
      .take(1);
    return rows[0] ?? null;
  },
});
