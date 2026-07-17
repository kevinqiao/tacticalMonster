/** Platform namespace for `/platform/admin` staff and all Staff Web identities (partnerId = 0). */
export const PLATFORM_NAMESPACE_PARTNER_ID = 0;

/** Web auth channel cid. */
export const WEB_AUTH_CHANNEL_CID = 0;

/** First-party Default Partner (PID 0): `/portal/{game}` — no portal_key. */
export function isFirstPartyPartnerId(partnerId: number): boolean {
  return Number(partnerId) === PLATFORM_NAMESPACE_PARTNER_ID;
}

/**
 * uid = `${cid}_${partnerId}_${subjectHash}` (subjectHash computed in Node via MD5).
 * This module only documents the shape; use AuthenticatorFactory.platformUidForSubject in Node.
 */
export function formatPlatformUid(cid: number, partnerId: number, subjectHash: string): string {
  return `${cid}_${partnerId}_${subjectHash}`;
}
