/** Platform uid shape: `${cid}_${partnerId}_${subjectHash}` — see platformUid.ts / AuthenticatorFactory. */

export function parsePartnerIdFromPlatformUid(uid: string): number | null {
  const trimmed = uid.trim();
  if (!trimmed) return null;
  const firstSep = trimmed.indexOf("_");
  if (firstSep < 0) return null;
  const secondSep = trimmed.indexOf("_", firstSep + 1);
  if (secondSep < 0) return null;
  const raw = trimmed.slice(firstSep + 1, secondSep);
  const partnerId = Number(raw);
  if (!Number.isFinite(partnerId) || partnerId < 0) return null;
  return partnerId;
}

/** Session partner for URL-scoped contexts; defaults missing field to 0. */
export function sessionPartnerIdFromUid(uid: string): number | null {
  return parsePartnerIdFromPlatformUid(uid);
}
