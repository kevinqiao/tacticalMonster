"use node";

import jwt from "jsonwebtoken";

import {
  PLATFORM_JWT_AUDIENCE,
  PLATFORM_JWT_ISSUER,
  PLATFORM_JWT_PRIVATE_KEY_DEV,
} from "../../../../shared/platformAuth/platformJwtConstants";

function platformVerifyKey(): string {
  const fromEnv = process.env.PLATFORM_JWT_PRIVATE_KEY;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv.replace(/\\n/g, "\n");
  }
  return PLATFORM_JWT_PRIVATE_KEY_DEV;
}

/** Returns internal uid (JWT sub) when platform access token is valid. */
export function verifyPlatformAccessToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, platformVerifyKey(), {
      algorithms: ["RS256"],
      audience: PLATFORM_JWT_AUDIENCE,
      issuer: PLATFORM_JWT_ISSUER,
    }) as jwt.JwtPayload;
    return typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}
