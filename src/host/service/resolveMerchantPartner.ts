import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const _merchantUrlRaw = import.meta.env.VITE_CONVEX_URL_MERCHANT;
const DEV_MERCHANT_CONVEX_URL = "https://curious-goldfish-112.convex.cloud";

export const MERCHANT_CONVEX_URL =
  typeof _merchantUrlRaw === "string" && _merchantUrlRaw.trim() !== ""
    ? _merchantUrlRaw.trim()
    : DEV_MERCHANT_CONVEX_URL;

const resolvePartnerByMerchantSlugRef = makeFunctionReference<"query">(
  "service/merchant/merchantCampaigns:resolvePartnerByMerchantSlug"
);

let merchantHttpClient: ConvexHttpClient | null = null;

function getMerchantHttpClient(): ConvexHttpClient {
  if (!merchantHttpClient) {
    merchantHttpClient = new ConvexHttpClient(MERCHANT_CONVEX_URL);
  }
  return merchantHttpClient;
}

export type MerchantPartnerResolution = {
  partnerId: number;
  merchantSlug: string;
  merchantName: string;
};

/** Resolve SSO partner pid from merchant slug (Campaign DB — not URL ?pid). */
export async function resolvePartnerIdByMerchantSlug(
  merchantSlug: string
): Promise<MerchantPartnerResolution | null> {
  const slug = merchantSlug.trim().toLowerCase();
  if (!slug) return null;
  return (await getMerchantHttpClient().query(resolvePartnerByMerchantSlugRef, {
    merchantSlug: slug,
  })) as MerchantPartnerResolution | null;
}
