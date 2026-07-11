import {
  PORTAL_WEEKLY_LEAGUE_BOT_POOL_SIZE,
  PORTAL_WEEKLY_LEAGUE_COHORT_SIZE,
  PORTAL_WEEKLY_LEAGUE_MATCHING_DURATION_MS,
} from "../../data/portalWeeklyLeagueConfig";
import { pseudoUnit } from "../../shared/pseudoUnit";

/** 创建时立即可见 Bot 数下限（含） */
export const PORTAL_WEEKLY_LEAGUE_BOT_REVEALED_NOW_MIN = 3;

/** 创建时立即可见 Bot 数上限（含） */
export const PORTAL_WEEKLY_LEAGUE_BOT_REVEALED_NOW_MAX = 10;

export type PortalWeeklyLeagueBotRevealPlan = {
  slot: number;
  revealAt: number;
};

function cohortSeed(cohortKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < cohortKey.length; i++) {
    h ^= cohortKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 按 cohort 确定性抽取立即可见数量 ∈ [min, max] */
export function pickPortalWeeklyLeagueImmediateBotCount(
  cohortKey: string,
  botCount: number = PORTAL_WEEKLY_LEAGUE_BOT_POOL_SIZE
): number {
  const seed = cohortSeed(cohortKey);
  const min = PORTAL_WEEKLY_LEAGUE_BOT_REVEALED_NOW_MIN;
  const max = Math.min(PORTAL_WEEKLY_LEAGUE_BOT_REVEALED_NOW_MAX, botCount);
  if (max <= min) return Math.max(0, Math.min(botCount, min));
  return min + Math.floor(pseudoUnit(seed, 11) * (max - min + 1));
}

/**
 * 创建分组时的 15 Bot 可见计划：
 * - 立即可见数在 3–10 间伪随机
 * - 其余在随后 5 小时内伪随机分布
 */
export function planPortalWeeklyLeagueInitialBotRevealSchedule(args: {
  cohortKey: string;
  createdAt: number;
  botCount?: number;
}): PortalWeeklyLeagueBotRevealPlan[] {
  const {
    cohortKey,
    createdAt,
    botCount = PORTAL_WEEKLY_LEAGUE_BOT_POOL_SIZE,
  } = args;
  const n = Math.max(0, Math.min(PORTAL_WEEKLY_LEAGUE_BOT_POOL_SIZE, Math.floor(botCount)));
  const seed = cohortSeed(cohortKey);
  const span = PORTAL_WEEKLY_LEAGUE_MATCHING_DURATION_MS;
  const immediate = Math.min(n, pickPortalWeeklyLeagueImmediateBotCount(cohortKey, n));

  const plans: PortalWeeklyLeagueBotRevealPlan[] = [];
  for (let slot = 0; slot < n; slot++) {
    if (slot < immediate) {
      plans.push({ slot, revealAt: createdAt });
      continue;
    }
    // (createdAt, createdAt + 5h] 内均匀伪随机
    const u = pseudoUnit(seed, slot + 17);
    const revealAt =
      span <= 0
        ? createdAt
        : Math.max(createdAt + 1, Math.floor(createdAt + u * span));
    plans.push({ slot, revealAt: Math.min(revealAt, createdAt + span) });
  }
  return plans;
}

/**
 * 匹配结束后补位 Bot：全部立刻可见。
 */
export function planPortalWeeklyLeagueFillBotRevealSchedule(args: {
  matchingClosedAt: number;
  botCount: number;
  slotOffset?: number;
}): PortalWeeklyLeagueBotRevealPlan[] {
  const { matchingClosedAt, botCount, slotOffset = PORTAL_WEEKLY_LEAGUE_BOT_POOL_SIZE } = args;
  const n = Math.max(0, Math.min(PORTAL_WEEKLY_LEAGUE_COHORT_SIZE, Math.floor(botCount)));
  const plans: PortalWeeklyLeagueBotRevealPlan[] = [];
  for (let i = 0; i < n; i++) {
    plans.push({ slot: slotOffset + i, revealAt: matchingClosedAt });
  }
  return plans;
}

/** @deprecated 使用 planPortalWeeklyLeagueInitialBotRevealSchedule */
export function planPortalWeeklyLeagueBotRevealSchedule(args: {
  cohortKey: string;
  matchingClosedAt: number;
  botCount: number;
}): PortalWeeklyLeagueBotRevealPlan[] {
  return planPortalWeeklyLeagueFillBotRevealSchedule({
    matchingClosedAt: args.matchingClosedAt,
    botCount: args.botCount,
  });
}

export function isPortalWeeklyLeagueBotRevealed(
  revealAt: number | undefined,
  now: number
): boolean {
  if (revealAt == null) return true;
  return Number.isFinite(revealAt) && now >= revealAt;
}

export function portalWeeklyLeagueBotUnit(cohortKey: string, salt: number): number {
  let h = 2166136261;
  for (let i = 0; i < cohortKey.length; i++) {
    h ^= cohortKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return pseudoUnit(h >>> 0, salt);
}
