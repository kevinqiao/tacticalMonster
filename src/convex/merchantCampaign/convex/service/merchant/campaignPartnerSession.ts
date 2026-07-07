import { sessionPartnerIdFromUid } from "../../shared/platformAuth/parsePlatformUid";
import { merchantPartnerId } from "./merchantStaff";

export type PartnerJoinCheckResult =
  | { ok: true }
  | { ok: false; error: "partner_mismatch" | "partner_session_required" };

/**
 * Merchant-bound campaigns require session partner (from platform uid) to match merchant.partnerId.
 * Open merchants (partnerId 0) accept any authenticated uid.
 */
export function assertCampaignPartnerSession(args: {
  uid: string;
  merchant: { partnerId?: number };
}): PartnerJoinCheckResult {
  const expectedPartnerId = merchantPartnerId(args.merchant);
  const sessionPartnerId = sessionPartnerIdFromUid(args.uid);

  if (expectedPartnerId === 0) {
    return { ok: true };
  }

  if (sessionPartnerId === null) {
    return { ok: false, error: "partner_session_required" };
  }

  if (sessionPartnerId !== expectedPartnerId) {
    return { ok: false, error: "partner_mismatch" };
  }

  return { ok: true };
}
