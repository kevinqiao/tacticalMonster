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
  weeklyLeagueSettle?: unknown;
  nextGame?: { gameIndex: number; gameId: string; gameType: string };
  seedScoreThreshold?: number;
  success?: boolean;
};

export type BotFillPayload = {
  rank: number;
  score: number;
  duration?: number;
  rolloutIndex?: number;
};

export type CasualWatchReplayPayload = {
  seedId: string;
  steps: unknown[];
};

/** Portal sync bot fill + mutations can exceed 20s in dev; keep below Convex action budget. */
const CASUAL_INGEST_FETCH_TIMEOUT_MS = 90_000;

function logIngestClientTiming(
  matchGameId: string,
  step: string,
  t0: number,
  last: { ms: number },
  extra?: Record<string, unknown>,
  done?: boolean
) {
  const now = Date.now();
  console.log("[blockBlast][ingest-timing][postCasualRunIngest]", matchGameId, step, {
    stepMs: now - last.ms,
    totalMs: now - t0,
    ...(done ? { done: true } : {}),
    ...extra,
  });
  last.ms = now;
}

export async function postCasualRunIngest(args: {
  uid: string;
  matchGameId: string;
  score: number;
  botFills?: BotFillPayload[];
  replaceAllVirtual?: boolean;
  seedScoreThreshold?: number;
  platformBridge?: PlatformBridge;
  watchReplay?: CasualWatchReplayPayload;
}): Promise<
  | { ok: true; parsed: CasualIngestParsed; status: number }
  | { ok: false; error: string; status?: number }
> {
  const bridgeEnv = resolveCasualBridgeEnv(args.platformBridge ?? "casual");
  const url = `${bridgeEnv.origin}/internal/casual-run-ingest`;
  const t0 = Date.now();
  const last = { ms: t0 };
  logIngestClientTiming(args.matchGameId, "start", t0, last, {
    uid: args.uid,
    score: args.score,
    botFillCount: args.botFills?.length ?? 0,
    platformBridge: args.platformBridge ?? "casual",
  });
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: casualBridgeRequestHeaders(bridgeEnv),
      signal: AbortSignal.timeout(CASUAL_INGEST_FETCH_TIMEOUT_MS),
      body: JSON.stringify({
        uid: args.uid,
        matchGameId: args.matchGameId,
        score: args.score,
        ...(args.botFills && args.botFills.length > 0 ? { botFills: args.botFills } : {}),
        ...(args.replaceAllVirtual ? { replaceAllVirtual: true } : {}),
        ...(typeof args.seedScoreThreshold === "number"
          ? { seedScoreThreshold: args.seedScoreThreshold }
          : {}),
        ...(args.watchReplay ? { watchReplay: args.watchReplay } : {}),
      }),
    });
    logIngestClientTiming(args.matchGameId, "fetch.done", t0, last, {
      status: res.status,
      ok: res.ok,
    });
  } catch (e) {
    logIngestClientTiming(args.matchGameId, "fetch.failed", t0, last, {
      error: String(e),
    }, true);
    console.warn("[blockBlast] casual ingest fetch failed", e);
    return { ok: false, error: "casual_unreachable" };
  }

  let parsed: CasualIngestParsed = {};
  try {
    const text = await res.text();
    logIngestClientTiming(args.matchGameId, "response.text", t0, last, {
      bytes: text.length,
    });
    if (text) parsed = JSON.parse(text) as CasualIngestParsed;
  } catch {
    parsed = {};
  }

  if (!res.ok || !parsed.ok) {
    logIngestClientTiming(args.matchGameId, "response.error", t0, last, {
      status: res.status,
      error: parsed.error ?? `casual_${res.status}`,
    }, true);
    return {
      ok: false,
      error: parsed.error ?? `casual_${res.status}`,
      status: res.status,
    };
  }
  logIngestClientTiming(args.matchGameId, "response.ok", t0, last, {
    status: res.status,
    deduped: parsed.deduped ?? false,
    pendingOthers: parsed.pendingOthers ?? false,
    finalized: parsed.finalized ?? false,
    hasTableSummary: parsed.tableSummary != null,
  }, true);
  return { ok: true, parsed, status: res.status };
}
