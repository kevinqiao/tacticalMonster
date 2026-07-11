/**
 * Portal 周联赛 Bot 分数：seed + 阶梯 rollout。
 * 不接游戏 seed 池；用 cohortKey+slot 确定性生成双模式（solo/multi）虚拟赛程，到点跳分。
 * 段位经 ease-in 曲线加压；solo 失败可按 replayRecoveryBias 等效再战救回。
 */
import {
  getPortalDailyPlayLimits,
  type PortalDailyPlayLimits,
} from "../../data/portalDailyPlayLimits";
import {
  PORTAL_MULTI_RANK_POINTS,
  PORTAL_SOLO_POINTS,
} from "../../data/portalTournamentConfigs";
import {
  DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
  resolvePortalWeeklyLeagueBotTierScaling,
  type PortalWeeklyLeagueBotTierScaling,
  type PortalWeeklyLeagueTierId,
} from "../../data/portalWeeklyLeagueConfig";
import {
  isPortalWeeklyLeagueBotRevealed,
  portalWeeklyLeagueBotUnit,
} from "./portalWeeklyLeagueBotReveal";

/** 模拟日长度 */
export const PORTAL_WEEKLY_LEAGUE_BOT_PLAY_DAY_MS = 24 * 3600 * 1000;

/** 每日游玩 session 窗口（局点落在此窗口内） */
export const PORTAL_WEEKLY_LEAGUE_BOT_SESSION_MS = 5 * 3600 * 1000;

/** 多人名次权重（与 Portal CASUAL_RANK_RATES_5 一致） */
const MULTI_RANK_WEIGHTS: ReadonlyArray<{ rank: number; weight: number }> = [
  { rank: 1, weight: 30 },
  { rank: 2, weight: 25 },
  { rank: 3, weight: 20 },
  { rank: 4, weight: 15 },
  { rank: 5, weight: 10 },
];

function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** cohortKey = week|gameType|leagueTierId|cohortId */
export function parseLeagueTierIdFromCohortKey(cohortKey: string): string {
  const parts = cohortKey.split("|");
  return parts[2] ?? DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER;
}

/**
 * 去掉段位后的 RNG 盐：同 week/game/cohort/slot 跨段位共用随机，
 * 段位只通过曲线缩放（floor/mul/recovery）加压，避免 hash 盐导致高段反而更弱。
 */
export function portalWeeklyLeagueBotBaseKey(cohortKey: string): string {
  const parts = cohortKey.split("|");
  if (parts.length >= 4) {
    return `${parts[0]}|${parts[1]}|_|${parts.slice(3).join("|")}`;
  }
  return cohortKey;
}

function tierScalingForCohortKey(cohortKey: string): PortalWeeklyLeagueBotTierScaling {
  return resolvePortalWeeklyLeagueBotTierScaling(parseLeagueTierIdFromCohortKey(cohortKey));
}

export function portalWeeklyLeagueBotPersonaFactor(cohortKey: string, slot: number): number {
  const baseKey = portalWeeklyLeagueBotBaseKey(cohortKey);
  const { personaFloor, personaCeiling } = tierScalingForCohortKey(cohortKey);
  const span = Math.max(0, personaCeiling - personaFloor);
  return personaFloor + span * hash01(`${baseKey}:${slot}`);
}

export function portalWeeklyLeagueWeekProgress(
  now: number,
  startsAt: number,
  endsAt: number
): number {
  if (endsAt <= startsAt) return 0;
  return Math.max(0, Math.min(1, (now - startsAt) / (endsAt - startsAt)));
}

/** 可见起始分：段位曲线带内确定性伪随机 */
export function computePortalWeeklyLeagueBotStartPoints(args: {
  cohortKey: string;
  slot: number;
}): number {
  const baseKey = portalWeeklyLeagueBotBaseKey(args.cohortKey);
  const u = portalWeeklyLeagueBotUnit(baseKey, args.slot + 101);
  const { startPointsMin, startPointsMax } = tierScalingForCohortKey(args.cohortKey);
  const min = startPointsMin;
  const max = Math.max(min, startPointsMax);
  return min + Math.floor(u * (max - min + 1));
}

export function leagueBotUidForSlot(cohortId: string, slot: number): string {
  return `pwl_bot_${cohortId}_${slot}`;
}

