import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 定时处理未完成的任务事件 - 每分钟运行一次
crons.cron(
    "process pending task events",
    "*/1 * * * *",
    internal.service.task.scheduledTaskProcessor.processPendingTaskEvents
);

// crons.interval(
//     "clearmatch queue table",
//     { seconds: 15 }, // every 5 seconds
//     internal.service.match.match,
// );


// crons.monthly(
//     "season start",
//     {
//         day: 16, // First day of each month
//         hourUTC: 2, // 9:30am Pacific (UTC-7 during DST, UTC-8 during standard time)
//         minuteUTC: 56,
//     },
//     internal.service.season.createNextSeason
// );



// crons.daily(
//     "create tournament daily",
//     {
//         hourUTC: 2, // 22:00 Toronto (UTC-4 during DST, UTC-5 during standard time)
//         minuteUTC: 48,
//     },
//     internal.service.tournament.createDailyTournaments
// )

export default crons;