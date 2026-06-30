import type { User } from "../UserManager";

/** RS256 platform JWT: header.payload.signature (base64url). */
export function looksLikePlatformJwt(token: string | null | undefined): token is string {
  if (typeof token !== "string" || token.length < 20) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  return parts.every((part) => part.length > 0 && /^[A-Za-z0-9_-]+$/.test(part));
}

/** Platform session JWT for Convex setAuth and arena bridge calls. */
export function platformAccessToken(user: User | null | undefined): string | undefined {
  const token = user?.platformAccessToken;
  return looksLikePlatformJwt(token) ? token : undefined;
}

export function isPlatformAuthed(user: User | null | undefined): boolean {
  if (!user?.uid || !looksLikePlatformJwt(user.platformAccessToken)) return false;
  if (user.platformAccessExpire != null && user.platformAccessExpire <= Date.now()) {
    return false;
  }
  return true;
}
