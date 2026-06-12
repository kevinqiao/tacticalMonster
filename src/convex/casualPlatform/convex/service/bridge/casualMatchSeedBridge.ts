"use node";

import { casualGameBridgeSecret } from "./casualGameBridgeSecret";
import type { CasualSeedTier } from "../../data/casualSeedTierPolicy";

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

export type PickSeedRequest = {
  matchId: string;
  templateId: string;
  sessionKey: string;
  uids: string[];
  tier?: CasualSeedTier;
  poolVersion?: string;
};

export type PickSeedResponse = {
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

export type RecordSeedRequest = {
  matchId: string;
  uid: string;
  seedId: string;
  poolVersion: string;
};

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

export async function fetchPickCasualMatchSeed(
  body: PickSeedRequest,
  origin: string
): Promise<{ ok: true } & PickSeedResponse | { ok: false; error: string }> {
  const result = await postJson<PickSeedResponse & { ok?: boolean }>(
    `${origin}/internal/casual-match-pick-seed`,
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

export async function fetchRecordCasualMatchSeed(
  body: RecordSeedRequest,
  origin: string
): Promise<{ ok: true; alreadyRecorded?: true } | { ok: false; error: string }> {
  const result = await postJson<{ ok?: boolean; error?: string; alreadyRecorded?: true }>(
    `${origin}/internal/casual-match-record-seed`,
    body
  );
  if (!result.ok) return result;
  return {
    ok: true,
    ...(result.data.alreadyRecorded ? { alreadyRecorded: true as const } : {}),
  };
}
