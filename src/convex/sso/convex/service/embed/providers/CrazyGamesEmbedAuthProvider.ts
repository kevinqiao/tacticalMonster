"use node";

import jwt from "jsonwebtoken";

import type { EmbedAuthProvider, EmbedIdentity, EmbedVerifyArgs } from "../embedAuthTypes";
import { resolveEmbedMethod } from "../partnerEmbedConfig";

const CRAZYGAMES_PUBLIC_KEY_URL = "https://sdk.crazygames.com/publicKey.json";
const PUBLIC_KEY_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedPublicKey: { value: string; fetchedAt: number } | null = null;

async function fetchCrazyGamesPublicKey(forceRefresh = false): Promise<string | null> {
  const now = Date.now();
  if (!forceRefresh && cachedPublicKey && now - cachedPublicKey.fetchedAt < PUBLIC_KEY_CACHE_TTL_MS) {
    return cachedPublicKey.value;
  }

  try {
    const response = await fetch(CRAZYGAMES_PUBLIC_KEY_URL);
    if (!response.ok) {
      return cachedPublicKey?.value ?? null;
    }
    const data = (await response.json()) as { publicKey?: unknown };
    const publicKey = typeof data.publicKey === "string" ? data.publicKey.trim() : "";
    if (!publicKey) {
      return cachedPublicKey?.value ?? null;
    }
    cachedPublicKey = { value: publicKey, fetchedAt: now };
    return publicKey;
  } catch {
    return cachedPublicKey?.value ?? null;
  }
}

function verifyCrazyGamesJwt(credential: string, publicKey: string): EmbedIdentity | null {
  try {
    const payload = jwt.verify(credential, publicKey, {
      algorithms: ["RS256"],
    }) as jwt.JwtPayload;

    const userId = typeof payload.userId === "string" ? payload.userId.trim() : "";
    if (!userId) return null;

    return {
      subject: userId,
      email: typeof payload.username === "string" ? payload.username : undefined,
    };
  } catch {
    return null;
  }
}

export const crazyGamesEmbedAuthProvider: EmbedAuthProvider = {
  method: "crazygames_jwt",

  supports(partner) {
    return resolveEmbedMethod(partner.data) === "crazygames_jwt";
  },

  async verify(args: EmbedVerifyArgs) {
    let publicKey = await fetchCrazyGamesPublicKey(false);
    if (!publicKey) return null;

    let identity = verifyCrazyGamesJwt(args.credential, publicKey);
    if (identity) return identity;

    publicKey = await fetchCrazyGamesPublicKey(true);
    if (!publicKey) return null;

    return verifyCrazyGamesJwt(args.credential, publicKey);
  },
};

export function resetCrazyGamesPublicKeyCacheForTests(): void {
  cachedPublicKey = null;
}
