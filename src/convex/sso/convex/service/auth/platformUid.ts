/** Platform namespace for `/platform/admin` staff (partnerId = 0). */
export const PLATFORM_NAMESPACE_PARTNER_ID = 0;

/** Web auth channel cid. */
export const WEB_AUTH_CHANNEL_CID = 0;

/**
 * uid = `${cid}_${partnerId}_${subjectHash}` (subjectHash computed in Node via MD5).
 * This module only documents the shape; use AuthenticatorFactory.platformUidForSubject in Node.
 */
export function formatPlatformUid(cid: number, partnerId: number, subjectHash: string): string {
  return `${cid}_${partnerId}_${subjectHash}`;
}
