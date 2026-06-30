import crypto from "crypto";
import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  crazyGamesEmbedAuthProvider,
  resetCrazyGamesPublicKeyCacheForTests,
} from "@/convex/sso/convex/service/embed/providers/CrazyGamesEmbedAuthProvider";

function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKey, privateKey };
}

describe("crazyGamesEmbedAuthProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetCrazyGamesPublicKeyCacheForTests();
  });

  it("verifies RS256 CrazyGames JWT and maps userId to subject", async () => {
    const { publicKey, privateKey } = generateKeyPair();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ publicKey }),
      }))
    );

    const token = jwt.sign(
      { userId: "CG_USER_123", username: "player_one" },
      privateKey,
      { algorithm: "RS256" }
    );

    const identity = await crazyGamesEmbedAuthProvider.verify({
      pid: 100,
      credential: token,
      partner: { pid: 100, data: { embed: { method: "crazygames_jwt" } } },
    });

    expect(identity).toEqual({
      subject: "CG_USER_123",
      email: "player_one",
    });
  });

  it("returns null when userId missing", async () => {
    const { publicKey, privateKey } = generateKeyPair();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ publicKey }),
      }))
    );

    const token = jwt.sign({ username: "no_id" }, privateKey, { algorithm: "RS256" });

    const identity = await crazyGamesEmbedAuthProvider.verify({
      pid: 100,
      credential: token,
      partner: { pid: 100, data: { embed: { method: "crazygames_jwt" } } },
    });

    expect(identity).toBeNull();
  });
});
