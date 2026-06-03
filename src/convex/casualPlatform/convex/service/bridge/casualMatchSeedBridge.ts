"use node";

import { casualGameBridgeSecret } from "./casualGameBridgeSecret";
import type { CasualSeedTier } from "../../data/casualSeedTierPolicy";

const DEV_SOLITAIRE_SITE_ORIGIN = "https://artful-chipmunk-59.convex.site";

export type ScoreQuantiles = {
  p10: number;
  p25: number;
  p30: number;
  p33: number;
  p50: number;
  p66: number;
  p70: number;
  p75: number;
  p90: number;
};

export type ResolveSeedRequest = {
  templateId: string;
  matchId: string;
  gameType: string;
  /** 未传时 solitaire HTTP 默认 easy */
  tier?: CasualSeedTier;
  maxPlayers: number;
  humanPlayerCount: number;
  sessionKey?: string;
  /** 本场真人 uid；单人亦 `uids: ["one"]` */
  uids: string[];
};

export type ResolveSeedResponse = {
  seedId: string;
  poolVersion: string;
  tier: CasualSeedTier;
  difficultyScore: number;
  metrics: {
    scoreQuantiles: ScoreQuantiles;
    rolloutCount?: number;
    matchTimeLimitSec?: number;
  };
};

export type ScoreBand = {
  min: number;
  max?: number;
  /** 该区间最多返回条数；缺省 1 */
  count?: number;
};

export type RolloutsRequest = {
  seedId: string;
  poolVersion?: string;
  scores: ScoreBand[];
};

export type RolloutBandResult = {
  min: number;
  max?: number;
  count: number;
  rollouts: Array<{
    rolloutIndex: number;
    finalScore: number;
    elapsedTime: number;
  }>;
};

export type RolloutRow = RolloutBandResult["rollouts"][number];

function resolveSolitaireOrigin(): string {
  const origin = (process.env.SOLITAIRE_HTTP_ORIGIN ?? process.env.SOLITAIRE_CONVEX_SITE_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  return origin || DEV_SOLITAIRE_SITE_ORIGIN;
}

function bridgeHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Casual-Bridge-Secret": casualGameBridgeSecret(),
  };
}

async function postJson<T>(
  url: string,
  body: unknown
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: bridgeHeaders(),
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("[casual] seed bridge fetch failed", url, e);
    return { ok: false, error: "game_unreachable" };
  }
  let parsed: { ok?: boolean; error?: string } & T = {} as typeof parsed;
  try {
    const text = await response.text();
    if (text) parsed = JSON.parse(text) as typeof parsed;
  } catch {
    return { ok: false, error: "bad_response" };
  }
  if (!response.ok || parsed.ok === false) {
    return { ok: false, error: parsed.error ?? `http_${response.status}` };
  }
  return { ok: true, data: parsed };
}

export async function fetchGameMatchSeed(
  gameType: string,
  body: ResolveSeedRequest
): Promise<{ ok: true } & ResolveSeedResponse | { ok: false; error: string }> {
  if (gameType !== "solitaire") {
    return { ok: false, error: "unsupported_game" };
  }
  const origin = resolveSolitaireOrigin();
  const result = await postJson<ResolveSeedResponse & { ok?: boolean }>(
    `${origin}/internal/casual-match-resolve-seed`,
    body
  );
  if (!result.ok) return result;
  const { seedId, poolVersion, tier, difficultyScore, metrics } = result.data;
  if (!seedId || !poolVersion || !tier || !metrics?.scoreQuantiles) {
    return { ok: false, error: "invalid_seed_payload" };
  }
  return {
    ok: true,
    seedId,
    poolVersion,
    tier,
    difficultyScore: difficultyScore ?? 0,
    metrics,
  };
}

export async function fetchGameMatchRollouts(
  gameType: string,
  body: RolloutsRequest
): Promise<{ ok: true; bands: RolloutBandResult[] } | { ok: false; error: string }> {
  if (gameType !== "solitaire") {
    return { ok: false, error: "unsupported_game" };
  }
  const origin = resolveSolitaireOrigin();
  const result = await postJson<{ bands?: RolloutBandResult[] }>(
    `${origin}/internal/casual-match-rollouts`,
    body
  );
  if (!result.ok) return result;
  return { ok: true, bands: result.data.bands ?? [] };
}
