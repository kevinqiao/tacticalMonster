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
  maxCouponsPerPlayer?: number;
}) {
  return portalMerchantPost<{ itemId: string; code?: string; deduped?: boolean }>(
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

/** Coupon-limit check before issuing a new campaign voucher (join / issue guard). */
export async function countCampaignVouchersViaHttp(args: {
  campaignId: string;
  uid: string;
}): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const result = await portalMerchantPost<{ count: number }>(
    "/internal/count-campaign-vouchers",
    args
  );
  if (!result.ok) return result;
  return { ok: true, count: result.data.count ?? 0 };
}

export type ValidatedCampaignVoucher = {
  itemId: string;
  code: string;
  title: string;
  rewardText: string;
  campaignId: string;
  expiresAt: number | null;
  status: string;
};

/** Validate a scanned/entered campaign voucher code before redemption. */
export async function validateCampaignVoucherViaHttp(args: {
  partnerId: number;
  code: string;
}): Promise<
  | { ok: true; voucher: ValidatedCampaignVoucher }
  | { ok: false; error: string }
> {
  return portalMerchantPost<{ voucher: ValidatedCampaignVoucher }>(
    "/internal/validate-campaign-voucher",
    args
  ).then((result) => (result.ok ? { ok: true, voucher: result.data.voucher } : result));
}

/** Redeem a campaign voucher at a physical store, recording staff/store audit fields. */
export async function redeemCampaignVoucherStoreViaHttp(args: {
  partnerId: number;
  code: string;
  storeId: string;
  staffUid: string;
  staffNote?: string;
}) {
  return portalMerchantPost<{ itemId: string; title: string }>(
    "/internal/redeem-campaign-voucher-store",
    args
  );
}

export type CampaignVoucherListItem = {
  itemId: string;
  code: string;
  title: string;
  rewardText: string;
  campaignId: string;
  uid: string;
  status: string;
  issuedAt: number;
  expiresAt: number | null;
  redeemedAt: number | null;
  redeemedAtStoreId: string | null;
};

/** List issued campaign vouchers for a partner, optionally scoped to one campaign. */
export async function listCampaignVouchersViaHttp(args: {
  partnerId: number;
  campaignId?: string;
  limit?: number;
}): Promise<
  | { ok: true; items: CampaignVoucherListItem[] }
  | { ok: false; error: string }
> {
  const result = await portalMerchantPost<{ items: CampaignVoucherListItem[] }>(
    "/internal/list-campaign-vouchers",
    args
  );
  if (!result.ok) return result;
  return { ok: true, items: result.data.items ?? [] };
}

export type PortalPlayerProfileBridge = {
  displayName: string | null;
  resolvedDisplayName: string;
  verifiedEmail: string | null;
  verifiedPhone: string | null;
  displayNameUpdatedAt: number | null;
};

/** Campaign player profile → Portal portal_players. */
export async function getPortalPlayerProfileViaHttp(uid: string) {
  const result = await portalMerchantPost<{ profile: PortalPlayerProfileBridge }>(
    "/internal/campaign-player-profile",
    { uid }
  );
  if (!result.ok) return result;
  return { ok: true as const, profile: result.data.profile };
}

export async function updatePortalDisplayNameViaHttp(args: {
  uid: string;
  displayName: string;
}) {
  return portalMerchantPost<{
    displayName?: string;
    unchanged?: boolean;
    error?: string;
  }>("/internal/campaign-player-display-name", args);
}

export async function syncPortalContactViaHttp(args: {
  uid: string;
  verifiedEmail?: string;
  verifiedPhone?: string;
}) {
  return portalMerchantPost<{ error?: string }>("/internal/campaign-player-contact", args);
}
