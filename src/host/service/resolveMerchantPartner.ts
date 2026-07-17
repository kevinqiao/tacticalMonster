import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const _campaignUrlRaw = import.meta.env.VITE_CONVEX_URL_CAMPAIGN;
const DEV_CAMPAIGN_CONVEX_URL = "https://curious-goldfish-112.convex.cloud";

export const CAMPAIGN_CONVEX_URL =
  typeof _campaignUrlRaw === "string" && _campaignUrlRaw.trim() !== ""
    ? _campaignUrlRaw.trim()
    : DEV_CAMPAIGN_CONVEX_URL;

const resolvePartnerByPartnerSlugRef = makeFunctionReference<"query">(
  "service/merchant/merchantCampaigns:resolvePartnerByPartnerSlug"
);

let merchantHttpClient: ConvexHttpClient | null = null;

function getMerchantHttpClient(): ConvexHttpClient {
  if (!merchantHttpClient) {
    merchantHttpClient = new ConvexHttpClient(CAMPAIGN_CONVEX_URL);
  }
  return merchantHttpClient;
}

export type PartnerSlugResolution = {
  partnerId: number;
  partnerSlug: string;
};

/** Resolve SSO partner pid from public partner slug (`/campaign/{partnerSlug}/...`). */
export async function resolvePartnerIdByPartnerSlug(
  partnerSlug: string
): Promise<PartnerSlugResolution | null> {
  const slug = partnerSlug.trim().toLowerCase();
  if (!slug) return null;
  return (await getMerchantHttpClient().query(resolvePartnerByPartnerSlugRef, {
    partnerSlug: slug,
  })) as PartnerSlugResolution | null;
}
