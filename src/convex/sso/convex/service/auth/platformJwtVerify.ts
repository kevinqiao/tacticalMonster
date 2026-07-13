"use node";

import jwt from "jsonwebtoken";

import {
  PLATFORM_JWT_AUDIENCE,
  PLATFORM_JWT_ISSUER,
  PLATFORM_JWT_PRIVATE_KEY_DEV,
} from "../../../../shared/platformAuth/platformJwtConstants";

function platformVerifyKeys(): string[] {
  const keys: string[] = [PLATFORM_JWT_PRIVATE_KEY_DEV];
  const fromEnv = process.env.PLATFORM_JWT_PRIVATE_KEY;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    keys.unshift(fromEnv.replace(/\\n/g, "\n"));
  }
  return keys;
}

/** Returns internal uid (JWT sub) when platform access token is valid. */
export function verifyPlatformAccessToken(token: string): string | null {
  for (const key of platformVerifyKeys()) {
    try {
      const payload = jwt.verify(token, key, {
        algorithms: ["RS256"],
        audience: PLATFORM_JWT_AUDIENCE,
        issuer: PLATFORM_JWT_ISSUER,
      }) as jwt.JwtPayload;
      if (typeof payload.sub === "string" && payload.sub.length > 0) return payload.sub;
    } catch {
      // try next key
    }
  }
  return null;
}
