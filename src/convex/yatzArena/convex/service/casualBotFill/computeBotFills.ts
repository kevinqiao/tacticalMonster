/**
 * Casual v2 ingest — platform handles bot fill via platform_ingest.
 */
import type { ActionCtx } from "../../_generated/server";

import { fetchCasualMatchSubmitContext } from "../casualBridgeResolve";

export type CasualV2IngestPayload = {
  uid: string;
  matchGameId: string;
  score: number;
  seedScoreThreshold?: number;
};

export async function buildCasualV2IngestPayload(args: {
  ctx: ActionCtx;
  uid: string;
  matchGameId: string;
  score: number;
}): Promise<{ ok: true; payload: CasualV2IngestPayload } | { ok: false; error: string }> {
  const resolved = await fetchCasualMatchSubmitContext({
    uid: args.uid,
    matchGameId: args.matchGameId,
    score: args.score,
  });
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  return {
    ok: true,
    payload: {
      uid: args.uid,
      matchGameId: args.matchGameId,
      score: args.score,
    },
  };
}
