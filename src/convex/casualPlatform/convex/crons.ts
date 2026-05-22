import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "finalize expired casual async runs",
  { minutes: 1 },
  internal.service.tournament.casualRunExpireCron.finalizeExpiredCasualAsyncRuns,
  {}
);

crons.hourly(
  "close expired casual tournament instances",
  { minuteUTC: 12 },
  internal.service.tournament.casualInstanceService.finalizeExpiredCasualTournamentInstances,
  {}
);
// 每小时对齐一次 active 赛季；到新赛季开始窗口时自动切换并做基础数据兜底。
crons.hourly(
  "auto initialize current casual season",
  { minuteUTC: 2 },
  internal.service.season.casualSeasonService.autoInitializeCurrentSeason,
  {}
);
export default crons;
