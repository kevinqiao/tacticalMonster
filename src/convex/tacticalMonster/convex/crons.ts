import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 每分钟检查一次超时游戏
crons.interval(
    "checkGameTimeout",
    { minutes: 1 },
    internal.service.game.gameTimeoutService.checkAndEndTimeoutGames
);

export default crons;

