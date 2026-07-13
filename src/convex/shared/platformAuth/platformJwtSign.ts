"use node";

import jwt from "jsonwebtoken";

import {
  PLATFORM_JWT_AUDIENCE,
  PLATFORM_JWT_ISSUER,
  PLATFORM_JWT_KID,
  PLATFORM_JWT_KID_PROD,
  PLATFORM_JWT_PRIVATE_KEY_DEV,
} from "./platformJwtConstants";

function platformPrivateKey(): { key: string; kid: string } {
  const fromEnv = process.env.PLATFORM_JWT_PRIVATE_KEY;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return { key: fromEnv.replace(/\\n/g, "\n"), kid: PLATFORM_JWT_KID_PROD };
  }
  return { key: PLATFORM_JWT_PRIVATE_KEY_DEV, kid: PLATFORM_JWT_KID };
}

/** 服务端间调用 arena authedAction 用的短时 RS256 平台 JWT（走 Authorization 头）。 */
export function signPlatformServiceToken(uid: string, ttlSec = 60 * 60): string {
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
      expiresIn: ttlSec,
      keyid: kid,
    }
  );
}
