/**
 * 充值活动服务
 * 处理游戏特定的充值活动逻辑
 */

import { TournamentProxyService } from "../tournament/tournamentProxyService";

export class RechargeActivityService {
    /**
     * 处理充值并更新活动进度
     */
    static async processRecharge(
        ctx: any,
        params: {
            uid: string;
            amount: number;
            source: string;
            sourceId?: string;
        }
    ): Promise<{
        success: boolean;
        message: string;
        updatedActivities?: string[];
    }> {
        try {
            const { uid, amount, source, sourceId } = params;

            // 通过HTTP调用Tournament模块处理充值活动
            const response = await fetch(
                process.env.TOURNAMENT_URL 
                    ? `${process.env.TOURNAMENT_URL}/processActivityEvent`
                    : "https://beloved-mouse-699.convex.site/processActivityEvent",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uid,
                        eventType: "recharge",
                        amount,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            return {
                success: result.success || false,
                message: result.message || "处理充值活动完成",
                updatedActivities: result.updatedActivities,
            };
        } catch (error: any) {
            console.error("处理充值活动失败:", error);
            return {
                success: false,
                message: `处理充值活动失败: ${error.message}`,
            };
        }
    }

    /**
     * 获取玩家充值活动进度
     */
    static async getRechargeActivityProgress(
        ctx: any,
        uid: string
    ): Promise<{
        success: boolean;
        activities?: any[];
    }> {
        try {
            // 通过HTTP调用Tournament模块获取活动进度
            const response = await fetch(
                process.env.TOURNAMENT_URL 
                    ? `${process.env.TOURNAMENT_URL}/getPlayerActivities`
                    : "https://beloved-mouse-699.convex.site/getPlayerActivities",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uid,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const activities = await response.json();

            // 过滤出充值活动
            const rechargeActivities = activities.filter((activity: any) => 
                activity.template?.type === "recharge"
            );

            return {
                success: true,
                activities: rechargeActivities,
            };
        } catch (error: any) {
            console.error("获取充值活动进度失败:", error);
            return {
                success: false,
                activities: [],
            };
        }
    }
}

