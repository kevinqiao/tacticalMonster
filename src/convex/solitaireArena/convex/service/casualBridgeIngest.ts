/**
 * Shared casual `/internal/casual-run-ingest` client (Node actions only).
 */
import { resolveCasualBridgeEnv } from "./casualBridgeEnv";

export type CasualIngestParsed = {
  ok?: boolean;
  error?: string;
  tableSummary?: unknown;
  pendingOthers?: boolean;
  replayOffered?: boolean;
  replayTokenCount?: number;
  canReplay?: boolean;
  replayWindowEndsAt?: number;
  deduped?: boolean;
};

export async function postCasualRunIngest(args: {
  uid: string;
  matchGameId: string;
  score: number;
}): Promise<
  | { ok: true; parsed: CasualIngestParsed; status: number }
  | { ok: false; error: string; status?: number }
> {
  const { origin: casualOrigin, secret: bridge } = resolveCasualBridgeEnv();
  const url = `${casualOrigin}/internal/casual-run-ingest`;
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
        score: args.score,
        gameKind: "solitaire",
      }),
    });
  } catch (e) {
    console.error("[solitaire] casual ingest fetch failed", e);
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
