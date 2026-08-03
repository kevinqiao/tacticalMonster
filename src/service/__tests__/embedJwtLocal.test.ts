import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";

import { EMBED_JWT_AUDIENCE } from "@/convex/sso/convex/service/embed/embedAuthConstants";
import { jwtLocalEmbedAuthProvider } from "@/convex/sso/convex/service/embed/providers/JwtLocalEmbedAuthProvider";

describe("jwtLocalEmbedAuthProvider", () => {
  it("verifies HS256 partner embed JWT and returns identity", async () => {
    const pid = 42;
    const token = jwt.sign(
      { sub: "partner_user_1", email: "u@partner.test" },
      `partner-dev-secret-${pid}`,
      { algorithm: "HS256", audience: EMBED_JWT_AUDIENCE, expiresIn: "15m" }
    );

    const identity = await jwtLocalEmbedAuthProvider.verify({
      pid,
      credential: token,
      partner: { pid, data: {} },
    });

    expect(identity).toEqual({
      subject: "partner_user_1",
      email: "u@partner.test",
    });
  });

  it("returns null for invalid token", async () => {
    const identity = await jwtLocalEmbedAuthProvider.verify({
      pid: 1,
      credential: "not-a-jwt",
      partner: { pid: 1, data: {} },
    });
    expect(identity).toBeNull();
  });

  it("uses partner.data.jwtSecret when configured", async () => {
    const pid = 7;
    const secret = "custom-partner-secret";
    const token = jwt.sign(
      { sub: "u2" },
      secret,
      { algorithm: "HS256", audience: EMBED_JWT_AUDIENCE, expiresIn: "5m" }
    );

    const identity = await jwtLocalEmbedAuthProvider.verify({
      pid,
      credential: token,
      partner: { pid, data: { jwtSecret: secret } },
    });

    expect(identity?.subject).toBe("u2");
  });
});
