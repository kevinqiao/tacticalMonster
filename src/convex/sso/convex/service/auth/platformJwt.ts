"use node";

import jwt from "jsonwebtoken";

import {
  PLATFORM_JWT_AUDIENCE,
  PLATFORM_JWT_ISSUER,
  PLATFORM_JWT_KID,
  PLATFORM_JWT_KID_PROD,
  PLATFORM_JWT_PRIVATE_KEY_DEV,
  PLATFORM_JWT_TTL_SEC,
} from "./platformJwtConstants";

function platformPrivateKey(): { key: string; kid: string } {
  const fromEnv = process.env.PLATFORM_JWT_PRIVATE_KEY;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    // Support both real newlines and literal \n (Convex / shell env quirks).
    const key = fromEnv.trim().replace(/\\n/g, "\n");
    return { key, kid: PLATFORM_JWT_KID_PROD };
  }
  return { key: PLATFORM_JWT_PRIVATE_KEY_DEV, kid: PLATFORM_JWT_KID };
}

/** RS256 platform session JWT for Convex `setAuth` / `getUserIdentity`. */
export function signPlatformAccessToken(uid: string): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const { key, kid } = platformPrivateKey();
  return jwt.sign(
    {
      sub: uid,
      iss: PLATFORM_JWT_ISSUER,
      aud: PLATFORM_JWT_AUDIENCE,
      iat: nowSec,
    },
    key,
    {
      algorithm: "RS256",
      expiresIn: PLATFORM_JWT_TTL_SEC,
      keyid: kid,
    }
  );
}

export function platformAccessTokenExpiresAtMs(): number {
  return Date.now() + PLATFORM_JWT_TTL_SEC * 1000;
}
