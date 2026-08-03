import type { CampaignLeagueMode } from "./campaignLeagueConfig";
import {
  CAMPAIGN_LEAGUE_BOT_AVG_VALUE_PER_PLAY,
  CAMPAIGN_LEAGUE_BOT_DAILY_PLAYS_BASE,
  CAMPAIGN_LEAGUE_BOT_DAILY_PLAYS_MAX,
  CAMPAIGN_LEAGUE_BOT_DAILY_PLAYS_MIN,
  CAMPAIGN_LEAGUE_BOT_HUMAN_ANCHOR_FLOOR,
  CAMPAIGN_LEAGUE_BOT_MULTI_START_MAX,
  CAMPAIGN_LEAGUE_BOT_MULTI_START_MIN,
  CAMPAIGN_LEAGUE_BOT_PLAY_DAY_MS,
  CAMPAIGN_LEAGUE_BOT_RAMP_FLOOR,
  CAMPAIGN_LEAGUE_BOT_RAMP_POWER,
  CAMPAIGN_LEAGUE_BOT_SESSION_MS,
  CAMPAIGN_LEAGUE_BOT_VALUE_BAND,
} from "./campaignLeagueConfig";
import {
  CAMPAIGN_LEAGUE_MULTI_RANK_WEIGHTS,
  campaignMultiExpectedPointsPerMatch,
  campaignMultiRankPointsForPlace,
  campaignMultiRankPointsWeightTotal,
} from "./campaignMultiRankPoints";
import { isCampaignLeagueBotRevealed } from "./campaignLeagueBotReveal";

function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function campaignLeagueBotPersonaFactor(cohortKey: string, slot: number): number {
  return 0.25 + 0.75 * hash01(`${cohortKey}:${slot}`);
}

export function campaignLeaguePeriodProgress(
  now: number,
  startsAt: number,
  endsAt: number
): number {
  if (endsAt <= startsAt) return 0;
  return Math.max(0, Math.min(1, (now - startsAt) / (endsAt - startsAt)));
}

export function campaignLeagueBotTargetMultiplier(cohortKey: string, slot: number): number {
  const persona = campaignLeagueBotPersonaFactor(cohortKey, slot);
  if (persona >= 0.72) {
    return 1.05 + ((persona - 0.72) / 0.28) * 0.38;
  }
  if (persona >= 0.48) {
    return 0.78 + ((persona - 0.48) / 0.24) * 0.27;
  }
  return 0.42 + ((persona - 0.25) / 0.23) * 0.36;
}

export function computeCampaignLeagueBotPeriodEndValue(args: {
  mode: CampaignLeagueMode;
  cohortKey: string;
  slot: number;
}): number {
  const band = CAMPAIGN_LEAGUE_BOT_VALUE_BAND[args.mode];
  const persona = campaignLeagueBotPersonaFactor(args.cohortKey, args.slot);
  return Math.floor(band.min + persona * (band.max - band.min));
}

export function computeCampaignLeagueBotEffectiveTarget(args: {
  mode: CampaignLeagueMode;
  cohortKey: string;
  slot: number;
  humanTop: number;
  storedPeriodEndValue: number;
}): number {
  const anchor = Math.max(
    CAMPAIGN_LEAGUE_BOT_HUMAN_ANCHOR_FLOOR[args.mode],
    args.humanTop
  );
  const anchored = Math.floor(
    anchor * campaignLeagueBotTargetMultiplier(args.cohortKey, args.slot)
  );
  const band = CAMPAIGN_LEAGUE_BOT_VALUE_BAND[args.mode];
  const bandTarget = args.storedPeriodEndValue;
  return Math.max(
    band.min,
    Math.min(band.max, Math.max(anchored, Math.floor(bandTarget * 0.55)))
  );
}

type BoardRow = {
  startsAt: number;
  dueTime: number;
  status: "open" | "closed";
};

type BotMemberRow = {
  slot: number;
  revealAt: number;
  botPeriodEndValue: number;
};

export type CampaignLeagueBotMultiSimState = {
  rankPoints: number;
  plays: number;
};

function resolveCampaignLeagueBotRampValue(
  effectivePeriodEnd: number,
  revealAt: number,
  board: BoardRow,
  now: number
): number {
  const progress = campaignLeaguePeriodProgress(now, revealAt, board.dueTime);
  const eased = Math.pow(
    Math.max(0, Math.min(1, progress)),
    CAMPAIGN_LEAGUE_BOT_RAMP_POWER
  );
  const ramp = CAMPAIGN_LEAGUE_BOT_RAMP_FLOOR + (1 - CAMPAIGN_LEAGUE_BOT_RAMP_FLOOR) * eased;
  const value = Math.floor(effectivePeriodEnd * ramp);
  return Math.max(1, Math.min(effectivePeriodEnd, value));
}

