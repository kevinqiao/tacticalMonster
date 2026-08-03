/**
 * 周联赛 cohort bot 的 League XP 时间曲线 + reveal 解析。
 */
import type { WeeklyLeagueTierId } from "../../data/casualWeeklyLeagueConfig";
import { botSlotFromUid } from "./casualWeeklyLeagueBotFill";
import { isWeeklyLeagueBotRevealed } from "./casualWeeklyLeagueBotReveal";

/** 周尾目标 XP 区间（中位休闲玩家量级，按 tier 略升） */
export const WEEKLY_LEAGUE_BOT_XP_BAND: Record<
  WeeklyLeagueTierId,
  { min: number; max: number }
> = {
  bronze: { min: 40, max: 180 },
  silver: { min: 55, max: 220 },
  gold: { min: 70, max: 280 },
  platinum: { min: 90, max: 340 },
  diamond: { min: 110, max: 400 },
};

function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** 0.25–1.0：同 cohort 内 bot 活跃度分化，避免齐步走 */
export function weeklyLeagueBotPersonaFactor(cohortId: string, slot: number): number {
  return 0.25 + 0.75 * hash01(`${cohortId}:${slot}`);
}

export function weeklyLeagueWeekProgress(
  now: number,
  startsAt: number,
  endsAt: number
): number {
  if (endsAt <= startsAt) return 0;
  return Math.max(0, Math.min(1, (now - startsAt) / (endsAt - startsAt)));
}

/**
 * Bot 当周 League XP 目标（sqrt 缓升；从 reveal 后进度起算）。
 */
export function weeklyLeagueBotXpTarget(args: {
  tierId: WeeklyLeagueTierId;
  cohortId: string;
  slot: number;
  weekProgress: number;
}): number {
  const band = WEEKLY_LEAGUE_BOT_XP_BAND[args.tierId] ?? WEEKLY_LEAGUE_BOT_XP_BAND.bronze;
  const persona = weeklyLeagueBotPersonaFactor(args.cohortId, args.slot);
  const weekEndXp = band.min + persona * (band.max - band.min);
  const eased = Math.sqrt(Math.max(0, Math.min(1, args.weekProgress)));
  return Math.floor(weekEndXp * eased);
}

type CohortWindow = {
  _id: string;
  leagueTierId: string;
  startsAt: number;
  endsAt: number;
  status: "open" | "closed";
};

type MemberRow = {
  uid: string;
  weeklyLeagueXp: number;
  isBot: boolean;
  revealAt?: number;
};

/** 榜单/排名用：真人读库内 XP；open bot 按 revealAt 后现算。 */
export function resolveWeeklyLeagueXpForMember(
  member: MemberRow,
  cohort: CohortWindow,
  now: number = Date.now()
): number {
  if (!member.isBot) return member.weeklyLeagueXp;
  if (cohort.status === "closed") return member.weeklyLeagueXp;
  if (!isWeeklyLeagueBotRevealed(member.revealAt, now)) return 0;

  const slot = botSlotFromUid(member.uid);
  if (slot == null) return member.weeklyLeagueXp;

  const revealAt = member.revealAt ?? cohort.startsAt;
  const progress = weeklyLeagueWeekProgress(now, revealAt, cohort.endsAt);
  return weeklyLeagueBotXpTarget({
    tierId: cohort.leagueTierId as WeeklyLeagueTierId,
    cohortId: String(cohort._id),
    slot,
    weekProgress: progress,
  });
}

export type WeeklyLeagueCohortRowState = "active" | "matching";

export function resolveWeeklyLeagueCohortRowState(
  member: MemberRow,
  now: number = Date.now()
): WeeklyLeagueCohortRowState {
  if (!member.isBot) return "active";
  return isWeeklyLeagueBotRevealed(member.revealAt, now) ? "active" : "matching";
}
