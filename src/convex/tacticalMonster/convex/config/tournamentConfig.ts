/**
 * Tournament 模块通信配置
 */

export const TOURNAMENT_CONFIG = {
    BASE_URL: process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site",
    ENDPOINTS: {
        SURRENDER: "/surrender",
        PROCESS_GAME_REWARDS: "/processGameRewards",
        NOTIFY_GAME_END: "/notifyGameEnd", // 通知游戏结束（新接口）
        SUBMIT_MATCH_SCORE: "/submitScore", // 提交比赛分数
        FIND_MATCH_GAME: "/findMatchGame", // 查找比赛游戏
        CLAIM_TOURNAMENT_REWARDS: "/claimTournamentRewards", // 领取锦标赛奖励（新接口）
        ADD_RESOURCES: "/addResources",
        DEDUCT_RESOURCES: "/deductResources",
        JOIN_MATCHING_QUEUE: "/joinMatchingQueue",
        JOIN_TOURNAMENT: "/joinTournament",
        GET_TOURNAMENT_TYPE_CONFIG: "/getTournamentTypeConfig", // 获取锦标赛类型配置
        // Battle Pass 端点
        ADD_SEASON_POINTS: "/addSeasonPoints",
        CLAIM_BATTLE_PASS_REWARD: "/claimBattlePassReward",
        PURCHASE_PREMIUM_BATTLE_PASS: "/purchasePremiumBattlePass",
        GET_PLAYER_BATTLE_PASS: "/getPlayerBattlePass",
        GET_CURRENT_BATTLE_PASS_CONFIG: "/getCurrentBattlePassConfig",
        // Task System 端点
        PROCESS_TASK_EVENT: "/processTaskEvent",
        MANAGE_PLAYER_TASKS: "/managePlayerTasks",
        GET_PLAYER_ACTIVE_TASKS: "/getPlayerActiveTasks",
        CLAIM_TASK_REWARDS: "/claimTaskRewards",
    },
} as const;

/**
 * 规范化锦标赛 HTTP 根地址：Convex 的 HTTP 路由在 `*.convex.site`，若误配 `*.convex.cloud`（多为 WebSocket/API）会导致 submitScore 等 fetch 失败，player_matches 一直为 open。
 */
function normalizeTournamentBaseUrl(base: string): string {
    let b = base.trim().replace(/\/+$/, "");
    // 与 TournamentManager 中 .convex.cloud 区分：HTTP 走 .convex.site
    b = b.replace(/\.convex\.cloud(?=\/|$)/i, ".convex.site");
    return b;
}

/**
 * 获取 Tournament 端点 URL
 */
export function getTournamentUrl(endpoint: string): string {
    const base = normalizeTournamentBaseUrl(
        process.env.TOURNAMENT_URL || TOURNAMENT_CONFIG.BASE_URL
    );
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
}

