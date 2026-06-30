/**
 * Shared casual `/internal/casual-run-ingest` client (Node actions only).
 */
import {
  casualBridgeRequestHeaders,
  resolveCasualBridgeEnv,
  type PlatformBridge,
} from "./casualBridgeEnv";

export type CasualIngestParsed = {
  ok?: boolean;
  error?: string;
  tableSummary?: unknown;
  pendingOthers?: boolean;
  deduped?: boolean;
  finalized?: boolean;
  gameComplete?: boolean;
  nextGame?: { gameIndex: number; gameId: string; gameType: string };
  seedScoreThreshold?: number;
  success?: boolean;
};

export type CasualWatchReplayPayload = {
  seedId: string;
  steps: unknown[];
};

export async function postCasualRunIngest(args: {
  uid: string;
  matchGameId: string;
  score: number;
  seedScoreThreshold?: number;
  platformBridge?: PlatformBridge;
  watchReplay?: CasualWatchReplayPayload;
}): Promise<
  | { ok: true; parsed: CasualIngestParsed; status: number }
  | { ok: false; error: string; status?: number }
> {
  const bridgeEnv = resolveCasualBridgeEnv(args.platformBridge ?? "casual");
  const url = `${bridgeEnv.origin}/internal/casual-run-ingest`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: casualBridgeRequestHeaders(bridgeEnv),
      body: JSON.stringify({
        uid: args.uid,
        matchGameId: args.matchGameId,
        score: args.score,
        ...(typeof args.seedScoreThreshold === "number"
          ? { seedScoreThreshold: args.seedScoreThreshold }
          : {}),
        ...(args.watchReplay ? { watchReplay: args.watchReplay } : {}),
      }),
    });
  } catch (e) {
    console.error("[yatz] casual ingest fetch failed", e);
    return { ok: false, error: "casual_unreachable" };
  }

  let parsed: CasualIngestParsed = {};
  try {
    const text = await res.text();
    if (text) parsed = JSON.parse(text) as CasualIngestParsed;
  } catch {
    parsed = {};
  }

  if (!res.ok || !parsed.ok) {
    return {
      ok: false,
      error: parsed.error ?? `casual_${res.status}`,
      status: res.status,
    };
  }
  return { ok: true, parsed, status: res.status };
}
