/**
 * 段位升降管理器
 * 负责处理玩家的段位升级、降级和保护机制
 */

import { PlayerProtectionStatus, SegmentChangeRecord } from '../tournament/scoreThresholdControl/scoreThresholdRankingController';

// ==================== 段位规则配置 ====================

export interface SegmentRule {
    // 升级条件
    promotion: {
        pointsRequired: number;        // 升级所需积分
        winRateRequired: number;       // 最低胜率要求
        stabilityPeriod: number;       // 稳定期（连续保持）
        minMatches: number;            // 最少比赛场次
        consecutiveWinsRequired?: number; // 连续胜利要求
    };
    // 降级条件
    demotion: {
        pointsThreshold: number;       // 降级积分阈值
        consecutiveLosses: number;     // 连续失败次数
        gracePeriod: number;           // 宽限期
        protectionLevels: number;      // 保护等级数量
        winRateThreshold?: number;     // 最低胜率阈值
    };
    // 段位关系
    nextSegment: string | null;        // 升级后的段位
    previousSegment: string | null;    // 降级后的段位
    // 段位特性
    tier: number;                      // 段位等级（1-8）
    color: string;                     // 段位颜色
    icon: string;                      // 段位图标
}

export const SEGMENT_PROMOTION_DEMOTION_RULES: Record<string, SegmentRule> = {
    bronze: {
        promotion: {
            pointsRequired: 1000,
            winRateRequired: 0.4,
            stabilityPeriod: 3,
            minMatches: 10,
            consecutiveWinsRequired: 2
        },
        demotion: {
            pointsThreshold: -200,
            consecutiveLosses: 5,
            gracePeriod: 5,
            protectionLevels: 2,
            winRateThreshold: 0.3
        },
        nextSegment: "silver",
        previousSegment: null,
        tier: 1,
        color: "#CD7F32",
        icon: "🥉"
    },

    silver: {
        promotion: {
            pointsRequired: 2500,
            winRateRequired: 0.45,
            stabilityPeriod: 3,
            minMatches: 15,
            consecutiveWinsRequired: 3
        },
        demotion: {
            pointsThreshold: -150,
            consecutiveLosses: 4,
            gracePeriod: 4,
            protectionLevels: 2,
            winRateThreshold: 0.35
        },
        nextSegment: "gold",
        previousSegment: "bronze",
        tier: 2,
        color: "#C0C0C0",
        icon: "🥈"
    },

    gold: {
        promotion: {
            pointsRequired: 5000,
            winRateRequired: 0.5,
            stabilityPeriod: 4,
            minMatches: 20,
            consecutiveWinsRequired: 3
        },
        demotion: {
            pointsThreshold: -100,
            consecutiveLosses: 3,
            gracePeriod: 3,
            protectionLevels: 1,
            winRateThreshold: 0.4
        },
        nextSegment: "platinum",
        previousSegment: "silver",
        tier: 3,
        color: "#FFD700",
        icon: "🥇"
    },

    platinum: {
        promotion: {
            pointsRequired: 10000,
            winRateRequired: 0.55,
            stabilityPeriod: 5,
            minMatches: 25,
            consecutiveWinsRequired: 4
        },
        demotion: {
            pointsThreshold: -50,
            consecutiveLosses: 3,
            gracePeriod: 2,
            protectionLevels: 1,
            winRateThreshold: 0.45
        },
        nextSegment: "diamond",
        previousSegment: "gold",
        tier: 4,
        color: "#E5E4E2",
        icon: "💎"
    },

    diamond: {
        promotion: {
            pointsRequired: 20000,
            winRateRequired: 0.6,
            stabilityPeriod: 6,
            minMatches: 30,
            consecutiveWinsRequired: 4
        },
        demotion: {
            pointsThreshold: 0,
            consecutiveLosses: 5,
            gracePeriod: 3,
            protectionLevels: 3,
            winRateThreshold: 0.5
        },
        nextSegment: "master",
        previousSegment: "platinum",
        tier: 5,
        color: "#B9F2FF",
        icon: "💠"
    },

    master: {
        promotion: {
            pointsRequired: 50000,
            winRateRequired: 0.65,
            stabilityPeriod: 8,
            minMatches: 40,
            consecutiveWinsRequired: 5
        },
        demotion: {
            pointsThreshold: 1000,
            consecutiveLosses: 3,
            gracePeriod: 2,
            protectionLevels: 2,
            winRateThreshold: 0.55
        },
        nextSegment: "grandmaster",
        previousSegment: "diamond",
        tier: 6,
        color: "#FF6B6B",
        icon: "👑"
    },

    grandmaster: {
        promotion: {
            pointsRequired: 100000,
            winRateRequired: 0.7,
            stabilityPeriod: 10,
            minMatches: 50,
            consecutiveWinsRequired: 6
        },
        demotion: {
            pointsThreshold: 5000,
            consecutiveLosses: 2,
            gracePeriod: 1,
            protectionLevels: 1,
            winRateThreshold: 0.6
        },
        nextSegment: null,
        previousSegment: "master",
        tier: 7,
        color: "#9B59B6",
        icon: "🌟"
    }
};

