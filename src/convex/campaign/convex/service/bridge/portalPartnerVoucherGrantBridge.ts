"use node";

import { merchantBridgeSecret } from "./merchantBridgeSecret";
import { MERCHANT_BRIDGE_HEADER, portalSiteUrl } from "./portalCampaignLeagueBridge";

async function portalMerchantPost<T>(
  path: string,
  body: Record<string, unknown>
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  let response: Response;
  try {
    response = await fetch(`${portalSiteUrl()}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [MERCHANT_BRIDGE_HEADER]: merchantBridgeSecret(),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    console.error("[merchantCampaign] Portal voucher bridge failed", path, error);
    return { ok: false, error: "portal_unreachable" };
  }

  try {
    const data = (await response.json()) as T & { ok?: boolean; error?: string };
    return !response.ok || data.ok === false
      ? { ok: false, error: data.error ?? "portal_failed" }
      : { ok: true, data };
  } catch {
    return { ok: false, error: "bad_response" };
  }
}

export async function grantPartnerVoucherFromCampaignViaHttp(args: {
  uid: string;
  partnerId: number;
  campaignId: string;
  portalSkuId: string;
  grantKey: string;
  preferredCode: string;
}) {
  return portalMerchantPost<{ itemId: string; deduped?: boolean }>(
    "/internal/grant-partner-voucher-from-campaign",
    args
  );
}

export async function syncCampaignVoucherStatusViaHttp(args: {
  partnerId: number;
  campaignId: string;
  code: string;
  status: "redeemed" | "void";
  actorUid?: string;
  storeId?: string;
  staffNote?: string;
}) {
  return portalMerchantPost<{ itemId: string; deduped?: boolean }>(
    "/internal/sync-campaign-voucher-status",
    args
  );
}

export async function listPartnerVoucherSkusViaHttp(partnerId: number) {
  const result = await portalMerchantPost<{
    skus: Array<{
      skuId: string;
      title: string;
      rewardText: string;
      active: boolean;
      validityDays: number | null;
    }>;
  }>("/internal/campaign-voucher-skus", { partnerId });
  if (!result.ok) return result;
  return { ok: true as const, skus: result.data.skus ?? [] };
}
