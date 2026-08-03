"use node";

import crypto from "crypto";

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 64;

export function hashWebPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyScryptHash(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = parts[1];
  const expected = parts[2];
  if (!salt || !expected) return false;
  const derived = crypto.scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(derived, "hex"));
  } catch {
    return false;
  }
}

/** Verify against `user.passwordHash` or legacy plaintext fields. */
export function verifyWebPassword(
  password: string,
  account: Record<string, unknown> | undefined | null
): boolean {
  if (!account) return false;
  if (typeof account.passwordHash === "string") {
    return verifyScryptHash(password, account.passwordHash);
  }
  if (typeof account.password === "string") {
    return account.password === password;
  }
  const data = account.data;
  if (data && typeof data === "object") {
    const row = data as Record<string, unknown>;
    if (typeof row.passwordHash === "string") {
      return verifyScryptHash(password, row.passwordHash);
    }
    if (typeof row.password === "string") {
      return row.password === password;
    }
  }
  return false;
}

export function usesLegacyPlainPassword(
  account: Record<string, unknown> | undefined | null
): boolean {
  if (!account) return false;
  if (typeof account.passwordHash === "string") return false;
  if (typeof account.password === "string") return true;
  const data = account.data;
  if (data && typeof data === "object") {
    const row = data as Record<string, unknown>;
    return typeof row.password === "string" && typeof row.passwordHash !== "string";
  }
  return false;
}