export function parseLeagueBotSlot(uid: string): number | null {
  const part = uid.split("_").pop();
  if (part == null) return null;
  const n = Number(part);
  return Number.isFinite(n) ? n : null;
}

export function portalWeeklyLeagueCohortKey(args: {
  weekKey: string;
  gameType: string;
  leagueTierId: string;
  cohortId: string;
}): string {
  return `${args.weekKey}|${args.gameType}|${args.leagueTierId}|${args.cohortId}`;
}

export type PortalWeeklyLeagueBotMatchMode = "solo" | "multi";

export type PortalWeeklyLeagueBotMatchStep = {
  atMs: number;
  mode: PortalWeeklyLeagueBotMatchMode;
  delta: number;
};

function multiRankWeightTotal(): number {
  return MULTI_RANK_WEIGHTS.reduce((s, r) => s + r.weight, 0);
}

/** persona 偏置抽多人名次 1–5 */
export function pickPortalWeeklyLeagueBotMatchRank(
  cohortKey: string,
  slot: number,
  matchIndex: number
): number {
  const baseKey = portalWeeklyLeagueBotBaseKey(cohortKey);
  const persona = portalWeeklyLeagueBotPersonaFactor(cohortKey, slot);
  const u = hash01(`${baseKey}:mr:${slot}:${matchIndex}`);
  const skew = Math.max(0, Math.min(0.999, u - (persona - 0.5) * 0.38));
  const ticket = skew * multiRankWeightTotal();
  let cum = 0;
  for (const row of MULTI_RANK_WEIGHTS) {
    cum += row.weight;
    if (ticket < cum) return row.rank;
  }
  return 5;
}

/**
 * persona 偏置：solo 是否达标；失败后按段位 replayRecoveryBias 等效再战救回。
 */
export function pickPortalWeeklyLeagueBotSoloSuccess(
  cohortKey: string,
  slot: number,
  matchIndex: number
): boolean {
  const baseKey = portalWeeklyLeagueBotBaseKey(cohortKey);
  const scaling = tierScalingForCohortKey(cohortKey);
  const persona = portalWeeklyLeagueBotPersonaFactor(cohortKey, slot);
  // 弱 ~40%，强 ~75%（按绝对 persona；高段抬 floor 会整体抬胜率）
  const pSuccess = 0.4 + (persona - 0.25) * (0.35 / 0.75);
  const u = hash01(`${baseKey}:solo:${slot}:${matchIndex}`);
  let ok = u < Math.max(0.2, Math.min(0.9, pSuccess));
  if (!ok && scaling.replayRecoveryBias > 0) {
    const r = hash01(`${baseKey}:replay:${slot}:${matchIndex}`);
    if (r < scaling.replayRecoveryBias) ok = true;
  }
  return ok;
}

function multiDeltaForRank(rank: number): number {
  return PORTAL_MULTI_RANK_POINTS[rank] ?? 0;
}

function soloDeltaForSuccess(ok: boolean): number {
  return ok ? PORTAL_SOLO_POINTS.success : PORTAL_SOLO_POINTS.fail;
}

/** 当日意向场次：persona + 段位 playIntentMul，且不超过日限 */
export function portalWeeklyLeagueBotDailyIntentPlays(
  cohortKey: string,
  slot: number,
  dayIndex: number,
  mode: PortalWeeklyLeagueBotMatchMode,
  limit: number
): number {
  if (limit <= 0) return 0;
  const baseKey = portalWeeklyLeagueBotBaseKey(cohortKey);
  const persona = portalWeeklyLeagueBotPersonaFactor(cohortKey, slot);
  const { playIntentMul } = tierScalingForCohortKey(cohortKey);
  const dayVar = hash01(`${baseKey}:dp:${mode}:${slot}:${dayIndex}`);
  const minIntent = mode === "solo" ? 1 : 2;
  const span = Math.max(0, limit - minIntent);
  const scaled =
    minIntent + Math.round(span * (0.35 + persona * 0.65) * (0.85 + dayVar * 0.3) * playIntentMul);
  return Math.max(0, Math.min(limit, scaled));
}