// ==================== 段位变化结果接口 ====================

export interface SegmentChangeResult {
    changed: boolean;
    changeType?: "promotion" | "demotion";
    oldSegment?: string;
    newSegment?: string;
    pointsConsumed?: number;
    message?: string;
    reason?: string;
}

export interface PromotionCheckResult {
    shouldPromote: boolean;
    nextSegment?: string;
    pointsConsumed?: number;
    reason: string;
}

export interface DemotionCheckResult {
    shouldDemote: boolean;
    previousSegment?: string;
    reason: string;
}

export interface StabilityCheckResult {
    stable: boolean;
    currentPeriod: number;
    requiredPeriod: number;
}

export interface GracePeriodCheckResult {
    inGracePeriod: boolean;
    remainingGrace: number;
}

// ==================== 段位升降管理器 ====================

export class SegmentPromotionDemotionManager {

    /**
     * 检查段位变化
     */
    static async checkSegmentChange(
        ctx: any,
        uid: string,
        newPoints: number,
        performanceMetrics: any
    ): Promise<SegmentChangeResult> {
        // 获取当前段位配置
        const currentSegment = await this.getCurrentSegment(ctx, uid);
        if (!currentSegment) {
            return { changed: false, reason: "无法获取当前段位" };
        }

        const segmentRules = SEGMENT_PROMOTION_DEMOTION_RULES[currentSegment];
        if (!segmentRules) {
            return { changed: false, reason: "段位规则未找到" };
        }

        // 检查升级
        const promotionResult = await this.checkPromotion(
            ctx, uid, currentSegment, newPoints, performanceMetrics, segmentRules
        );

        // 检查降级
        const demotionResult = await this.checkDemotion(
            ctx, uid, currentSegment, newPoints, performanceMetrics, segmentRules
        );

        if (promotionResult.shouldPromote) {
            return await this.executePromotion(ctx, uid, currentSegment, promotionResult);
        }

        if (demotionResult.shouldDemote) {
            return await this.executeDemotion(ctx, uid, currentSegment, demotionResult);
        }

        return { changed: false, reason: "不满足升降级条件" };
    }

    /**
     * 检查升级条件
     */
    private static async checkPromotion(
        ctx: any,
        uid: string,
        currentSegment: string,
        points: number,
        performanceMetrics: any,
        rules: SegmentRule
    ): Promise<PromotionCheckResult> {
        const { promotion } = rules;

        // 检查积分要求
        if (points < promotion.pointsRequired) {
            return {
                shouldPromote: false,
                reason: `积分不足，需要 ${promotion.pointsRequired}，当前 ${points}`
            };
        }

        // 检查胜率要求
        const winRate = performanceMetrics.totalMatches > 0
            ? performanceMetrics.totalWins / performanceMetrics.totalMatches
            : 0;
        if (winRate < promotion.winRateRequired) {
            return {
                shouldPromote: false,
                reason: `胜率不足，需要 ${(promotion.winRateRequired * 100).toFixed(1)}%，当前 ${(winRate * 100).toFixed(1)}%`
            };
        }

        // 检查比赛场次
        if (performanceMetrics.totalMatches < promotion.minMatches) {
            return {
                shouldPromote: false,
                reason: `比赛场次不足，需要 ${promotion.minMatches} 场，当前 ${performanceMetrics.totalMatches} 场`
            };
        }

        // 检查连续胜利要求
        if (promotion.consecutiveWinsRequired &&
            performanceMetrics.currentWinStreak < promotion.consecutiveWinsRequired) {
            return {
                shouldPromote: false,
                reason: `连续胜利不足，需要 ${promotion.consecutiveWinsRequired} 场，当前 ${performanceMetrics.currentWinStreak} 场`
            };
        }

        // 检查稳定期
        const stabilityCheck = await this.checkStabilityPeriod(
            ctx, uid, currentSegment, promotion.stabilityPeriod
        );
        if (!stabilityCheck.stable) {
            return {
                shouldPromote: false,
                reason: `稳定期未满足，需要 ${stabilityCheck.requiredPeriod} 场，当前 ${stabilityCheck.currentPeriod} 场`
            };
        }

        return {
            shouldPromote: true,
            nextSegment: rules.nextSegment,
            pointsConsumed: promotion.pointsRequired,
            reason: "满足所有升级条件"
        };
    }

