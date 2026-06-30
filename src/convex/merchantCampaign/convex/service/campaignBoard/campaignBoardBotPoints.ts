import type { CampaignBoardMode } from "../../data/campaignBoardBotConfig";
import {
  CAMPAIGN_BOARD_BOT_DAILY_PLAYS_BASE,
  CAMPAIGN_BOARD_BOT_DAILY_PLAYS_MAX,
  CAMPAIGN_BOARD_BOT_DAILY_PLAYS_MIN,
  CAMPAIGN_BOARD_BOT_HUMAN_ANCHOR_FLOOR,
  CAMPAIGN_BOARD_BOT_MULTI_START_MAX,
  CAMPAIGN_BOARD_BOT_MULTI_START_MIN,
  CAMPAIGN_BOARD_BOT_PLAY_DAY_MS,
  CAMPAIGN_BOARD_BOT_RAMP_FLOOR,
  CAMPAIGN_BOARD_BOT_RAMP_POWER,
  CAMPAIGN_BOARD_BOT_SESSION_MS,
  CAMPAIGN_BOARD_BOT_VALUE_BAND,
} from "../../data/campaignBoardBotConfig";
import {
  CAMPAIGN_MULTI_RANK_WEIGHTS,
  campaignMultiExpectedPointsPerMatch,
  campaignMultiRankPointsForPlace,
  campaignMultiRankPointsWeightTotal,
} from "../../data/campaignMultiRankPoints";
import { isCampaignBoardBotRevealed } from "./campaignBoardBotReveal";

function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** 0.25–1.0：同 cohort 内 bot 活跃度分化 */
export function campaignBoardBotPersonaFactor(cohortKey: string, slot: number): number {
  return 0.25 + 0.75 * hash01(`${cohortKey}:${slot}`);
}

export function campaignBoardPeriodProgress(
  now: number,
  startsAt: number,
  endsAt: number
): number {
  if (endsAt <= startsAt) return 0;
  return Math.max(0, Math.min(1, (now - startsAt) / (endsAt - startsAt)));
}

/** 相对真人榜首的目标倍率：强者可超过榜首，弱者明显落后 */
export function campaignBoardBotTargetMultiplier(cohortKey: string, slot: number): number {
  const persona = campaignBoardBotPersonaFactor(cohortKey, slot);
  if (persona >= 0.72) {
    return 1.05 + ((persona - 0.72) / 0.28) * 0.38;
  }
  if (persona >= 0.48) {
    return 0.78 + ((persona - 0.48) / 0.24) * 0.27;
  }
  return 0.42 + ((persona - 0.25) / 0.23) * 0.36;
}

export function computeCampaignBoardBotPeriodEndValue(args: {
  mode: CampaignBoardMode;
  cohortKey: string;
  slot: number;
}): number {
  const band = CAMPAIGN_BOARD_BOT_VALUE_BAND[args.mode];
  const persona = campaignBoardBotPersonaFactor(args.cohortKey, args.slot);
  return Math.floor(band.min + persona * (band.max - band.min));
}

export function computeCampaignBoardBotEffectiveTarget(args: {
  mode: CampaignBoardMode;
  cohortKey: string;
  slot: number;
  humanTop: number;
  storedPeriodEndValue: number;
}): number {
  const anchor = Math.max(CAMPAIGN_BOARD_BOT_HUMAN_ANCHOR_FLOOR[args.mode], args.humanTop);
  const anchored = Math.floor(anchor * campaignBoardBotTargetMultiplier(args.cohortKey, args.slot));
  const band = CAMPAIGN_BOARD_BOT_VALUE_BAND[args.mode];
  const bandTarget = args.storedPeriodEndValue;
  return Math.max(band.min, Math.min(band.max, Math.max(anchored, Math.floor(bandTarget * 0.55))));
}

type CohortRow = {
  startsAt: number;
  endsAt: number;
  status: "open" | "closed";
};

type BotMemberRow = {
  slot: number;
  revealAt: number;
  periodEndValue: number;
};

export type ResolveCampaignBoardBotValueArgs = {
  member: BotMemberRow;
  cohort: CohortRow;
  mode: CampaignBoardMode;
  cohortKey: string;
  humanTop: number;
  now?: number;
};

export type CampaignBoardBotMultiSimState = {
  rankPoints: number;
  plays: number;
};

function resolveCampaignBoardBotRampValue(
  effectivePeriodEnd: number,
  revealAt: number,
  cohort: CohortRow,
  now: number
): number {
  const progress = campaignBoardPeriodProgress(now, revealAt, cohort.endsAt);
  const eased = Math.pow(Math.max(0, Math.min(1, progress)), CAMPAIGN_BOARD_BOT_RAMP_POWER);
  const ramp = CAMPAIGN_BOARD_BOT_RAMP_FLOOR + (1 - CAMPAIGN_BOARD_BOT_RAMP_FLOOR) * eased;
  const value = Math.floor(effectivePeriodEnd * ramp);
  return Math.max(1, Math.min(effectivePeriodEnd, value));
}

