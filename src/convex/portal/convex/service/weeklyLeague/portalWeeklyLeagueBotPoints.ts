import { PORTAL_WEEKLY_LEAGUE_BOT_POINTS_BAND } from "./portalWeeklyLeagueBotReveal";
import { isPortalWeeklyLeagueBotRevealed } from "./portalWeeklyLeagueBotReveal";

function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function portalWeeklyLeagueBotPersonaFactor(cohortKey: string, slot: number): number {
  return 0.25 + 0.75 * hash01(`${cohortKey}:${slot}`);
}

export function portalWeeklyLeagueWeekProgress(
  now: number,
  startsAt: number,
  endsAt: number
): number {
  if (endsAt <= startsAt) return 0;
  return Math.max(0, Math.min(1, (now - startsAt) / (endsAt - startsAt)));
}

export function computePortalWeeklyLeagueBotWeekEndPoints(args: {
  cohortKey: string;
  slot: number;
}): number {
  const persona = portalWeeklyLeagueBotPersonaFactor(args.cohortKey, args.slot);
  const band = PORTAL_WEEKLY_LEAGUE_BOT_POINTS_BAND;
  return Math.floor(band.min + persona * (band.max - band.min));
}

type CohortRow = {
  startsAt: number;
  endsAt: number;
  status: "open" | "closed";
};

type BotMemberRow = {
  revealAt?: number;
  botWeekEndPoints?: number;
  weeklyPoints: number;
};

export function resolvePortalWeeklyLeagueBotPoints(
  member: BotMemberRow,
  cohort: CohortRow,
  now: number = Date.now()
): number {
  const target = member.botWeekEndPoints ?? member.weeklyPoints;
  if (cohort.status === "closed") {
    return target;
  }
  if (!isPortalWeeklyLeagueBotRevealed(member.revealAt, now)) {
    return 0;
  }
  const revealAt = member.revealAt ?? cohort.startsAt;
  const progress = portalWeeklyLeagueWeekProgress(now, revealAt, cohort.endsAt);
  const eased = Math.sqrt(Math.max(0, Math.min(1, progress)));
  return Math.floor(target * eased);
}

export function leagueBotUidForSlot(cohortId: string, slot: number): string {
  return `pwl_bot_${cohortId}_${slot}`;
}
