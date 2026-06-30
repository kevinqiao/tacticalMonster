import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "../../_generated/server";

export type MerchantStaffRole = "owner" | "staff";

const ROLE_RANK: Record<MerchantStaffRole, number> = {
  staff: 1,
  owner: 2,
};

export async function getMerchantStaffRow(
  ctx: QueryCtx | MutationCtx,
  merchantId: string,
  uid: string
) {
  return await ctx.db
    .query("merchant_staff")
    .withIndex("by_merchant_uid", (q) =>
      q.eq("merchantId", merchantId).eq("uid", uid)
    )
    .unique();
}

export async function requireStaff(
  ctx: QueryCtx | MutationCtx,
  args: {
    merchantId: v.Infer<typeof v.string>;
    uid: v.Infer<typeof v.string>;
    minRole?: MerchantStaffRole;
  }
) {
  const row = await getMerchantStaffRow(ctx, args.merchantId, args.uid);
  if (!row) {
    throw new Error("forbidden");
  }
  const minRole = args.minRole ?? "staff";
  if (ROLE_RANK[row.role as MerchantStaffRole] < ROLE_RANK[minRole]) {
    throw new Error("forbidden");
  }
  return row;
}

export async function getMerchantBySlug(ctx: QueryCtx, slug: string) {
  return await ctx.db
    .query("merchants")
    .withIndex("by_slug", (q) => q.eq("slug", slug.trim().toLowerCase()))
    .unique();
}

export function merchantPartnerId(merchant: { partnerId?: number }): number {
  return typeof merchant.partnerId === "number" ? merchant.partnerId : 0;
}

export async function getCampaignBySlugs(
  ctx: QueryCtx,
  merchantSlug: string,
  campaignSlug: string
) {
  const merchant = await getMerchantBySlug(ctx, merchantSlug);
  if (!merchant) return null;
  const campaign = await ctx.db
    .query("merchant_campaigns")
    .withIndex("by_merchant_slug", (q) =>
      q.eq("merchantId", merchant.merchantId).eq("slug", campaignSlug.trim().toLowerCase())
    )
    .unique();
  if (!campaign) return null;
  return { merchant, campaign };
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
