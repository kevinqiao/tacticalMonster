/**
 * Tournament 模块通信配置
 */

export const TOURNAMENT_CONFIG = {
    BASE_URL: process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site",
    ENDPOINTS: {
        PROCESS_GAME_REWARDS: "/processGameRewards",
        NOTIFY_GAME_END: "/notifyGameEnd", // 通知游戏结束（新接口）
        CLAIM_TOURNAMENT_REWARDS: "/claimTournamentRewards", // 领取锦标赛奖励（新接口）
        ADD_RESOURCES: "/addResources",
        DEDUCT_RESOURCES: "/deductResources",
        JOIN_MATCHING_QUEUE: "/joinMatchingQueue",
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
 * 获取 Tournament 端点 URL
 */
export function getTournamentUrl(endpoint: string): string {
    return `${TOURNAMENT_CONFIG.BASE_URL}${endpoint}`;
}

