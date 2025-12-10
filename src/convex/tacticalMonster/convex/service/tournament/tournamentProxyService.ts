import { getTournamentUrl, TOURNAMENT_CONFIG } from "../../config/tournamentConfig";

/**
 * Tournament 模块代理服务
 * 负责通过 HTTP 调用 Tournament 模块的接口
 */
export class TournamentProxyService {
    /**
     * 调用 Tournament 模块处理游戏奖励
     * 返回包含宝箱触发决策的奖励决策
     */
    static async processGameRewards(params: {
        tier: string;
        rankings: Array<{ uid: string; rank: number; score: number }>;
        gameId: string;
    }): Promise<{
        ok: boolean;
        coinRewards?: Record<string, number>;
        grantResults?: Array<{ uid: string; success: boolean; coins?: number }>;  // 金币发放结果
        chestTriggered?: Record<string, boolean>;  // 宝箱触发决策
        rewardType?: string;
        error?: string;
    }> {
        try {
            // 1. 发送 HTTP POST 请求到 Tournament 模块
            const response = await fetch(
                getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.PROCESS_GAME_REWARDS),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        tier: params.tier,
                        rankings: params.rankings,
                        gameId: params.gameId,
                    }),
                }
            );

            // 2. 解析响应
            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "处理奖励失败");
            }

            // 3. 返回奖励决策（包含发放结果和宝箱触发决策）
            return {
                ok: true,
                coinRewards: result.coinRewards,
                grantResults: result.grantResults,  // 金币发放结果
                chestTriggered: result.chestTriggered,  // 宝箱触发决策
                rewardType: result.rewardType,
            };
        } catch (error: any) {
            console.error("调用 Tournament 模块失败:", error);
            return {
                ok: false,
                error: error.message || "网络错误",
            };
        }
    }

    /**
     * 通知 Tournament 模块游戏结束
     * Tournament 模块会：
     * - 更新 player_matches 状态为 COMPLETED
     * - 检查 match 中所有游戏是否都结束
     * - 如果都结束，统一计算排名并处理奖励
     * - 返回奖励决策（如果 match 已完成）
     */
    static async notifyGameEnd(params: {
        gameId: string;
        matchId: string;
        finalScore: number;
    }): Promise<{
        ok: boolean;
        matchCompleted?: boolean;
        rewardDecision?: {
            coinRewards?: Record<string, number>;
            grantResults?: Array<{ uid: string; success: boolean; coins?: number }>;
            chestTriggered?: Record<string, boolean>;
            finalRankings?: Array<{ uid: string; rank: number; score: number }>;
            rewardType?: string;
        };
        error?: string;
    }> {
        try {
            // 发送 HTTP POST 请求到 Tournament 模块
            const response = await fetch(
                getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.NOTIFY_GAME_END),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        gameId: params.gameId,
                        matchId: params.matchId,
                        finalScore: params.finalScore,
                    }),
                }
            );

            // 解析响应
            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "通知 Tournament 模块失败");
            }

            // 返回结果
            return {
                ok: true,
                matchCompleted: result.matchCompleted || false,
                rewardDecision: result.rewardDecision || undefined,
            };
        } catch (error: any) {
            console.error("调用 Tournament 模块失败:", error);
            return {
                ok: false,
                error: error.message || "网络错误",
            };
        }
    }

    /**
     * 获取玩家锦标赛结算结果（用于前端显示）
     */
    static async getTournamentResult(params: {
        uid: string;
        tournamentId: string;
    }): Promise<{
        ok: boolean;
        tournament?: any;
        playerResult?: any;
        rewards?: any;
        canClaim?: boolean;
        error?: string;
    }> {
        try {
            const response = await fetch(
                `${getTournamentUrl("/getTournamentResult")}?uid=${params.uid}&tournamentId=${params.tournamentId}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "获取锦标赛结果失败");
            }

            return result;
        } catch (error: any) {
            console.error("获取锦标赛结果失败:", error);
            return {
                ok: false,
                error: error.message || "网络错误",
            };
        }
    }

    /**
     * 领取锦标赛奖励
     * 调用 Tournament 模块的 claim 接口，获取奖励并处理发放
     */
    static async claimTournamentRewards(params: {
        uid: string;
        tournamentId: string;
    }): Promise<{
        ok: boolean;
        rewards?: {
            coins?: number;
            gems?: number;
        };
        chestTriggered?: boolean;
        chestInfo?: {
            chestTriggered: boolean;
            tier: string;
            rank: number;
            gameId?: string;
            matchId?: string;
        };
        gameSpecificRewards?: {
            monsters?: Array<{ monsterId: string; level?: number; stars?: number }>;
            monsterShards?: Array<{ monsterId: string; quantity: number }>;
            energy?: number;
        };
        error?: string;
    }> {
        try {
            // 发送 HTTP POST 请求到 Tournament 模块
            const response = await fetch(
                getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.CLAIM_TOURNAMENT_REWARDS),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uid: params.uid,
                        tournamentId: params.tournamentId,
                    }),
                }
            );

            // 解析响应
            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "领取奖励失败");
            }

            // 返回结果
            return {
                ok: true,
                rewards: result.rewards,
                chestTriggered: result.chestTriggered,
                chestInfo: result.chestInfo,
                gameSpecificRewards: result.gameSpecificRewards,
            };
        } catch (error: any) {
            console.error("调用 Tournament 模块失败:", error);
            return {
                ok: false,
                error: error.message || "网络错误",
            };
        }
    }

    /**
     * 添加游戏赛季积分
     * 注意：推荐使用 grantRewards() 的 seasonPoints 字段，此方法保留用于向后兼容
     * @deprecated 使用 grantRewards() 替代
     */
    static async addGameSeasonPoints(params: {
        uid: string;
        amount: number;
        source: string; // "tacticalMonster:monster_rumble", "tacticalMonster:monster_upgrade", etc.
        sourceDetails?: any;
    }): Promise<{
        success: boolean;
        newLevel?: number;
        message: string;
        rewards?: any[];
    }> {
        try {
            const response = await fetch(
                getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.ADD_SEASON_POINTS),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uid: params.uid,
                        seasonPointsAmount: params.amount,
                        source: params.source,
                        sourceDetails: params.sourceDetails,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.ok && !result.success) {
                return {
                    success: false,
                    message: result.message || result.error || "添加积分失败",
                };
            }

            return {
                success: result.success || result.ok,
                newLevel: result.newLevel,
                message: result.message || "成功添加积分",
                rewards: result.rewards,
            };
        } catch (error: any) {
            console.error("添加 Battle Pass 积分失败:", error);
            return {
                success: false,
                message: error.message || "添加积分失败，请稍后重试",
            };
        }
    }

    /**
     * 购买 Premium Battle Pass
     */
    static async purchasePremiumPass(params: {
        uid: string;
    }): Promise<{
        success: boolean;
        message: string;
        battlePass?: any;
    }> {
        try {
            const response = await fetch(
                getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.PURCHASE_PREMIUM_BATTLE_PASS),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uid: params.uid,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            return {
                success: result.success || result.ok,
                message: result.message || (result.success ? "购买成功" : "购买失败"),
                battlePass: result.battlePass,
            };
        } catch (error: any) {
            console.error("购买 Premium Battle Pass 失败:", error);
            return {
                success: false,
                message: error.message || "购买失败，请稍后重试",
            };
        }
    }

    /**
     * 获取 Battle Pass 进度（带游戏数据）
     */
    static async getBattlePassWithGameData(params: {
        uid: string;
    }): Promise<{
        success: boolean;
        battlePass?: any;
        gameData?: any;
    }> {
        try {
            // 1. 获取 Battle Pass 进度
            const response = await fetch(
                `${getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.GET_PLAYER_BATTLE_PASS)}?uid=${params.uid}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.ok || !result.battlePass) {
                return {
                    success: false,
                };
            }

            // 2. 补充游戏特定数据
            const gameData = {
                // 可以添加游戏特定的统计信息
                tacticalMonsterPoints: result.battlePass.progress?.gameSpecificPoints?.tacticalMonster || {},
            };

            return {
                success: true,
                battlePass: result.battlePass,
                gameData: gameData,
            };
        } catch (error: any) {
            console.error("获取 Battle Pass 进度失败:", error);
            return {
                success: false,
            };
        }
    }

    /**
     * 添加金币（调用 Tournament 模块）
     */
    static async addCoins(ctx: any, params: {
        uid: string;
        coins: number;
        source: string;
        sourceId?: string;
    }) {
        // 调用 Tournament 的 HTTP Action
        const response = await fetch(
            getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.ADD_RESOURCES),
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: params.uid,
                    coins: params.coins,
                    source: params.source,
                    sourceId: params.sourceId,
                }),
            }
        );

        const result = await response.json();

        if (!response.ok || !result.ok) {
            throw new Error(result.error || "添加金币失败");
        }

        return result;
    }

    /**
     * 扣除金币（调用 Tournament 模块）
     */
    static async deductCoins(ctx: any, params: {
        uid: string;
        coins: number;
        source: string;
        sourceId?: string;
    }) {
        // 调用 Tournament 的 HTTP Action
        const response = await fetch(
            getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.DEDUCT_RESOURCES),
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: params.uid,
                    coins: params.coins,
                    source: params.source,
                    sourceId: params.sourceId,
                }),
            }
        );

        const result = await response.json();

        if (!response.ok || !result.ok) {
            throw new Error(result.error || "扣除金币失败");
        }

        return result;
    }

    /**
     * 获取玩家能量（调用 Tournament 模块）
     */
    static async getPlayerEnergy(ctx: any, params: {
        uid: string;
    }): Promise<{
        success: boolean;
        energy?: {
            current: number;
            max: number;
            lastRegenAt: string;
        };
        error?: string;
    }> {
        try {
            const response = await fetch(
                `${getTournamentUrl("/getPlayerEnergy")}?uid=${params.uid}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "获取能量失败");
            }

            return result;
        } catch (error: any) {
            console.error("获取玩家能量失败:", error);
            return {
                success: false,
                error: error.message || "网络错误",
            };
        }
    }

    /**
     * 消耗能量（调用 Tournament 模块）
     */
    static async consumeEnergy(ctx: any, params: {
        uid: string;
        amount: number;
    }): Promise<{
        success: boolean;
        message?: string;
        error?: string;
    }> {
        try {
            const response = await fetch(
                getTournamentUrl("/consumeEnergy"),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uid: params.uid,
                        amount: params.amount,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "消耗能量失败");
            }

            return result;
        } catch (error: any) {
            console.error("消耗能量失败:", error);
            return {
                success: false,
                error: error.message || "网络错误",
            };
        }
    }

    /**
     * 添加能量（调用 Tournament 模块）
     */
    static async addEnergy(ctx: any, params: {
        uid: string;
        amount: number;
        source: string;
        sourceId?: string;
    }): Promise<{
        success: boolean;
        message?: string;
        error?: string;
    }> {
        try {
            const response = await fetch(
                getTournamentUrl("/addEnergy"),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uid: params.uid,
                        amount: params.amount,
                        source: params.source,
                        sourceId: params.sourceId,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "添加能量失败");
            }

            return result;
        } catch (error: any) {
            console.error("添加能量失败:", error);
            return {
                success: false,
                error: error.message || "网络错误",
            };
        }
    }

    /**
     * 调用 Tournament 模块的统一奖励服务发放奖励
     */
    static async grantRewards(params: {
        uid: string;
        rewards: {
            coins?: number;
            gems?: number;
            seasonPoints?: number;
            rankPoints?: number;
            prestige?: number;
            props?: Array<{
                gameType: string;
                propType: string;
                quantity: number;
                rarity?: string;
            }>;
            monsters?: Array<{
                monsterId: string;
                level?: number;
                stars?: number;
            }>;
            monsterShards?: Array<{
                monsterId: string;
                quantity: number;
            }>;
            energy?: number;
        };
        source: string;
        sourceId?: string;
        metadata?: Record<string, any>;
        gameType?: string;
    }): Promise<{
        success: boolean;
        message: string;
        grantedRewards?: any;
        failedRewards?: Array<{ type: string; reason: string }>;
    }> {
        try {
            const response = await fetch(
                getTournamentUrl("/grantRewards"),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uid: params.uid,
                        rewards: params.rewards,
                        source: params.source,
                        sourceId: params.sourceId,
                        metadata: params.metadata,
                        gameType: params.gameType,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "发放奖励失败");
            }

            return result;
        } catch (error: any) {
            console.error("调用统一奖励服务失败:", error);
            return {
                success: false,
                message: error.message || "网络错误",
            };
        }
    }
}

