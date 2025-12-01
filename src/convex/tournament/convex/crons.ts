import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

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

// ===== Battle Pass 自动重置 =====

// 每月第一天凌晨 00:05 自动重置所有玩家的Battle Pass为新赛季
crons.monthly(
    "reset battle pass for new season",
    { day: 1, hourUTC: 0, minuteUTC: 5 },
    internal.service.battlePass.battlePass.resetAllPlayersBattlePassForNewSeason
);

// ===== 排行榜自动重置 =====

// 每日凌晨 00:10 自动重置每日排行榜（结算昨日并清除数据）
crons.daily(
    "reset daily leaderboard",
    { hourUTC: 0, minuteUTC: 10 },
    internal.service.leaderboard.leaderboards.resetDailyLeaderboard
);

// 每周一凌晨 00:10 自动重置每周排行榜（结算上周并清除数据）
crons.weekly(
    "reset weekly leaderboard",
    { dayOfWeek: "monday", hourUTC: 0, minuteUTC: 10 },
    internal.service.leaderboard.leaderboards.resetWeeklyLeaderboard
);

// 每月第一天凌晨 00:10 自动重置赛季排行榜（结算上赛季并清除数据）
crons.monthly(
    "reset seasonal leaderboard",
    { day: 1, hourUTC: 0, minuteUTC: 10 },
    internal.service.leaderboard.leaderboards.resetSeasonalLeaderboard
);

// ===== 商店自动刷新 =====

// 每日凌晨 00:00 自动刷新每日商店
crons.daily(
    "refresh daily shops",
    { hourUTC: 0, minuteUTC: 0 },
    internal.shops.refreshDailyShops
);

// 每周一凌晨 00:00 自动刷新每周商店
crons.weekly(
    "refresh weekly shops",
    { dayOfWeek: "monday", hourUTC: 0, minuteUTC: 0 },
    internal.shops.refreshWeeklyShops
);

// 每月第一天凌晨 00:00 自动刷新赛季商店
crons.monthly(
    "refresh seasonal shops",
    { day: 1, hourUTC: 0, minuteUTC: 0 },
    internal.shops.refreshSeasonalShops
);

export default crons;