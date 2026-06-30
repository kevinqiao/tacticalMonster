export function normalizeWebEmail(email: string): string {
  return email.toLowerCase().trim();
}

/** Login accountId / `auth_identities.subject` (e.g. admin, user@example.com). */
export function normalizeWebAccountId(loginId: string): string {
  const trimmed = loginId.trim();
  return trimmed.includes("@") ? normalizeWebEmail(trimmed) : trimmed.toLowerCase();
}

/** Optional contact email — only when login id looks like an email address. */
export function optionalWebContactEmail(accountId: string): string | undefined {
  return accountId.includes("@") ? normalizeWebEmail(accountId) : undefined;
}

/** @deprecated use normalizeWebAccountId */
export function webSubjectFromLoginId(loginId: string): string {
  return normalizeWebAccountId(loginId);
}

/** @deprecated uid is computed in Node (`AuthenticatorFactory.webPlatformUidForEmail`) */
export function webPlatformUidFromLoginId(accountId: string): string {
  throw new Error("webPlatformUidFromLoginId_use_node_auth_layer");
}

/** @deprecated */
export function webPlatformUidFromEmail(email: string): string {
  return webPlatformUidFromLoginId(email);
}

/** @deprecated use normalizeWebAccountId */
export function webAccountIdFromEmail(email: string): string {
  return normalizeWebAccountId(email);
}

/** @deprecated */
export function md5Hex(_str: string): string {
  throw new Error("md5Hex_use_node_auth_layer");
}
