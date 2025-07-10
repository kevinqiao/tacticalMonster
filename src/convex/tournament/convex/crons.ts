// import { cronJobs } from "convex/server";
// import { internal } from "./_generated/api";

// const crons = cronJobs();

// // ===== 锦标赛预创建调度 =====

// // 每日凌晨 00:00 预创建每日锦标赛
// crons.daily(
//     "pre-create daily tournaments",
//     { hourUTC: 0, minuteUTC: 0 },
//     internal.service.tournament.tournamentScheduler.createDailyTournaments
// );

// // 每周一凌晨 00:00 预创建每周锦标赛
// crons.weekly(
//     "pre-create weekly tournaments",
//     { dayOfWeek: "monday", hourUTC: 0, minuteUTC: 0 },
//     internal.service.tournament.tournamentScheduler.createWeeklyTournaments
// );

// // 每月第一天凌晨 00:00 预创建赛季锦标赛
// crons.monthly(
//     "pre-create seasonal tournaments",
//     { day: 1, hourUTC: 0, minuteUTC: 0 },
//     internal.service.tournament.tournamentScheduler.createSeasonalTournaments
// );

// // ===== 限制重置调度 =====

// // 每日凌晨 00:01 重置每日限制
// crons.daily(
//     "reset daily limits",
//     { hourUTC: 0, minuteUTC: 1 },
//     internal.service.tournament.tournamentScheduler.resetDailyLimits
// );

// // 每周一凌晨 00:01 重置每周限制
// crons.weekly(
//     "reset weekly limits",
//     { dayOfWeek: "monday", hourUTC: 0, minuteUTC: 1 },
//     internal.service.tournament.tournamentScheduler.resetWeeklyLimits
// );

// // 每月第一天凌晨 00:01 重置赛季限制
// crons.monthly(
//     "reset seasonal limits",
//     { day: 1, hourUTC: 0, minuteUTC: 1 },
//     internal.service.tournament.tournamentScheduler.resetSeasonalLimits
// );

// // ===== 锦标赛清理调度 =====

// // 每日凌晨 02:00 清理过期锦标赛
// crons.daily(
//     "cleanup expired tournaments",
//     { hourUTC: 2, minuteUTC: 0 },
//     internal.service.tournament.tournamentScheduler.cleanupAllExpiredTournaments
// );

// // 每小时检查并结算完成的锦标赛
// crons.hourly(
//     "settle completed tournaments",
//     { minuteUTC: 0 },
//     internal.service.tournament.tournamentService.settleCompletedTournaments
// );

// // ===== 任务系统调度 =====

// // 每日任务重置 - 每天 UTC 00:00 执行
// crons.daily(
//     "reset daily tasks",
//     {
//         hourUTC: 0, // 00:00 UTC
//         minuteUTC: 0,
//     },
//     internal.service.task.resetTasks.resetTasks
// );

// // ===== 高级调度选项 =====

// // 每30分钟检查锦标赛状态
// crons.cron(
//     "check tournament status",
//     "*/30 * * * *", // 每30分钟
//     internal.service.tournament.tournamentScheduler.cleanupAllExpiredTournaments
// );

// // 每周日凌晨 03:00 进行深度清理
// crons.weekly(
//     "deep cleanup tournaments",
//     { dayOfWeek: "sunday", hourUTC: 3, minuteUTC: 0 },
//     internal.service.tournament.tournamentScheduler.cleanupAllExpiredTournaments
// );

// // 每月第一天凌晨 04:00 进行月度维护
// crons.monthly(
//     "monthly tournament maintenance",
//     { day: 1, hourUTC: 4, minuteUTC: 0 },
//     internal.service.tournament.tournamentScheduler.cleanupAllExpiredTournaments
// );

// export default crons;