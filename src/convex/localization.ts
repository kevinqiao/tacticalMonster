import { v } from "convex/values";
import { query } from "./_generated/server";

export const findByLocale = query({
  args: { locale: v.string() },
  handler: async (ctx, { locale }) => {
    const resources = await ctx.db.query("localization").withIndex("by_locale", (q) => q.eq("locale", locale)).collect();
    return resources.map((r) => ({ name: r.name, data: r.data }));
  },
});

export const findByName = query({
  args: { locale: v.string(), name: v.string() },
  handler: async (ctx, { locale, name }) => {
    const resource = await ctx.db.query("localization").withIndex("by_locale", (q) => q.eq("locale", locale)).filter((q) => q.eq(q.field("name"), name)).unique();
    return resource;
  },
});