    /**
     * 检查降级条件
     */
    private static async checkDemotion(
        ctx: any,
        uid: string,
        currentSegment: string,
        points: number,
        performanceMetrics: any,
        rules: SegmentRule
    ): Promise<DemotionCheckResult> {
        const { demotion } = rules;
        const protectionStatus = await this.getProtectionStatus(ctx, uid);

        // 检查保护状态
        if (protectionStatus && protectionStatus.protectionLevel > 0) {
            return {
                shouldDemote: false,
                reason: `处于保护状态，保护等级 ${protectionStatus.protectionLevel}`
            };
        }

        // 检查积分阈值
        if (points > demotion.pointsThreshold) {
            return {
                shouldDemote: false,
                reason: `积分未达到降级阈值，当前 ${points}，阈值 ${demotion.pointsThreshold}`
            };
        }

        // 检查连续失败
        if (performanceMetrics.currentLoseStreak >= demotion.consecutiveLosses) {
            return {
                shouldDemote: false,
                reason: `连续失败次数过多，触发保护，当前 ${performanceMetrics.currentLoseStreak} 场`
            };
        }

        // 检查胜率阈值
        if (demotion.winRateThreshold) {
            const winRate = performanceMetrics.totalMatches > 0
                ? performanceMetrics.totalWins / performanceMetrics.totalMatches
                : 0;
            if (winRate >= demotion.winRateThreshold) {
                return {
                    shouldDemote: false,
                    reason: `胜率未达到降级阈值，当前 ${(winRate * 100).toFixed(1)}%，阈值 ${(demotion.winRateThreshold * 100).toFixed(1)}%`
                };
            }
        }

        // 检查宽限期
        const gracePeriodCheck = await this.checkGracePeriod(
            ctx, uid, currentSegment, demotion.gracePeriod
        );
        if (gracePeriodCheck.inGracePeriod) {
            return {
                shouldDemote: false,
                reason: `处于降级宽限期，剩余 ${gracePeriodCheck.remainingGrace} 场`
            };
        }

        return {
            shouldDemote: true,
            previousSegment: rules.previousSegment,
            reason: "满足降级条件"
        };
    }

    /**
     * 检查稳定期
     */
    private static async checkStabilityPeriod(
        ctx: any,
        uid: string,
        segmentName: string,
        requiredPeriod: number
    ): Promise<StabilityCheckResult> {
        // 获取最近的比赛记录
        const recentMatches = await ctx.db
            .query("player_match_records")
            .withIndex("by_uid", (q) => q.eq("uid", uid))
            .order("desc")
            .take(requiredPeriod);

        if (recentMatches.length < requiredPeriod) {
            return {
                stable: false,
                currentPeriod: recentMatches.length,
                requiredPeriod
            };
        }

        // 检查是否都在当前段位
        const allInSegment = recentMatches.every(match => {
            // 这里需要根据实际数据结构调整
            return match.segmentName === segmentName;
        });

        return {
            stable: allInSegment,
            currentPeriod: recentMatches.length,
            requiredPeriod
        };
    }

    /**
     * 检查宽限期
     */
    private static async checkGracePeriod(
        ctx: any,
        uid: string,
        segmentName: string,
        gracePeriod: number
    ): Promise<GracePeriodCheckResult> {
        // 获取段位变化历史
        const segmentChanges = await ctx.db
            .query("segment_change_history")
            .withIndex("by_uid", (q) => q.eq("uid", uid))
            .order("desc")
            .take(1);

        if (segmentChanges.length === 0) {
            return {
                inGracePeriod: false,
                remainingGrace: 0
            };
        }

        const lastChange = segmentChanges[0];
        const changeTime = new Date(lastChange.createdAt);
        const currentTime = new Date();
        const daysSinceChange = (currentTime.getTime() - changeTime.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceChange <= gracePeriod) {
            return {
                inGracePeriod: true,
                remainingGrace: Math.ceil(gracePeriod - daysSinceChange)
            };
        }

        return {
            inGracePeriod: false,
            remainingGrace: 0
        };
    }

