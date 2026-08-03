/** bot reveal 时间规划（由游戏服计算，平台只执行 scheduler）。 */

import { pseudoUnit } from "../../shared/pseudoUnit";



/** 真人首次交分后 bot 仍可出现的额外窗口（ms） */

export const BOT_REVEAL_POST_SUBMIT_WINDOW_MS = 3 * 60 * 1000;



export function buildBotRevealPlanSeedKey(args: {

  templateId: string;

  sessionExternalId: string;

  replayEpoch?: number;

  anchorAt: number;

}): string {

  const re = args.replayEpoch ?? 0;

  return `${args.templateId}|${args.sessionExternalId}|re${re}|t${args.anchorAt}`;

}



/**

 * 每个 bot 的 revealAt：在 [matchStartedAt, humanFinishedAt + 3min] 内确定性随机；

 * 且至少一名 bot 的 revealAt 严格早于 humanFinishedAt。

 */

export function planBotRevealSchedule(args: {

  slotKeys: string[];

  sessionSeed: number;

  matchStartedAt: number;

  humanFinishedAt: number;

}): Array<{ slotKey: string; revealAt: number }> {

  const { slotKeys, sessionSeed, matchStartedAt, humanFinishedAt } = args;

  if (slotKeys.length === 0) return [];



  const start = matchStartedAt;

  const end = humanFinishedAt + BOT_REVEAL_POST_SUBMIT_WINDOW_MS;

  const span = Math.max(0, end - start);



  const schedule = slotKeys.map((slotKey, i) => {

    const u = pseudoUnit(sessionSeed, i + 83);

    const revealAt = span <= 0 ? end : Math.floor(start + u * span);

    return { slotKey, revealAt: Math.min(end, Math.max(start, revealAt)) };

  });



  return ensureAtLeastOnePreSubmitBot(schedule, {

    sessionSeed,

    matchStartedAt: start,

    humanFinishedAt,

  });

}



function ensureAtLeastOnePreSubmitBot(

  schedule: Array<{ slotKey: string; revealAt: number }>,

  args: { sessionSeed: number; matchStartedAt: number; humanFinishedAt: number }

): Array<{ slotKey: string; revealAt: number }> {

  if (schedule.length === 0) return schedule;

  if (schedule.some((e) => e.revealAt < args.humanFinishedAt)) return schedule;



  const start = args.matchStartedAt;

  const preEnd = args.humanFinishedAt;

  const preSpan = preEnd - start;

  const u = pseudoUnit(args.sessionSeed, 991);

  let forcedRevealAt: number;

  if (preSpan > 0) {

    forcedRevealAt = Math.min(Math.floor(start + u * preSpan), preEnd - 1);

  } else {

    forcedRevealAt = start;

  }



  const copy = [...schedule];

  copy[0] = { ...copy[0]!, revealAt: forcedRevealAt };

  return copy;

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



/** 为 ingest botFills 附加 revealAt（按 rank 槽位稳定排序） */

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

  const fallbackRevealAt =

    window.humanFinishedAt + BOT_REVEAL_POST_SUBMIT_WINDOW_MS;

  return botFills.map((f) => ({

    ...f,

    revealAt: byKey.get(`r${f.rank}`) ?? fallbackRevealAt,

  }));

}


