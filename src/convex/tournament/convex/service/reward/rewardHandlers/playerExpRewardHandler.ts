/**
 * 玩家经验值奖励处理器
 * 直接调用 Tournament 模块内的玩家等级服务
 * 
 * 架构说明：
 * - Tournament 模块：统一管理玩家等级和经验值（跨游戏通用）
 * - 直接调用模块内服务，无需 HTTP 调用
 */
import { calculateActivityExp } from "../../player/calculation/activityExpCalculation";
import { calculateTaskExp } from "../../player/calculation/taskExpCalculation";
import { calculateTournamentExp } from "../../player/calculation/tournamentExpCalculation";
import { PlayerLevelService } from "../../player/playerLevelService";

export class PlayerExpRewardHandler {
    /**
     * 发放玩家经验值奖励
     * 直接调用 Tournament 模块内的 PlayerLevelService
     */
    static async grant(ctx: any, params: {
        uid: string;
        exp: number;
        source: string;
        sourceId?: string;
    }): Promise<{ success: boolean; message: string; grantedExp?: number; newLevel?: number; levelUp?: boolean }> {
        try {
            // 直接调用 Tournament 模块内的服务
            const result = await PlayerLevelService.addExperience(ctx, {
                uid: params.uid,
                exp: params.exp,
                source: params.source,
                sourceId: params.sourceId,
            });

            if (!result.success) {
                return {
                    success: false,
                    message: result.message || "发放玩家经验值失败",
                };
            }

            return {
                success: true,
                message: result.message || "玩家经验值发放成功",
                grantedExp: result.newExp,
                newLevel: result.newLevel,
                levelUp: result.levelUp,
            };
        } catch (error: any) {
            console.error("发放玩家经验值失败:", error);
            return {
                success: false,
                message: `发放玩家经验值失败: ${error.message}`,
            };
        }
    }

    /**
     * 计算任务经验值
     * 直接调用计算模块
     */
    static async calculateTaskExp(
        taskType: "daily" | "weekly" | "achievement",
        taskDifficulty: "easy" | "medium" | "hard" = "medium",
        taskRewardValue: number = 0
    ): Promise<number> {
        try {
            return calculateTaskExp(taskType, taskDifficulty, taskRewardValue);
        } catch (error: any) {
            console.error("计算任务经验值失败:", error);
            return 0; // 失败时返回0，不影响其他奖励发放
        }
    }

    /**
     * 计算锦标赛经验值
     * 直接调用计算模块
     */
    static async calculateTournamentExp(
        rank: number,
        totalParticipants: number,
        tier: string = "bronze"
    ): Promise<number> {
        try {
            return calculateTournamentExp(rank, totalParticipants, tier);
        } catch (error: any) {
            console.error("计算锦标赛经验值失败:", error);
            return 0; // 失败时返回0，不影响其他奖励发放
        }
    }

    /**
     * 计算活动经验值
     * 直接调用计算模块
     */
    static async calculateActivityExp(
        activityMultiplier: number = 1.0
    ): Promise<number> {
        try {
            return calculateActivityExp(activityMultiplier);
        } catch (error: any) {
            console.error("计算活动经验值失败:", error);
            return 0; // 失败时返回0，不影响其他奖励发放
        }
    }
}

