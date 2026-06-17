/**
 * League XP 纯函数：底座 + 名次加成；仅用于周 cohort 排名。
 */
import type { CasualTournamentDefinition } from "../../data/casualTournamentConfigs";
import {
  effectiveInstanceScope,
  isTriathlonTemplate,
} from "../../data/casualTournamentConfigs";
import {
  DAILY_LEAGUE_XP_SOFT_CAP,
  SOLO_CASUAL_LEAGUE_BASE_XP,
} from "../../data/casualWeeklyLeagueConfig";

export type LeagueXpLine = { label: string; value: number };

export type ResolveLeagueXpArgs = {
  def: CasualTournamentDefinition;
  seasonXpOnSettle: number;
  multiplayerFinalRank?: number;
  /** 今日已计入 League XP（单人软上限） */
  dailyLeagueXpGranted?: number;
};

function isSoloLowLeagueMode(def: CasualTournamentDefinition): boolean {
  const scope = effectiveInstanceScope(def);
  if (scope === "daily") return true;
  if (def.matchType === "solo_p75_challenge") return true;
  if (def.maxPlayers <= 1) return true;
  return false;
}

function leagueBaseXpForRank(rank: number, seasonXpBase: number): number {
  if (rank === 1) return Math.max(0, Math.floor(seasonXpBase));
  if (rank === 2) return Math.max(0, Math.floor(seasonXpBase));
  if (rank === 3) return Math.max(0, Math.floor(seasonXpBase * 0.5));
  return Math.max(0, Math.floor(seasonXpBase * 0.25));
}

function leagueRankBonus(rank: number, maxPlayers: number): number {
  if (rank === 1) {
    if (maxPlayers >= 5) return 18;
    if (maxPlayers >= 4) return 15;
    return 12;
  }
  if (rank === 2) return maxPlayers >= 4 ? 8 : 5;
  if (rank === 3) return 4;
  return 0;
}

/**
 * 计算本场应对 weeklyLeagueXp 增加的 Δ（≥0）。
 */
export function resolveLeagueXpDelta(args: ResolveLeagueXpArgs): {
  delta: number;
  lines: LeagueXpLine[];
} {
  const { def, seasonXpOnSettle } = args;
  const lines: LeagueXpLine[] = [];

  if (isSoloLowLeagueMode(def)) {
    const dailyGranted = Math.max(0, args.dailyLeagueXpGranted ?? 0);
    const capLeft = Math.max(0, DAILY_LEAGUE_XP_SOFT_CAP - dailyGranted);
    const raw = SOLO_CASUAL_LEAGUE_BASE_XP;
    const delta = Math.min(raw, capLeft);
    if (delta > 0) lines.push({ label: "参与", value: delta });
    return { delta, lines };
  }

  const mpRank = args.multiplayerFinalRank;
  if (typeof mpRank !== "number" || mpRank < 1) {
    return { delta: 0, lines };
  }

  const base = leagueBaseXpForRank(mpRank, seasonXpOnSettle);
  const bonus = leagueRankBonus(mpRank, def.maxPlayers);
  if (base > 0) lines.push({ label: "底座", value: base });
  if (bonus > 0) lines.push({ label: "名次", value: bonus });

  let delta = base + bonus;
  if (def.matchType === "season_challenge") {
    delta += 4;
    lines.push({ label: "专场", value: 4 });
  }
  if (isTriathlonTemplate(def)) {
    delta += 2;
    lines.push({ label: "三合一", value: 2 });
  }

  return { delta: Math.max(0, delta), lines };
}
