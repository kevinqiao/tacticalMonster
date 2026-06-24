"use node";

import jwt from "jsonwebtoken";

import {
  isRegisteredPortalGameType,
  type RegisteredPortalGameType,
} from "../../../data/portalGameRegistry";
import { jwtAccessSecret } from "../../auth/jwtAccessSecret";

const DEV_ARENA_CONVEX_URL: Record<RegisteredPortalGameType, string> = {
  solitaire: "https://artful-chipmunk-59.convex.cloud",
  block_blast: "https://spotted-marten-367.convex.cloud",
  tower_arena: "https://tower-arena-dev.convex.cloud",
  match_3: "https://strong-condor-681.convex.cloud",
  yatz: "https://precious-retriever-7.convex.cloud",
};

const ARENA_CONVEX_ENV: Record<RegisteredPortalGameType, string> = {
  solitaire: "SOLITAIRE_CONVEX_URL",
  block_blast: "BLOCK_BLAST_CONVEX_URL",
  tower_arena: "TOWER_CONVEX_URL",
  match_3: "MATCH3_CONVEX_URL",
  yatz: "YATZ_CONVEX_URL",
};

export function resolveArenaConvexCloudUrl(gameType: string): string | null {
  if (!isRegisteredPortalGameType(gameType)) return null;
  const envKey = ARENA_CONVEX_ENV[gameType];
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return DEV_ARENA_CONVEX_URL[gameType] ?? null;
}

/** Server-side arena forceEnd (avoids browser CORS to game Convex deployments). */
export async function forceEndCasualRunOnArena(args: {
  uid: string;
  gameId: string;
  gameType: string;
}): Promise<{ ok: true; ingested?: boolean } | { ok: false; error: string }> {
  const secret = jwtAccessSecret();
  if (!secret) return { ok: false, error: "no_jwt_secret" };
  const baseUrl = resolveArenaConvexCloudUrl(args.gameType);
  if (!baseUrl) return { ok: false, error: "no_arena_url" };

  const token = jwt.sign({ uid: args.uid }, secret, { expiresIn: "1h" });
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "proxy/controller:forceEndCasualPlatformRun",
        args: { token, gameId: args.gameId, platformBridge: "portal" },
        format: "json",
      }),
    });
  } catch (e) {
    console.warn("[portal] forceEndCasualRunOnArena fetch failed", args.gameId, e);
    return { ok: false, error: "arena_unreachable" };
  }

  let payload: { status?: string; value?: { ok?: boolean; error?: string; deduped?: boolean } } =
    {};
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    return { ok: false, error: "bad_arena_response" };
  }

  if (payload.status === "success" && payload.value?.ok) {
    return { ok: true, ingested: true };
  }
  const err = payload.value?.error ?? `arena_${response.status}`;
  return { ok: false, error: err };
}
