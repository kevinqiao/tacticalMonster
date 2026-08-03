import type { QueryCtx, MutationCtx } from "../../_generated/server";

// `partner_brands` removed — slug→partnerId now resolves only via SSO
// `partner.slug` (see service/bridge/partnerSlugResolveBridge.ts). Callers
// that used to resolve by partnerSlug now resolve partnerId via SSO first
// (in an action) and then look up campaigns directly by partnerId here.

/** Resolve a campaign by (partnerId, campaignSlug) — partnerId already resolved via SSO. */
export async function getCampaignByPartnerIdAndSlug(
  ctx: QueryCtx,
  partnerId: number,
  campaignSlug: string
) {
  const campaign = await ctx.db
    .query("campaigns")
    .withIndex("by_partner_slug", (q) =>
      q.eq("partnerId", partnerId).eq("slug", campaignSlug.trim().toLowerCase())
    )
    .unique();
  return campaign ?? null;
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
