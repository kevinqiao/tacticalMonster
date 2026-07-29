import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";

export type ResolvedPartnerBySlug = {
  partnerId: number;
  partnerSlug: string;
  name?: string;
};

/**
 * SSO's own slug → partnerId resolve. `partner.slug` is the single source of
 * truth; Campaign does not mirror brand — FE reads `partner.brand` from SSO.
 */
export const resolvePartnerBySlugInternal = internalQuery({
  args: { partnerSlug: v.string() },
  handler: async (ctx, { partnerSlug }): Promise<ResolvedPartnerBySlug | null> => {
    const slug = partnerSlug.trim().toLowerCase();
    if (!slug) return null;
    const partner = await ctx.db
      .query("partner")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!partner) return null;
    return {
      partnerId: partner.pid,
      partnerSlug: partner.slug ?? slug,
      name: partner.name,
    };
  },
});