/** multi 入榜前已累计 rankPoints：1–15，按 slot 确定性分化 */
export function campaignBoardBotMultiStartRankPoints(cohortKey: string, slot: number): number {
  const u = hash01(`${cohortKey}:start:${slot}`);
  const span = CAMPAIGN_BOARD_BOT_MULTI_START_MAX - CAMPAIGN_BOARD_BOT_MULTI_START_MIN + 1;
  return CAMPAIGN_BOARD_BOT_MULTI_START_MIN + Math.floor(u * span);
}

export function campaignBoardBotSimDayIndex(revealAt: number, ts: number): number {
  if (ts < revealAt) return -1;
  return Math.floor((ts - revealAt) / CAMPAIGN_BOARD_BOT_PLAY_DAY_MS);
}

export function campaignBoardBotSimDayStart(revealAt: number, dayIndex: number): number {
  return revealAt + dayIndex * CAMPAIGN_BOARD_BOT_PLAY_DAY_MS;
}

/** 以 reveal 为起点的模拟日局数：基准 ~10 局，persona + 日波动 */
export function campaignBoardBotDailyPlays(
  cohortKey: string,
  slot: number,
  dayIndex: number
): number {
  const persona = campaignBoardBotPersonaFactor(cohortKey, slot);
  const dayVar = hash01(`${cohortKey}:dp:${slot}:${dayIndex}`);
  const centered =
    CAMPAIGN_BOARD_BOT_DAILY_PLAYS_BASE * (0.55 + persona * 0.65) * (0.88 + dayVar * 0.24);
  return Math.max(
    CAMPAIGN_BOARD_BOT_DAILY_PLAYS_MIN,
    Math.min(CAMPAIGN_BOARD_BOT_DAILY_PLAYS_MAX, Math.round(centered))
  );
}

/** 模拟日内随机 5 小时游玩窗口（首日不早于 revealAt） */
export function campaignBoardBotSessionWindow(
  cohortKey: string,
  slot: number,
  simDayStartMs: number,
  minStartMs?: number
): { startMs: number; endMs: number } {
  const u = hash01(`${cohortKey}:sw:${slot}:${simDayStartMs}`);
  const maxOffset = Math.max(0, CAMPAIGN_BOARD_BOT_PLAY_DAY_MS - CAMPAIGN_BOARD_BOT_SESSION_MS);
  let startMs = simDayStartMs + Math.floor(u * maxOffset);
  if (minStartMs != null) {
    startMs = Math.max(startMs, minStartMs);
  }
  const dayEnd = simDayStartMs + CAMPAIGN_BOARD_BOT_PLAY_DAY_MS;
  if (startMs + CAMPAIGN_BOARD_BOT_SESSION_MS > dayEnd) {
    startMs = Math.max(simDayStartMs, dayEnd - CAMPAIGN_BOARD_BOT_SESSION_MS);
    if (minStartMs != null) {
      startMs = Math.max(startMs, minStartMs);
    }
  }
  return { startMs, endMs: startMs + CAMPAIGN_BOARD_BOT_SESSION_MS };
}

