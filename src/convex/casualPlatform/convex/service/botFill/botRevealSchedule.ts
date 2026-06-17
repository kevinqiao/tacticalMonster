import { pseudoUnit } from "../../shared/pseudoUnit";

export function buildBotRevealPlanSeedKey(args: {
  templateId: string;
  sessionExternalId: string;
  replayEpoch?: number;
  anchorAt: number;
}): string {
  const re = args.replayEpoch ?? 0;
  return `${args.templateId}|${args.sessionExternalId}|re${re}|t${args.anchorAt}`;
}

export function planBotRevealSchedule(args: {
  slotKeys: string[];
  sessionSeed: number;
  matchStartedAt: number;
  humanFinishedAt: number;
}): Array<{ slotKey: string; revealAt: number }> {
  const { slotKeys, sessionSeed, matchStartedAt, humanFinishedAt } = args;
  if (slotKeys.length === 0) return [];

  const start = Math.min(matchStartedAt, humanFinishedAt);
  const end = Math.max(matchStartedAt, humanFinishedAt);
  const span = end - start;

  return slotKeys.map((slotKey, i) => {
    const u = pseudoUnit(sessionSeed, i + 83);
    const revealAt = span <= 0 ? end : Math.floor(start + u * span);
    return { slotKey, revealAt };
  });
}

export type BotFillWithReveal = {
  rank: number;
  revealAt?: number;
};

export type BotRevealWindow = {
  sessionSeed: number;
  matchStartedAt: number;
  humanFinishedAt: number;
};

export function attachRevealAtToBotFills<T extends BotFillWithReveal>(
  botFills: T[],
  window: BotRevealWindow
): T[] {
  if (botFills.length === 0) return botFills;
  const sorted = [...botFills].sort((a, b) => a.rank - b.rank);
  const slotKeys = sorted.map((f) => `r${f.rank}`);
  const schedule = planBotRevealSchedule({
    slotKeys,
    sessionSeed: window.sessionSeed,
    matchStartedAt: window.matchStartedAt,
    humanFinishedAt: window.humanFinishedAt,
  });
  const byKey = new Map(schedule.map((e) => [e.slotKey, e.revealAt]));
  return botFills.map((f) => ({
    ...f,
    revealAt: byKey.get(`r${f.rank}`) ?? window.humanFinishedAt,
  }));
}
