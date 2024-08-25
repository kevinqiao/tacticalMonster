import { v } from "convex/values";
import { query } from "./_generated/server";


export const findByApp = query({
  args: { locale: v.string(), app: v.string() },
  handler: async (ctx, { locale, app }) => {
    const resource = await ctx.db.query("resource").withIndex("by_app_locale", (q) => q.eq("app", app).eq("locale", locale)).unique();
    return resource;
  },
});