/** 将当日 N 局均匀落在 5 小时 session 内（带 slot 内抖动） */
export function campaignBoardBotMatchAtMs(
  cohortKey: string,
  slot: number,
  simDayStartMs: number,
  matchInDay: number,
  dailyPlays: number,
  minStartMs?: number
): number {
  const { startMs, endMs } = campaignBoardBotSessionWindow(
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

/** 按 reveal 起的模拟日 + 5h session 统计截至 now 已完成的局数 */
export function countCampaignBoardBotMatchesPlayed(args: {
  cohortKey: string;
  slot: number;
  revealAt: number;
  now: number;
  endsAt: number;
  maxMatches: number;
}): number {
  if (args.now < args.revealAt) return 0;

  const lastDay = campaignBoardBotSimDayIndex(
    args.revealAt,
    Math.min(args.now, args.endsAt)
  );
  let matchIndex = 0;

  for (let dayIndex = 0; dayIndex <= lastDay && matchIndex < args.maxMatches; dayIndex += 1) {
    const simDayStart = campaignBoardBotSimDayStart(args.revealAt, dayIndex);
    const dailyPlays = campaignBoardBotDailyPlays(args.cohortKey, args.slot, dayIndex);

    for (let m = 0; m < dailyPlays && matchIndex < args.maxMatches; m += 1) {
      const at = campaignBoardBotMatchAtMs(
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

/** 按 Portal 5 人桌权重 + persona 偏移，确定性抽取单局名次 */
export function pickCampaignBoardBotMatchRank(
  cohortKey: string,
  slot: number,
  matchIndex: number
): number {
  const persona = campaignBoardBotPersonaFactor(cohortKey, slot);
  const u = hash01(`${cohortKey}:mr:${slot}:${matchIndex}`);
  const skew = Math.max(0, Math.min(0.999, u - (persona - 0.5) * 0.38));
  const ticket = skew * campaignMultiRankPointsWeightTotal();
  let cum = 0;
  for (const row of CAMPAIGN_MULTI_RANK_WEIGHTS) {
    cum += row.weight;
    if (ticket < cum) return row.rank;
  }
  return 5;
}

/**
 * multi：逐局累加 Portal 名次积分（+5/+3/+1/-1/-2），与真人规则一致。
 */
export function simulateCampaignBoardBotMultiRankPoints(args: {
  cohortKey: string;
  slot: number;
  revealAt: number;
  now: number;
  cohort: CohortRow;
  effectivePeriodEnd: number;
}): CampaignBoardBotMultiSimState {
  const persona = campaignBoardBotPersonaFactor(args.cohortKey, args.slot);
  const avgPerMatch = campaignMultiExpectedPointsPerMatch(persona);
  const targetMatches = Math.max(
    3,
    Math.ceil(args.effectivePeriodEnd / Math.max(0.8, avgPerMatch))
  );
  const matchesPlayed = countCampaignBoardBotMatchesPlayed({
    cohortKey: args.cohortKey,
    slot: args.slot,
    revealAt: args.revealAt,
    now: args.now,
    endsAt: args.cohort.endsAt,
    maxMatches: targetMatches,
  });

  const startPoints = campaignBoardBotMultiStartRankPoints(args.cohortKey, args.slot);
  let total = startPoints;
  for (let m = 0; m < matchesPlayed; m += 1) {
    const rank = pickCampaignBoardBotMatchRank(args.cohortKey, args.slot, m);
    total += campaignMultiRankPointsForPlace(rank);
  }

  return {
    rankPoints: Math.max(
      CAMPAIGN_BOARD_BOT_MULTI_START_MIN,
      Math.min(args.effectivePeriodEnd, total)
    ),
    plays: matchesPlayed,
  };
}

/** reveal 前返回 null；reveal 后按活动进度缓升，目标锚定真人榜首并分层 */
export function resolveCampaignBoardBotValue(
  member: BotMemberRow,
  cohort: CohortRow,
  now: number = Date.now(),
  opts?: {
    mode?: CampaignBoardMode;
    cohortKey?: string;
    humanTop?: number;
  }
): number | null {
  const state = resolveCampaignBoardBotState(member, cohort, now, opts);
  return state?.rankPoints ?? null;
}

export function resolveCampaignBoardBotState(
  member: BotMemberRow,
  cohort: CohortRow,
  now: number = Date.now(),
  opts?: {
    mode?: CampaignBoardMode;
    cohortKey?: string;
    humanTop?: number;
  }
): (CampaignBoardBotMultiSimState & { rankPoints: number }) | null {
  if (cohort.status === "closed") {
    return {
      rankPoints: member.periodEndValue,
      plays: estimateCampaignBoardBotPlayCount({
        mode: opts?.mode ?? "multi",
        value: member.periodEndValue,
      }),
    };
  }
  if (!isCampaignBoardBotRevealed(member.revealAt, now)) {
    return null;
  }

  const revealAt = member.revealAt ?? cohort.startsAt;
  const mode = opts?.mode ?? "multi";
  const cohortKey = opts?.cohortKey ?? "campaign";
  const humanTop = opts?.humanTop ?? 0;

  const effectivePeriodEnd = computeCampaignBoardBotEffectiveTarget({
    mode,
    cohortKey,
    slot: member.slot,
    humanTop,
    storedPeriodEndValue: member.periodEndValue,
  });

  if (mode !== "multi") {
    const rankPoints = resolveCampaignBoardBotRampValue(
      effectivePeriodEnd,
      revealAt,
      cohort,
      now
    );
    return {
      rankPoints,
      plays: estimateCampaignBoardBotPlayCount({ mode, value: rankPoints }),
    };
  }

  return simulateCampaignBoardBotMultiRankPoints({
    cohortKey,
    slot: member.slot,
    revealAt,
    now,
    cohort,
    effectivePeriodEnd,
  });
}

export function resolveCampaignBoardBotValueAnchored(
  args: ResolveCampaignBoardBotValueArgs
): number | null {
  return resolveCampaignBoardBotValue(args.member, args.cohort, args.now ?? Date.now(), {
    mode: args.mode,
    cohortKey: args.cohortKey,
    humanTop: args.humanTop,
  });
}

export function estimateCampaignBoardBotPlayCount(args: {
  mode: CampaignBoardMode;
  value: number;
  cohortKey?: string;
  slot?: number;
  revealAt?: number;
  now?: number;
  cohort?: CohortRow;
  effectivePeriodEnd?: number;
}): number {
  if (
    args.mode === "multi" &&
    args.cohortKey != null &&
    args.slot != null &&
    args.revealAt != null &&
    args.now != null &&
    args.cohort != null &&
    args.effectivePeriodEnd != null
  ) {
    return simulateCampaignBoardBotMultiRankPoints({
      cohortKey: args.cohortKey,
      slot: args.slot,
      revealAt: args.revealAt,
      now: args.now,
      cohort: args.cohort,
      effectivePeriodEnd: args.effectivePeriodEnd,
    }).plays;
  }
  if (args.value <= 0) return 0;
  if (args.mode === "multi") {
    return Math.max(1, Math.round(args.value / CAMPAIGN_BOARD_BOT_DAILY_PLAYS_BASE));
  }
  return Math.max(1, Math.round(args.value / 7200));
}
