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

