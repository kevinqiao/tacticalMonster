/**
 * Casual resolve-match-submit-context HTTP client.
 */
import { resolveCasualBridgeEnv } from "./casualBridgeEnv";

export type ResolveSubmitContext = {
  mode: "daily" | "solo" | "mixed";
  templateId: string;
  matchId: string;
  maxPlayers: number;
  humanPlayerCount: number;
  botCount: number;
  seedBinding?: {
    seedId: string;
    poolVersion: string;
    tier: "easy" | "medium" | "hard";
  };
  sessionExternalId: string;
  botsSeeded: boolean;
  humanScores: Array<{ uid: string; score: number }>;
  wasHumanReplay: boolean;
  humanReplayEpoch?: number;
  soloRankPlanning?: unknown;
  successThresholdQuantile?: "p75";
  botPolicy?: "game_ingest" | "platform_ingest" | "none";
  isLastGame?: boolean;
};

export type ResolveContextResult =
  | { ok: true; context: ResolveSubmitContext }
  | { ok: false; error: string; status?: number };

export async function fetchCasualMatchSubmitContext(args: {
  uid: string;
  matchGameId: string;
  score?: number;
}): Promise<ResolveContextResult> {
  const { origin: casualOrigin, secret: bridge } = resolveCasualBridgeEnv();
  const url = `${casualOrigin}/internal/resolve-match-submit-context`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Casual-Bridge-Secret": bridge,
      },
      body: JSON.stringify({
        uid: args.uid,
        matchGameId: args.matchGameId,
        ...(args.score != null ? { score: args.score } : {}),
      }),
    });
  } catch (e) {
    console.error("[yatz] casual resolve fetch failed", e);
    return { ok: false, error: "casual_unreachable" };
  }

  let parsed: Record<string, unknown> = {};
  try {
    const text = await res.text();
    if (text) parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  if (!res.ok || parsed.ok !== true) {
    return {
      ok: false,
      error: typeof parsed.error === "string" ? parsed.error : `casual_${res.status}`,
      status: res.status,
    };
  }

  const mode = parsed.mode;
  if (mode !== "daily" && mode !== "solo" && mode !== "mixed") {
    return { ok: false, error: "bad_resolve_mode" };
  }

  return {
    ok: true,
    context: parsed as unknown as ResolveSubmitContext,
  };
}
