import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.hourly(
  "close expired portal weekly league weeks",
  { minuteUTC: 5 },
  internal.service.weeklyLeague.portalWeeklyLeagueClose.closeExpiredPortalWeeklyLeagueWeeks,
  {}
);

/** 每 5 分钟：结束超时匹配窗口并补 Bot */
crons.interval(
  "close expired portal weekly league matching",
  { minutes: 5 },
  internal.service.weeklyLeague.portalWeeklyLeagueMatching.closeExpiredPortalWeeklyLeagueMatching,
  {}
);

/** 每分钟：扫卡住的竞技场匹配队列并补开桌 */
crons.interval(
  "sweep stuck portal match queue",
  { minutes: 1 },
  internal.service.tournament.join.casualMatchQueueSweep.sweepStuckCasualMatchQueue,
  {}
);

export default crons;
