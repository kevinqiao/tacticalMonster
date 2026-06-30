/**
 * Casual solo-rank-planning-inputs HTTP client.
 */
import {
  casualBridgeRequestHeaders,
  resolveCasualBridgeEnv,
  type PlatformBridge,
} from "../casualBridgeEnv";
import type {
  BotStrategyPlayerContext,
  CasualRankRateEntry,
} from "./botStrategyTypes";

export type SoloRankPlanningInputs = {
  profile: BotStrategyPlayerContext;
  rankCounts: Record<number, number>;
  rankRates: CasualRankRateEntry[];
  maxPlayers: number;
};

export type SoloRankPlanningResult =
  | { ok: true; inputs: SoloRankPlanningInputs }
  | { ok: false; error: string; status?: number };

function normalizeRankCounts(raw: unknown): Record<number, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const rank = Number(k);
    if (Number.isFinite(rank) && rank >= 1 && typeof v === "number" && v > 0) {
      out[rank] = v;
    }
  }
  return out;
}

export async function fetchSoloRankPlanningInputs(args: {
  uid: string;
  templateId: string;
  platformBridge?: PlatformBridge;
}): Promise<SoloRankPlanningResult> {
  const bridgeEnv = resolveCasualBridgeEnv(args.platformBridge ?? "casual");
  const url = `${bridgeEnv.origin}/internal/solo-rank-planning-inputs`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: casualBridgeRequestHeaders(bridgeEnv),
      body: JSON.stringify({ uid: args.uid, templateId: args.templateId }),
    });
  } catch (e) {
    console.error("[solitaire] casual solo-rank-planning fetch failed", e);
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

  const profile = parsed.profile as BotStrategyPlayerContext | undefined;
  if (!profile || typeof profile !== "object") {
    return { ok: false, error: "bad_profile" };
  }

  const rankRatesRaw = parsed.rankRates;
  const rankRates: CasualRankRateEntry[] = Array.isArray(rankRatesRaw)
    ? rankRatesRaw
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const o = item as Record<string, unknown>;
          const rank = typeof o.rank === "number" ? o.rank : NaN;
          const odd = typeof o.odd === "number" ? o.odd : NaN;
          if (!Number.isFinite(rank) || !Number.isFinite(odd)) return null;
          return { rank, odd };
        })
        .filter((x): x is CasualRankRateEntry => x != null)
    : [];

  const maxPlayers =
    typeof parsed.maxPlayers === "number" && Number.isFinite(parsed.maxPlayers)
      ? Math.floor(parsed.maxPlayers)
      : profile.maxPlayers;

  return {
    ok: true,
    inputs: {
      profile,
      rankCounts: normalizeRankCounts(parsed.rankCounts),
      rankRates,
      maxPlayers,
    },
  };
}
