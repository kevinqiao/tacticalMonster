import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 每日凌晨 00:00 创建每日锦标赛
crons.daily(
    "create daily tournaments",
    { hourUTC: 0, minuteUTC: 0 },
    internal.service.tournament.tournamentScheduler.createDailyTournaments
);

// 每日凌晨 00:01 重置每日限制
crons.daily(
    "reset daily limits",
    { hourUTC: 0, minuteUTC: 1 },
    internal.service.tournament.tournamentScheduler.resetDailyLimits
);

// 每周一凌晨 00:00 创建每周锦标赛
crons.weekly(
    "create weekly tournaments",
    { dayOfWeek: "monday", hourUTC: 0, minuteUTC: 0 },
    internal.service.tournament.tournamentScheduler.createWeeklyTournaments
);

// 每周一凌晨 00:01 重置每周限制
crons.weekly(
    "reset weekly limits",
    { dayOfWeek: "monday", hourUTC: 0, minuteUTC: 1 },
    internal.service.tournament.tournamentScheduler.resetWeeklyLimits
);

// 每月第一天凌晨 00:00 创建赛季锦标赛
crons.monthly(
    "create seasonal tournaments",
    { day: 1, hourUTC: 0, minuteUTC: 0 },
    internal.service.tournament.tournamentScheduler.createSeasonalTournaments
);

// 每月第一天凌晨 00:01 重置赛季限制
crons.monthly(
    "reset seasonal limits",
    { day: 1, hourUTC: 0, minuteUTC: 1 },
    internal.service.tournament.tournamentScheduler.resetSeasonalLimits
);

// 每日凌晨 02:00 清理过期锦标赛
// crons.daily(
//     "cleanup expired tournaments",
//     { hourUTC: 2, minuteUTC: 0 },
//     internal.service.tournament.cleanupExpiredTournaments
// );

// // 每小时检查并结算完成的锦标赛
// crons.hourly(
//     "settle completed tournaments",
//     { minuteUTC: 0 },
//     internal.service.tournament.settleCompletedTournaments
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