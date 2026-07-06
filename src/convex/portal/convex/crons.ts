import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.hourly(
  "close expired portal weekly league weeks",
  { minuteUTC: 5 },
  internal.service.weeklyLeague.portalWeeklyLeagueClose.closeExpiredPortalWeeklyLeagueWeeks,
  {}
);

export default crons;
