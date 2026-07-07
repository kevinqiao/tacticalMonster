import { sessionPartnerIdFromUid } from "../../../shared/platformAuth/parsePlatformUid";

/** Empty or omitted partnerIds → visible to all partners. */
export function isPortalShopSkuVisibleForPartner(
  partnerIds: number[] | undefined,
  sessionPartnerId: number
): boolean {
  if (!partnerIds || partnerIds.length === 0) return true;
  return partnerIds.includes(sessionPartnerId);
}

export function resolvePortalShopSessionPartnerId(uid: string): number {
  return sessionPartnerIdFromUid(uid) ?? 0;
}
