/**
 * Embed auth chain (offline layers):
 * 1. Frontend receives partner JWT (postMessage / __PARTNER_AUTH__)
 * 2. PlatformAuthProvider → exchangeEmbedCredential(jwt_local)
 * 3. JwtLocalEmbedAuthProvider verifies HS256
 * 4. completeEmbedSession maps identity → Platform JWT (Convex — tested via mocks above)
 */
import { describe, expect, it } from "vitest";

import { jwtLocalEmbedAuthProvider } from "@/convex/sso/convex/service/embed/providers/JwtLocalEmbedAuthProvider";
import { mintDevPartnerEmbedJwt } from "@/host/service/platformAuth/embedAuthTestUtils";

describe("embed auth end-to-end (frontend JWT → provider identity)", () => {
  it("partner JWT minted like APP backend verifies under JwtLocalEmbedAuthProvider", async () => {
    const pid = 100;
    const sub = "e2e_partner_user";
    const email = "e2e@partner.test";

    const credential = mintDevPartnerEmbedJwt({ pid, sub, email });

    const identity = await jwtLocalEmbedAuthProvider.verify({
      pid,
      credential,
      partner: { pid, data: {} },
    });

    expect(identity).toEqual({ subject: sub, email });
  });
});