    /**
     * 执行升级
     */
    private static async executePromotion(
        ctx: any,
        uid: string,
        oldSegment: string,
        promotionResult: PromotionCheckResult
    ): Promise<SegmentChangeResult> {
        const { nextSegment, pointsConsumed } = promotionResult;

        if (!nextSegment) {
            return { changed: false, reason: "已达到最高段位" };
        }

        // 扣除升级所需积分
        await this.consumePoints(ctx, uid, "rankPoints", pointsConsumed);

        // 更新段位
        await this.updateSegment(ctx, uid, nextSegment);

        // 创建新段位配置
        await this.createSegmentConfig(ctx, uid, nextSegment);

        // 记录升级历史
        await this.recordSegmentChange(ctx, uid, oldSegment, nextSegment, "promotion", pointsConsumed);

        // 重置保护状态
        await this.resetProtectionStatus(ctx, uid);

        // 发送升级通知
        await this.sendPromotionNotification(ctx, uid, oldSegment, nextSegment);

        return {
            changed: true,
            changeType: "promotion",
            oldSegment,
            newSegment: nextSegment,
            pointsConsumed,
            message: `🎉 恭喜！您已从 ${oldSegment} 升级到 ${nextSegment}！`
        };
    }

    /**
     * 执行降级
     */
    private static async executeDemotion(
        ctx: any,
        uid: string,
        oldSegment: string,
        demotionResult: DemotionCheckResult
    ): Promise<SegmentChangeResult> {
        const { previousSegment } = demotionResult;

        if (!previousSegment) {
            return { changed: false, reason: "已达到最低段位" };
        }

        // 更新段位
        await this.updateSegment(ctx, uid, previousSegment);

        // 更新段位配置
        await this.updateSegmentConfig(ctx, uid, previousSegment);

        // 记录降级历史
        await this.recordSegmentChange(ctx, uid, oldSegment, previousSegment, "demotion", 0);

        // 设置保护状态
        await this.setProtectionStatus(ctx, uid, previousSegment, 1);

        // 发送降级通知
        await this.sendDemotionNotification(ctx, uid, oldSegment, previousSegment);

        return {
            changed: true,
            changeType: "demotion",
            oldSegment,
            newSegment: previousSegment,
            pointsConsumed: 0,
            message: `📉 很遗憾，您从 ${oldSegment} 降级到 ${previousSegment}，继续努力！`
        };
    }

    // ==================== 辅助方法 ====================

    /**
     * 获取当前段位
     */
    private static async getCurrentSegment(ctx: any, uid: string): Promise<string | null> {
        const playerData = await ctx.db
            .query("player_performance_metrics")
            .withIndex("by_uid", (q) => q.eq("uid", uid))
            .unique();

        return playerData?.segmentName || null;
    }

    /**
     * 获取保护状态
     */
    private static async getProtectionStatus(ctx: any, uid: string): Promise<PlayerProtectionStatus | null> {
        return await ctx.db
            .query("player_protection_status")
            .withIndex("by_uid", (q) => q.eq("uid", uid))
            .unique();
    }

    /**
     * 扣除积分
     */
    private static async consumePoints(ctx: any, uid: string, pointsType: string, amount: number): Promise<void> {
        // 这里需要根据实际的积分系统实现
        // 暂时记录到日志
        console.log(`扣除玩家 ${uid} 的 ${pointsType} 积分: ${amount}`);
    }

    /**
     * 更新段位
     */
    private static async updateSegment(ctx: any, uid: string, newSegment: string): Promise<void> {
        // 更新性能指标表中的段位
        const playerData = await ctx.db
            .query("player_performance_metrics")
            .withIndex("by_uid", (q) => q.eq("uid", uid))
            .unique();

        if (playerData) {
            await ctx.db.patch(playerData._id, {
                segmentName: newSegment,
                lastUpdated: new Date().toISOString()
            });
        }
    }

