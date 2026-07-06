"use node";

import {
  isRegisteredPortalGameType,
  type RegisteredPortalGameType,
} from "../../../data/portalGameRegistry";
import { signPlatformServiceToken } from "../../../../../shared/platformAuth/platformJwtSign";

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
  const baseUrl = resolveArenaConvexCloudUrl(args.gameType);
  if (!baseUrl) return { ok: false, error: "no_arena_url" };

  // arena authedAction 走 customJwt 身份校验：须以 Authorization 头携带 RS256 平台 JWT
  const token = signPlatformServiceToken(args.uid);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        path: "proxy/controller:forceEndCasualPlatformRun",
        args: { gameId: args.gameId, platformBridge: "portal" },
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
