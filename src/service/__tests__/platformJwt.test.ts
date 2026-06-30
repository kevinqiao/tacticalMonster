import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";

import {
  PLATFORM_JWT_AUDIENCE,
  PLATFORM_JWT_ISSUER,
  PLATFORM_JWT_PRIVATE_KEY_DEV,
  PLATFORM_JWKS_DEV_JSON,
} from "@/convex/sso/convex/service/auth/platformJwtConstants";
import { signPlatformAccessToken } from "@/convex/sso/convex/service/auth/platformJwt";

describe("platformJwt", () => {
  it("signs RS256 JWT with convex aud and uid sub", () => {
    const token = signPlatformAccessToken("usr_test_123");
    const decoded = jwt.verify(token, PLATFORM_JWT_PRIVATE_KEY_DEV, {
      algorithms: ["RS256"],
      audience: PLATFORM_JWT_AUDIENCE,
      issuer: PLATFORM_JWT_ISSUER,
    }) as jwt.JwtPayload;

    expect(decoded.sub).toBe("usr_test_123");
    expect(decoded.aud).toBe(PLATFORM_JWT_AUDIENCE);
    expect(decoded.iss).toBe(PLATFORM_JWT_ISSUER);
  });

  it("embeds dev JWKS with platform-dev kid", () => {
    const jwks = JSON.parse(PLATFORM_JWKS_DEV_JSON) as { keys: Array<{ kid: string }> };
    expect(jwks.keys[0]?.kid).toBe("platform-dev");
  });
});

describe("partner embed dev token", () => {
  it("can mint HS256 partner token for exchangeEmbedCredential", () => {
    const pid = 0;
    const token = jwt.sign(
      { sub: "partner_user_demo", email: "demo@partner.test" },
      `partner-dev-secret-${pid}`,
      { algorithm: "HS256", audience: "tacticalmonster-embed", expiresIn: "15m" }
    );
    const decoded = jwt.verify(token, `partner-dev-secret-${pid}`, {
      algorithms: ["HS256"],
      audience: "tacticalmonster-embed",
    }) as jwt.JwtPayload;
    expect(decoded.sub).toBe("partner_user_demo");
  });
});