function sessionWindow(
  cohortKey: string,
  slot: number,
  mode: PortalWeeklyLeagueBotMatchMode,
  simDayStartMs: number,
  minStartMs?: number
): { startMs: number; endMs: number } {
  const baseKey = portalWeeklyLeagueBotBaseKey(cohortKey);
  const u = hash01(`${baseKey}:sw:${mode}:${slot}:${simDayStartMs}`);
  const maxOffset = Math.max(0, PORTAL_WEEKLY_LEAGUE_BOT_PLAY_DAY_MS - PORTAL_WEEKLY_LEAGUE_BOT_SESSION_MS);
  let startMs = simDayStartMs + Math.floor(u * maxOffset);
  if (minStartMs != null) startMs = Math.max(startMs, minStartMs);
  const dayEnd = simDayStartMs + PORTAL_WEEKLY_LEAGUE_BOT_PLAY_DAY_MS;
  if (startMs + PORTAL_WEEKLY_LEAGUE_BOT_SESSION_MS > dayEnd) {
    startMs = Math.max(simDayStartMs, dayEnd - PORTAL_WEEKLY_LEAGUE_BOT_SESSION_MS);
    if (minStartMs != null) startMs = Math.max(startMs, minStartMs);
  }
  return { startMs, endMs: startMs + PORTAL_WEEKLY_LEAGUE_BOT_SESSION_MS };
}

function matchAtMs(
  cohortKey: string,
  slot: number,
  mode: PortalWeeklyLeagueBotMatchMode,
  simDayStartMs: number,
  matchInDay: number,
  dailyPlays: number,
  minStartMs?: number
): number {
  const baseKey = portalWeeklyLeagueBotBaseKey(cohortKey);
  const { startMs, endMs } = sessionWindow(cohortKey, slot, mode, simDayStartMs, minStartMs);
  const span = Math.max(1, endMs - startMs);
  const slotWidth = span / Math.max(1, dailyPlays);
  const u = hash01(`${baseKey}:mt:${mode}:${slot}:${simDayStartMs}:${matchInDay}`);
  const slotStart = startMs + matchInDay * slotWidth;
  return Math.floor(Math.min(endMs - 1, slotStart + u * slotWidth * 0.92));
}

/**
 * 预生成确定性虚拟对局轨迹（按日分别排 solo/multi，受日限约束）。
 */
export function planPortalWeeklyLeagueBotMatchRollout(args: {
  cohortKey: string;
  slot: number;
  revealAt: number;
  endsAt: number;
  limits?: PortalDailyPlayLimits;
}): PortalWeeklyLeagueBotMatchStep[] {
  const limits = args.limits ?? getPortalDailyPlayLimits();
  const { cohortKey, slot, revealAt, endsAt } = args;
  if (endsAt <= revealAt) return [];

  const steps: PortalWeeklyLeagueBotMatchStep[] = [];
  let matchIndex = 0;
  const lastDay = Math.floor((endsAt - 1 - revealAt) / PORTAL_WEEKLY_LEAGUE_BOT_PLAY_DAY_MS);

  for (let dayIndex = 0; dayIndex <= lastDay; dayIndex++) {
    const simDayStart = revealAt + dayIndex * PORTAL_WEEKLY_LEAGUE_BOT_PLAY_DAY_MS;
    const dayMinStart = dayIndex === 0 ? revealAt : undefined;

    for (const mode of ["solo", "multi"] as const) {
      const limit = mode === "solo" ? limits.solo : limits.multi;
      const plays = portalWeeklyLeagueBotDailyIntentPlays(
        cohortKey,
        slot,
        dayIndex,
        mode,
        limit
      );
      for (let m = 0; m < plays; m++) {
        const atMs = matchAtMs(
          cohortKey,
          slot,
          mode,
          simDayStart,
          m,
          plays,
          dayMinStart
        );
        if (atMs < revealAt || atMs > endsAt) continue;

        let delta: number;
        if (mode === "multi") {
          const rank = pickPortalWeeklyLeagueBotMatchRank(cohortKey, slot, matchIndex);
          delta = multiDeltaForRank(rank);
        } else {
          const ok = pickPortalWeeklyLeagueBotSoloSuccess(cohortKey, slot, matchIndex);
          delta = soloDeltaForSuccess(ok);
        }
        steps.push({ atMs, mode, delta });
        matchIndex += 1;
      }
    }
  }

  steps.sort((a, b) => a.atMs - b.atMs || a.mode.localeCompare(b.mode));
  return steps;
}

