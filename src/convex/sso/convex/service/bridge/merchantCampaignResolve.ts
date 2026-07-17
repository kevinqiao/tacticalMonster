"use node";

import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const DEV_CAMPAIGN_CONVEX_URL = "https://curious-goldfish-112.convex.cloud";

const resolvePartnerByPartnerSlugRef = makeFunctionReference<"query">(
  "service/merchant/merchantCampaigns:resolvePartnerByPartnerSlug"
);

function campaignConvexUrl(): string {
  const raw =
    process.env.CAMPAIGN_CONVEX_URL ??
    process.env.VITE_CONVEX_URL_CAMPAIGN ??
    process.env.CAMPAIGN_SITE_URL;
  if (typeof raw === "string" && raw.trim().length > 0) {
    const t = raw.trim();
    if (t.includes(".convex.site")) {
      return t.replace(".convex.site", ".convex.cloud");
    }
    return t.replace(/\/+$/, "");
  }
  return DEV_CAMPAIGN_CONVEX_URL;
}

let client: ConvexHttpClient | null = null;

function getClient(): ConvexHttpClient {
  if (!client) {
    client = new ConvexHttpClient(campaignConvexUrl());
  }
  return client;
}

/** SSO → campaign: partner pid for a public partner brand slug. */
export async function resolvePartnerIdByPartnerSlug(
  partnerSlug: string
): Promise<number | null> {
  const slug = partnerSlug.trim().toLowerCase();
  if (!slug) return null;
  try {
    const row = (await getClient().query(resolvePartnerByPartnerSlugRef, {
      partnerSlug: slug,
    })) as { partnerId: number } | null;
    return row?.partnerId ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve partnerId from partner brand slug, else local SSO store slug.
 * Store slugs live in SSO `store` table after hard-cut.
 */
export async function resolveMerchantPartnerId(
  slug: string,
  resolveStoreSlugLocal?: (storeSlug: string) => Promise<number | null>
): Promise<number | null> {
  return (
    (await resolvePartnerIdByPartnerSlug(slug)) ??
    (resolveStoreSlugLocal ? await resolveStoreSlugLocal(slug) : null)
  );
}
