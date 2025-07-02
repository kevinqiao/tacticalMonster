import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 定时处理未完成的任务事件 - 每分钟运行一次
// crons.cron(
//     "process pending task events",
//     "*/1 * * * *",
//     internal.service.task.scheduledTaskProcessor.processPendingTaskEvents
// );

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

// 每日任务重置 - 每天 UTC 00:00 执行
crons.daily(
    "reset daily tasks",
    {
        hourUTC: 0, // 00:00 UTC
        minuteUTC: 0,
    },
    internal.service.task.resetTasks.resetTasks
);

// 锦标赛结算 - 每5分钟运行一次
// crons.cron(
//     "settle tournaments",
//     "*/5 * * * *", // 每5分钟
//     internal.service.tournament.tournaments.settleTournaments
// );

// 每日锦标赛结算 - 每天 UTC 02:00 执行（确保所有锦标赛都被结算）
// crons.daily(
//     "settle all tournaments",
//     {
//         hourUTC: 2, // 02:00 UTC
//         minuteUTC: 0,
//     },
//     internal.service.tournament.tournaments.settleTournaments
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