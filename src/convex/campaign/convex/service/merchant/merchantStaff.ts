import type { QueryCtx, MutationCtx } from "../../_generated/server";

export async function getPartnerBrandBySlug(ctx: QueryCtx, slug: string) {
  return await ctx.db
    .query("partner_brands")
    .withIndex("by_slug", (q) => q.eq("slug", slug.trim().toLowerCase()))
    .unique();
}

export async function getPartnerBrandByPartnerId(ctx: QueryCtx, partnerId: number) {
  return await ctx.db
    .query("partner_brands")
    .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
    .unique();
}

/** Public campaign resolve: partner_brands.slug → partnerId → campaign. */
export async function getCampaignBySlugs(
  ctx: QueryCtx,
  partnerSlug: string,
  campaignSlug: string
) {
  const brand = await getPartnerBrandBySlug(ctx, partnerSlug);
  if (!brand) return null;
  const campaign = await ctx.db
    .query("campaigns")
    .withIndex("by_partner_slug", (q) =>
      q.eq("partnerId", brand.partnerId).eq("slug", campaignSlug.trim().toLowerCase())
    )
    .unique();
  if (!campaign) return null;
  return { brand, campaign };
}

export function isCampaignLive(campaign: {
  status: string;
  startsAt: number;
  endsAt: number;
}): boolean {
  const now = Date.now();
  return campaign.status === "live" && now >= campaign.startsAt && now <= campaign.endsAt;
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function generateCouponCode(prefix = "CAMP"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${suffix}`;
}

/** Cryptographically random hex string (Convex default runtime / Web Crypto). */
export function randomHexToken(byteLength = 24): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
