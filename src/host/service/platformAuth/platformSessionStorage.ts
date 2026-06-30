import type { User } from "../UserManager";
import { looksLikePlatformJwt } from "./platformAccessToken";

const STORAGE_KEY = "user";

export type StoredUser = User & {
  platformAccessToken?: string;
  platformAccessExpire?: number;
};

type StoredUserRaw = StoredUser & { token?: string };

function stripLegacySessionFields(user: StoredUserRaw): StoredUser {
  const { token: _legacyToken, ...rest } = user;
  return rest;
}

function sanitizeStoredUser(user: StoredUserRaw): StoredUser {
  let next = stripLegacySessionFields(user);
  if (next.platformAccessToken && !looksLikePlatformJwt(next.platformAccessToken)) {
    const { platformAccessToken: _t, platformAccessExpire: _e, ...withoutPlatform } = next;
    next = withoutPlatform;
  }
  return next;
}

export function readStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = sanitizeStoredUser(JSON.parse(raw) as StoredUserRaw);
    const cleaned = JSON.stringify(parsed);
    if (cleaned !== raw) {
      if (parsed.uid || parsed.platformAccessToken) {
        localStorage.setItem(STORAGE_KEY, cleaned);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
    }
    return parsed.uid || parsed.platformAccessToken ? parsed : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function writeStoredUser(user: StoredUser): void {
  const clean = sanitizeStoredUser(user as StoredUserRaw);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

export function clearStoredUser(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function platformTokenFromUser(user: StoredUser | null | undefined): string | null {
  if (!user?.platformAccessToken || !looksLikePlatformJwt(user.platformAccessToken)) {
    return null;
  }
  if (user.platformAccessExpire != null && user.platformAccessExpire <= Date.now()) {
    return null;
  }
  return user.platformAccessToken;
}

export function mergePlatformAccess(
  user: StoredUser,
  patch: { platformAccessToken: string; platformAccessExpire: number }
): StoredUser {
  return sanitizeStoredUser({
    ...user,
    platformAccessToken: patch.platformAccessToken,
    platformAccessExpire: patch.platformAccessExpire,
  });
}
