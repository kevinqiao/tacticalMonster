import type { PortalWeeklyBoardMode } from "../../data/portalWeeklyBoardBotConfig";
import {
  PORTAL_WEEKLY_BOARD_BOT_AVG_POINTS_PER_MATCH,
  PORTAL_WEEKLY_BOARD_BOT_POINTS_BAND,
} from "../../data/portalWeeklyBoardBotConfig";
import { isPortalWeeklyBoardBotRevealed } from "./portalWeeklyBoardBotReveal";

function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** 0.25–1.0：同 cohort 内 bot 活跃度分化 */
export function portalWeeklyBoardBotPersonaFactor(cohortKey: string, slot: number): number {
  return 0.25 + 0.75 * hash01(`${cohortKey}:${slot}`);
}

export function portalWeeklyBoardWeekProgress(
  now: number,
  startsAt: number,
  endsAt: number
): number {
  if (endsAt <= startsAt) return 0;
  return Math.max(0, Math.min(1, (now - startsAt) / (endsAt - startsAt)));
}

export function computePortalWeeklyBoardBotWeekEndPoints(args: {
  mode: PortalWeeklyBoardMode;
  cohortKey: string;
  slot: number;
}): number {
  const band = PORTAL_WEEKLY_BOARD_BOT_POINTS_BAND[args.mode];
  const persona = portalWeeklyBoardBotPersonaFactor(args.cohortKey, args.slot);
  return Math.floor(band.min + persona * (band.max - band.min));
}

type CohortRow = {
  _id: string;
  mode: PortalWeeklyBoardMode;
  startsAt: number;
  endsAt: number;
  status: "open" | "closed";
};

type BotMemberRow = {
  slot: number;
  revealAt: number;
  weekEndPoints: number;
};

/**
 * 周榜 bot 当前 points；reveal 前返回 null（不上榜）。
 */
export function resolvePortalWeeklyBoardBotPoints(
  member: BotMemberRow,
  cohort: CohortRow,
  now: number = Date.now()
): number | null {
  if (cohort.status === "closed") {
    return member.weekEndPoints;
  }
  if (!isPortalWeeklyBoardBotRevealed(member.revealAt, now)) {
    return null;
  }

  const revealAt = member.revealAt ?? cohort.startsAt;
  const progress = portalWeeklyBoardWeekProgress(now, revealAt, cohort.endsAt);
  const eased = Math.sqrt(Math.max(0, Math.min(1, progress)));
  return Math.floor(member.weekEndPoints * eased);
}

export function estimatePortalWeeklyBoardBotMatchCount(args: {
  mode: PortalWeeklyBoardMode;
  points: number;
}): number {
  const avg = PORTAL_WEEKLY_BOARD_BOT_AVG_POINTS_PER_MATCH[args.mode];
  if (args.points <= 0) return 0;
  return Math.max(1, Math.round(args.points / avg));
}
