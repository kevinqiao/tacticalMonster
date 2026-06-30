"use node";

import jwt from "jsonwebtoken";

import {
  PLATFORM_JWT_AUDIENCE,
  PLATFORM_JWT_ISSUER,
  PLATFORM_JWT_KID,
  PLATFORM_JWT_PRIVATE_KEY_DEV,
  PLATFORM_JWT_TTL_SEC,
} from "./platformJwtConstants";

function platformPrivateKey(): string {
  const fromEnv = process.env.PLATFORM_JWT_PRIVATE_KEY;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv.replace(/\\n/g, "\n");
  }
  return PLATFORM_JWT_PRIVATE_KEY_DEV;
}

/** RS256 platform session JWT for Convex `setAuth` / `getUserIdentity`. */
export function signPlatformAccessToken(uid: string): string {
  const nowSec = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      sub: uid,
      iss: PLATFORM_JWT_ISSUER,
      aud: PLATFORM_JWT_AUDIENCE,
      iat: nowSec,
    },
    platformPrivateKey(),
    {
      algorithm: "RS256",
      expiresIn: PLATFORM_JWT_TTL_SEC,
      keyid: PLATFORM_JWT_KID,
    }
  );
}

export function platformAccessTokenExpiresAtMs(): number {
  return Date.now() + PLATFORM_JWT_TTL_SEC * 1000;
}
