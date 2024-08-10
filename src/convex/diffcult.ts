import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const findByHardLevel = internalQuery({
  args: { level: v.number(), hard: v.number() },
  handler: async (ctx, { level, hard }) => {
    const df = await ctx.db.query("diffcult")
      .filter((q) => q.and(q.eq(q.field("level"), level), q.eq(q.field("hard"), hard))).unique()
    return df;
  },
});

export const find = internalQuery({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const df = await ctx.db.query("diffcult")
      .filter((q) => q.eq(q.field("id"), id)).unique()
    return df;
  },
});