/** 周尾目标分 = 起始分 + 完整轨迹 delta 之和（下限 0） */
export function computePortalWeeklyLeagueBotWeekEndPoints(args: {
  cohortKey: string;
  slot: number;
  revealAt: number;
  endsAt: number;
  startPoints?: number;
  limits?: PortalDailyPlayLimits;
}): number {
  const start =
    args.startPoints ??
    computePortalWeeklyLeagueBotStartPoints({
      cohortKey: args.cohortKey,
      slot: args.slot,
    });
  const steps = planPortalWeeklyLeagueBotMatchRollout({
    cohortKey: args.cohortKey,
    slot: args.slot,
    revealAt: args.revealAt,
    endsAt: args.endsAt,
    limits: args.limits,
  });
  const sum = steps.reduce((s, st) => s + st.delta, 0);
  return Math.max(0, start + sum);
}

type CohortRow = {
  _id?: string;
  weekKey?: string;
  gameType?: string;
  leagueTierId?: string;
  startsAt: number;
  endsAt: number;
  status: "open" | "closed";
};

type BotMemberRow = {
  uid?: string;
  revealAt?: number;
  botStartPoints?: number;
  botWeekEndPoints?: number;
  weeklyPoints: number;
  slot?: number;
};

function resolveCohortKeyAndSlot(
  member: BotMemberRow,
  cohort: CohortRow,
  overrides?: { cohortKey?: string; slot?: number }
): { cohortKey: string; slot: number } | null {
  if (overrides?.cohortKey != null && overrides.slot != null) {
    return { cohortKey: overrides.cohortKey, slot: overrides.slot };
  }
  const slot =
    overrides?.slot ??
    member.slot ??
    (member.uid != null ? parseLeagueBotSlot(member.uid) : null);
  if (slot == null) return null;

  if (overrides?.cohortKey) return { cohortKey: overrides.cohortKey, slot };

  if (
    cohort.weekKey != null &&
    cohort.gameType != null &&
    cohort.leagueTierId != null &&
    cohort._id != null
  ) {
    return {
      cohortKey: portalWeeklyLeagueCohortKey({
        weekKey: cohort.weekKey,
        gameType: cohort.gameType,
        leagueTierId: cohort.leagueTierId,
        cohortId: String(cohort._id),
      }),
      slot,
    };
  }
  return null;
}

/**
 * Bot 可见后按虚拟赛程阶梯累计；未可见 0；周关闭返回已冻结 weeklyPoints。
 */
export function resolvePortalWeeklyLeagueBotPoints(
  member: BotMemberRow,
  cohort: CohortRow,
  now: number = Date.now(),
  opts?: {
    cohortKey?: string;
    slot?: number;
    limits?: PortalDailyPlayLimits;
  }
): number {
  if (cohort.status === "closed") {
    const target = member.botWeekEndPoints ?? member.weeklyPoints;
    return member.weeklyPoints > 0 ? member.weeklyPoints : target;
  }
  if (!isPortalWeeklyLeagueBotRevealed(member.revealAt, now)) {
    return 0;
  }

  const identity = resolveCohortKeyAndSlot(member, cohort, opts);
  const tierId =
    (identity ? parseLeagueTierIdFromCohortKey(identity.cohortKey) : cohort.leagueTierId) ??
    DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER;
  const scaling = resolvePortalWeeklyLeagueBotTierScaling(tierId as PortalWeeklyLeagueTierId);

  const start =
    member.botStartPoints ??
    Math.min(
      scaling.startPointsMax,
      Math.max(scaling.startPointsMin, member.weeklyPoints || scaling.startPointsMin)
    );
  const revealAt = member.revealAt ?? cohort.startsAt;

  // 缺 seed 身份时退回起始分（不应在生产路径发生）
  if (!identity) return start;

  const steps = planPortalWeeklyLeagueBotMatchRollout({
    cohortKey: identity.cohortKey,
    slot: identity.slot,
    revealAt,
    endsAt: cohort.endsAt,
    limits: opts?.limits ?? getPortalDailyPlayLimits(),
  });

  let points = start;
  for (const step of steps) {
    if (step.atMs > now) break;
    points += step.delta;
  }
  return Math.max(0, points);
}