export function campaignLeagueBotMultiStartRankPoints(
  cohortKey: string,
  slot: number
): number {
  const u = hash01(`${cohortKey}:start:${slot}`);
  const span =
    CAMPAIGN_LEAGUE_BOT_MULTI_START_MAX - CAMPAIGN_LEAGUE_BOT_MULTI_START_MIN + 1;
  return CAMPAIGN_LEAGUE_BOT_MULTI_START_MIN + Math.floor(u * span);
}

export function campaignLeagueBotSimDayIndex(revealAt: number, ts: number): number {
  if (ts < revealAt) return -1;
  return Math.floor((ts - revealAt) / CAMPAIGN_LEAGUE_BOT_PLAY_DAY_MS);
}

export function campaignLeagueBotSimDayStart(revealAt: number, dayIndex: number): number {
  return revealAt + dayIndex * CAMPAIGN_LEAGUE_BOT_PLAY_DAY_MS;
}

export function campaignLeagueBotDailyPlays(
  cohortKey: string,
  slot: number,
  dayIndex: number
): number {
  const persona = campaignLeagueBotPersonaFactor(cohortKey, slot);
  const dayVar = hash01(`${cohortKey}:dp:${slot}:${dayIndex}`);
  const centered =
    CAMPAIGN_LEAGUE_BOT_DAILY_PLAYS_BASE *
    (0.55 + persona * 0.65) *
    (0.88 + dayVar * 0.24);
  return Math.max(
    CAMPAIGN_LEAGUE_BOT_DAILY_PLAYS_MIN,
    Math.min(CAMPAIGN_LEAGUE_BOT_DAILY_PLAYS_MAX, Math.round(centered))
  );
}

export function campaignLeagueBotSessionWindow(
  cohortKey: string,
  slot: number,
  simDayStartMs: number,
  minStartMs?: number
): { startMs: number; endMs: number } {
  const u = hash01(`${cohortKey}:sw:${slot}:${simDayStartMs}`);
  const maxOffset = Math.max(
    0,
    CAMPAIGN_LEAGUE_BOT_PLAY_DAY_MS - CAMPAIGN_LEAGUE_BOT_SESSION_MS
  );
  let startMs = simDayStartMs + Math.floor(u * maxOffset);
  if (minStartMs != null) {
    startMs = Math.max(startMs, minStartMs);
  }
  const dayEnd = simDayStartMs + CAMPAIGN_LEAGUE_BOT_PLAY_DAY_MS;
  if (startMs + CAMPAIGN_LEAGUE_BOT_SESSION_MS > dayEnd) {
    startMs = Math.max(simDayStartMs, dayEnd - CAMPAIGN_LEAGUE_BOT_SESSION_MS);
    if (minStartMs != null) {
      startMs = Math.max(startMs, minStartMs);
    }
  }
  return { startMs, endMs: startMs + CAMPAIGN_LEAGUE_BOT_SESSION_MS };
}

export function campaignLeagueBotMatchAtMs(
  cohortKey: string,
  slot: number,
  simDayStartMs: number,
  matchInDay: number,
  dailyPlays: number,
  minStartMs?: number
): number {
  const { startMs, endMs } = campaignLeagueBotSessionWindow(
    cohortKey,
    slot,
    simDayStartMs,
    minStartMs
  );
  const span = Math.max(1, endMs - startMs);
  const slotWidth = span / Math.max(1, dailyPlays);
  const u = hash01(`${cohortKey}:mt:${slot}:${simDayStartMs}:${matchInDay}`);
  const slotStart = startMs + matchInDay * slotWidth;
  const within = u * slotWidth * 0.92;
  return Math.floor(Math.min(endMs - 1, slotStart + within));
}

export function countCampaignLeagueBotMatchesPlayed(args: {
  cohortKey: string;
  slot: number;
  revealAt: number;
  now: number;
  dueTime: number;
  maxMatches: number;
}): number {
  if (args.now < args.revealAt) return 0;

  const lastDay = campaignLeagueBotSimDayIndex(
    args.revealAt,
    Math.min(args.now, args.dueTime)
  );
  let matchIndex = 0;

  for (
    let dayIndex = 0;
    dayIndex <= lastDay && matchIndex < args.maxMatches;
    dayIndex += 1
  ) {
    const simDayStart = campaignLeagueBotSimDayStart(args.revealAt, dayIndex);
    const dailyPlays = campaignLeagueBotDailyPlays(args.cohortKey, args.slot, dayIndex);

    for (let m = 0; m < dailyPlays && matchIndex < args.maxMatches; m += 1) {
      const at = campaignLeagueBotMatchAtMs(
        args.cohortKey,
        args.slot,
        simDayStart,
        m,
        dailyPlays,
        dayIndex === 0 ? args.revealAt : undefined
      );
      if (at < args.revealAt) continue;
      if (at > args.now) return matchIndex;
      matchIndex += 1;
    }
  }

  return matchIndex;
}

