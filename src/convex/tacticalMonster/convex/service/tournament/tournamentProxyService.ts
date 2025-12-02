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