    /**
     * 创建段位配置
     */
    private static async createSegmentConfig(ctx: any, uid: string, segmentName: string): Promise<void> {
        // 这里需要根据实际的配置系统实现
        console.log(`为玩家 ${uid} 创建 ${segmentName} 段位配置`);
    }

    /**
     * 更新段位配置
     */
    private static async updateSegmentConfig(ctx: any, uid: string, segmentName: string): Promise<void> {
        // 这里需要根据实际的配置系统实现
        console.log(`更新玩家 ${uid} 的段位配置为 ${segmentName}`);
    }

    /**
     * 记录段位变化
     */
    private static async recordSegmentChange(
        ctx: any,
        uid: string,
        oldSegment: string,
        newSegment: string,
        changeType: "promotion" | "demotion",
        pointsConsumed: number
    ): Promise<void> {
        const segmentChange: SegmentChangeRecord = {
            uid,
            oldSegment,
            newSegment,
            changeType,
            pointsConsumed,
            createdAt: new Date().toISOString()
        };

        await ctx.db.insert("segment_change_history", segmentChange);
    }

    /**
     * 重置保护状态
     */
    private static async resetProtectionStatus(ctx: any, uid: string): Promise<void> {
        const protectionStatus = await this.getProtectionStatus(ctx, uid);
        if (protectionStatus) {
            await ctx.db.patch(protectionStatus._id, {
                protectionLevel: 0,
                updatedAt: new Date().toISOString()
            });
        }
    }

    /**
     * 设置保护状态
     */
    private static async setProtectionStatus(ctx: any, uid: string, segmentName: string, level: number): Promise<void> {
        const protectionStatus = await this.getProtectionStatus(ctx, uid);
        if (protectionStatus) {
            await ctx.db.patch(protectionStatus._id, {
                protectionLevel: level,
                updatedAt: new Date().toISOString()
            });
        }
    }

    /**
     * 发送升级通知
     */
    private static async sendPromotionNotification(ctx: any, uid: string, oldSegment: string, newSegment: string): Promise<void> {
        // 这里需要根据实际的通知系统实现
        console.log(`发送升级通知给玩家 ${uid}: ${oldSegment} -> ${newSegment}`);
    }

    /**
     * 发送降级通知
     */
    private static async sendDemotionNotification(ctx: any, uid: string, oldSegment: string, newSegment: string): Promise<void> {
        // 这里需要根据实际的通知系统实现
        console.log(`发送降级通知给玩家 ${uid}: ${oldSegment} -> ${newSegment}`);
    }

    // ==================== 公共方法 ====================

    /**
     * 获取段位信息
     */
    static getSegmentInfo(segmentName: string): SegmentRule | null {
        return SEGMENT_PROMOTION_DEMOTION_RULES[segmentName] || null;
    }

    /**
     * 获取所有可用段位
     */
    static getAvailableSegments(): string[] {
        return Object.keys(SEGMENT_PROMOTION_DEMOTION_RULES);
    }

    /**
     * 获取段位等级
     */
    static getSegmentTier(segmentName: string): number {
        const segmentInfo = this.getSegmentInfo(segmentName);
        return segmentInfo?.tier || 0;
    }

    /**
     * 获取段位颜色
     */
    static getSegmentColor(segmentName: string): string {
        const segmentInfo = this.getSegmentInfo(segmentName);
        return segmentInfo?.color || "#000000";
    }

    /**
     * 获取段位图标
     */
    static getSegmentIcon(segmentName: string): string {
        const segmentInfo = this.getSegmentInfo(segmentName);
        return segmentInfo?.icon || "🏆";
    }

    /**
     * 检查是否可以升级
     */
    static canPromote(currentSegment: string): boolean {
        const segmentInfo = this.getSegmentInfo(currentSegment);
        return segmentInfo?.nextSegment !== null;
    }

    /**
     * 检查是否可以降级
     */
    static canDemote(currentSegment: string): boolean {
        const segmentInfo = this.getSegmentInfo(currentSegment);
        return segmentInfo?.nextSegment !== null;
    }

    /**
     * 获取下一个段位
     */
    static getNextSegment(currentSegment: string): string | null {
        const segmentInfo = this.getSegmentInfo(currentSegment);
        return segmentInfo?.nextSegment || null;
    }

    /**
     * 获取上一个段位
     */
    static getPreviousSegment(currentSegment: string): string | null {
        const segmentInfo = this.getSegmentInfo(currentSegment);
        return segmentInfo?.previousSegment || null;
    }
}