export function pickCampaignLeagueBotMatchRank(
  cohortKey: string,
  slot: number,
  matchIndex: number
): number {
  const persona = campaignLeagueBotPersonaFactor(cohortKey, slot);
  const u = hash01(`${cohortKey}:mr:${slot}:${matchIndex}`);
  const skew = Math.max(0, Math.min(0.999, u - (persona - 0.5) * 0.38));
  const ticket = skew * campaignMultiRankPointsWeightTotal();
  let cum = 0;
  for (const row of CAMPAIGN_LEAGUE_MULTI_RANK_WEIGHTS) {
    cum += row.weight;
    if (ticket < cum) return row.rank;
  }
  return 5;
}

export function simulateCampaignLeagueBotMultiRankPoints(args: {
  cohortKey: string;
  slot: number;
  revealAt: number;
  now: number;
  board: BoardRow;
  effectivePeriodEnd: number;
}): CampaignLeagueBotMultiSimState {
  const persona = campaignLeagueBotPersonaFactor(args.cohortKey, args.slot);
  const avgPerMatch = campaignMultiExpectedPointsPerMatch(persona);
  const targetMatches = Math.max(
    3,
    Math.ceil(args.effectivePeriodEnd / Math.max(0.8, avgPerMatch))
  );
  const matchesPlayed = countCampaignLeagueBotMatchesPlayed({
    cohortKey: args.cohortKey,
    slot: args.slot,
    revealAt: args.revealAt,
    now: args.now,
    dueTime: args.board.dueTime,
    maxMatches: targetMatches,
  });

  const startPoints = campaignLeagueBotMultiStartRankPoints(args.cohortKey, args.slot);
  let total = startPoints;
  for (let m = 0; m < matchesPlayed; m += 1) {
    const rank = pickCampaignLeagueBotMatchRank(args.cohortKey, args.slot, m);
    total += campaignMultiRankPointsForPlace(rank);
  }

  return {
    rankPoints: Math.max(
      CAMPAIGN_LEAGUE_BOT_MULTI_START_MIN,
      Math.min(args.effectivePeriodEnd, total)
    ),
    plays: matchesPlayed,
  };
}

export function resolveCampaignLeagueBotState(
  member: BotMemberRow,
  board: BoardRow,
  now: number = Date.now(),
  opts?: {
    mode?: CampaignLeagueMode;
    cohortKey?: string;
    humanTop?: number;
  }
): (CampaignLeagueBotMultiSimState & { rankPoints: number }) | null {
  if (board.status === "closed") {
    return {
      rankPoints: member.botPeriodEndValue,
      plays: estimateCampaignLeagueBotPlayCount({
        mode: opts?.mode ?? "multi",
        value: member.botPeriodEndValue,
      }),
    };
  }
  if (!isCampaignLeagueBotRevealed(member.revealAt, now)) {
    return null;
  }

  const revealAt = member.revealAt ?? board.startsAt;
  const mode = opts?.mode ?? "multi";
  const cohortKey = opts?.cohortKey ?? "campaign";
  const humanTop = opts?.humanTop ?? 0;

  const effectivePeriodEnd = computeCampaignLeagueBotEffectiveTarget({
    mode,
    cohortKey,
    slot: member.slot,
    humanTop,
    storedPeriodEndValue: member.botPeriodEndValue,
  });

  if (mode !== "multi") {
    const rankPoints = resolveCampaignLeagueBotRampValue(
      effectivePeriodEnd,
      revealAt,
      board,
      now
    );
    return {
      rankPoints,
      plays: estimateCampaignLeagueBotPlayCount({ mode, value: rankPoints }),
    };
  }

  return simulateCampaignLeagueBotMultiRankPoints({
    cohortKey,
    slot: member.slot,
    revealAt,
    now,
    board,
    effectivePeriodEnd,
  });
}

export function estimateCampaignLeagueBotPlayCount(args: {
  mode: CampaignLeagueMode;
  value: number;
}): number {
  if (args.value <= 0) return 0;
  if (args.mode === "multi") {
    return Math.max(1, Math.round(args.value / CAMPAIGN_LEAGUE_BOT_DAILY_PLAYS_BASE));
  }
  const perPlay = CAMPAIGN_LEAGUE_BOT_AVG_VALUE_PER_PLAY.solo;
  return Math.max(1, Math.round(args.value / Math.max(0.1, perPlay)));
}
