"use node";

import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const DEV_MERCHANT_CONVEX_URL = "https://curious-goldfish-112.convex.cloud";

const resolvePartnerByMerchantSlugRef = makeFunctionReference<"query">(
  "service/merchant/merchantCampaigns:resolvePartnerByMerchantSlug"
);

function merchantConvexUrl(): string {
  const raw =
    process.env.MERCHANT_CAMPAIGN_CONVEX_URL ??
    process.env.VITE_CONVEX_URL_MERCHANT ??
    process.env.MERCHANT_CAMPAIGN_SITE_URL;
  if (typeof raw === "string" && raw.trim().length > 0) {
    const t = raw.trim();
    if (t.includes(".convex.site")) {
      return t.replace(".convex.site", ".convex.cloud");
    }
    return t.replace(/\/+$/, "");
  }
  return DEV_MERCHANT_CONVEX_URL;
}

let client: ConvexHttpClient | null = null;

function getClient(): ConvexHttpClient {
  if (!client) {
    client = new ConvexHttpClient(merchantConvexUrl());
  }
  return client;
}

/** SSO → merchantCampaign: partner pid for a merchant slug (embed / join validation). */
export async function resolveMerchantPartnerId(
  merchantSlug: string
): Promise<number | null> {
  const slug = merchantSlug.trim().toLowerCase();
  if (!slug) return null;
  try {
    const row = (await getClient().query(resolvePartnerByMerchantSlugRef, {
      merchantSlug: slug,
    })) as { partnerId: number } | null;
    return row?.partnerId ?? null;
  } catch {
    return null;
  }
}
