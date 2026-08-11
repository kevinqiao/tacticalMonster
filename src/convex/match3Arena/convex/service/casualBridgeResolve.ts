/**
 * Casual resolve-match-submit-context HTTP client.
 */
import {
  casualBridgeRequestHeaders,
  resolveCasualBridgeEnv,
  type PlatformBridge,
} from "./casualBridgeEnv";
import type { ResolveSubmitContext } from "./casualBotFill/computeBotFills";

export type ResolveContextResult =
  | { ok: true; context: ResolveSubmitContext }
  | { ok: false; error: string; status?: number };

export async function fetchCasualMatchSubmitContext(args: {
  uid: string;
  matchGameId: string;
  score?: number;
  platformBridge?: PlatformBridge;
}): Promise<ResolveContextResult> {
  const bridgeEnv = resolveCasualBridgeEnv(args.platformBridge ?? "casual");
  const url = `${bridgeEnv.origin}/internal/resolve-match-submit-context`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: casualBridgeRequestHeaders(bridgeEnv),
      body: JSON.stringify({
        uid: args.uid,
        matchGameId: args.matchGameId,
        ...(args.score != null ? { score: args.score } : {}),
      }),
    });
  } catch (e) {
    console.error("[match3] casual resolve fetch failed", e);
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

  const rawMode = parsed.mode;
  // Legacy wire: `"solo"` = single human in async multi (not Solo Challenge).
  const mode =
    rawMode === "solo"
      ? "single_human"
      : rawMode === "daily" || rawMode === "single_human" || rawMode === "mixed"
        ? rawMode
        : null;
  if (mode == null) {
    return { ok: false, error: "bad_resolve_mode" };
  }

  if (mode === "single_human") {
    const planning = parsed.soloRankPlanning;
    if (!planning || typeof planning !== "object") {
      return { ok: false, error: "missing_solo_rank_planning" };
    }
    const profile = (planning as Record<string, unknown>).profile;
    if (!profile || typeof profile !== "object") {
      return { ok: false, error: "bad_solo_rank_planning_profile" };
    }
  }

  return {
    ok: true,
    context: { ...parsed, mode } as unknown as ResolveSubmitContext,
  };
}
