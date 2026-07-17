import { sessionPartnerIdFromUid } from "../../shared/platformAuth/parsePlatformUid";

export type PartnerJoinCheckResult =
  | { ok: true }
  | { ok: false; error: "partner_mismatch" | "partner_session_required" };

/**
 * Campaigns require session partner (from platform uid) to match campaign.partnerId.
 */
export function assertCampaignPartnerSession(args: {
  uid: string;
  partnerId: number;
}): PartnerJoinCheckResult {
  const expectedPartnerId = args.partnerId;
  const sessionPartnerId = sessionPartnerIdFromUid(args.uid);

  if (sessionPartnerId === null) {
    return { ok: false, error: "partner_session_required" };
  }

  if (sessionPartnerId !== expectedPartnerId) {
    return { ok: false, error: "partner_mismatch" };
  }

  return { ok: true };
}
