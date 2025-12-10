/**
 * 每日上限服务
 * 处理上限检查和应用，可能需要查询数据库
 */

import { DailyLimitConfig, DEFAULT_DAILY_LIMIT_CONFIG } from "./dailyLimitConfig";

/**
 * 上限信息接口
 */
export interface LimitInfo {
    dailyTotalPoints: number;
    remainingFullReward: number;
    remainingReducedReward: number;
    isInReducedPhase: boolean;
    reductionRate: number;
    isSourceLimited: boolean;
}

/**
 * 应用软上限的结果
 */
export interface ApplyLimitResult {
    grantedPoints: number;
    limitInfo: LimitInfo;
}

/**
 * 每日上限服务类
 */
export class DailyLimitService {
    /**
     * 应用基于积分总量的软上限（纯函数版本）
     * @param source 积分来源：tournament, task, activity, tacticalMonster:monster_rumble 等
     * @param basePoints 基础积分
     * @param dailyTotalPoints 今日已获得的总积分
     * @param dailySourcePoints 今日该来源已获得的积分
     * @param limitType 上限类型：exp 或 seasonPoints
     * @param config 每日上限配置（可选，默认使用 DEFAULT_DAILY_LIMIT_CONFIG）
     * @returns 应用上限后的积分和限制信息
     */
    static applySoftLimit(
        source: string,
        basePoints: number,
        dailyTotalPoints: number,
        dailySourcePoints: number,
        limitType: "exp" | "seasonPoints" = "exp",
        config: DailyLimitConfig = DEFAULT_DAILY_LIMIT_CONFIG
    ): ApplyLimitResult {
        const limitConfig = config[limitType].totalDailyLimit;
        const sourceLimits = config[limitType].sourceLimits;
        
        // 1. 检查单个来源上限（可选）
        let isSourceLimited = false;
        if (sourceLimits?.[source]) {
            const sourceLimit = sourceLimits[source].maxPoints;
            if (dailySourcePoints >= sourceLimit) {
                return {
                    grantedPoints: 0,
                    limitInfo: {
                        dailyTotalPoints,
                        remainingFullReward: 0,
                        remainingReducedReward: 0,
                        isInReducedPhase: true,
                        reductionRate: 0,
                        isSourceLimited: true,
                    },
                };
            }
            // 检查是否会超过单来源上限
            if (dailySourcePoints + basePoints > sourceLimit) {
                basePoints = sourceLimit - dailySourcePoints;
                isSourceLimited = true;
            }
        }
        
        // 2. 计算可获得的积分
        let grantedPoints = basePoints;
        let reductionRate = 1.0;
        let isInReducedPhase = false;
        
        // 3. 全额奖励阶段
        if (dailyTotalPoints < limitConfig.fullReward) {
            const remaining = limitConfig.fullReward - dailyTotalPoints;
            grantedPoints = Math.min(basePoints, remaining);
            
            return {
                grantedPoints,
                limitInfo: {
                    dailyTotalPoints: dailyTotalPoints + grantedPoints,
                    remainingFullReward: Math.max(0, remaining - grantedPoints),
                    remainingReducedReward: limitConfig.reducedReward,
                    isInReducedPhase: false,
                    reductionRate: 1.0,
                    isSourceLimited,
                },
            };
        }
        
        // 4. 递减奖励阶段
        if (dailyTotalPoints < limitConfig.fullReward + limitConfig.reducedReward) {
            isInReducedPhase = true;
            const overLimit = dailyTotalPoints - limitConfig.fullReward;
            const reductionSteps = Math.floor(overLimit / limitConfig.reductionStep);
            reductionRate = Math.max(
                limitConfig.minRewardRate,
                1.0 - (reductionSteps * limitConfig.reductionRate)
            );
            
            const remaining = (limitConfig.fullReward + limitConfig.reducedReward) - dailyTotalPoints;
            grantedPoints = Math.min(basePoints, remaining);
            grantedPoints = Math.floor(grantedPoints * reductionRate);
            
            return {
                grantedPoints,
                limitInfo: {
                    dailyTotalPoints: dailyTotalPoints + grantedPoints,
                    remainingFullReward: 0,
                    remainingReducedReward: Math.max(0, remaining - grantedPoints),
                    isInReducedPhase: true,
                    reductionRate,
                    isSourceLimited,
                },
            };
        }
        
        // 5. 超过上限：给予最小奖励
        grantedPoints = Math.floor(basePoints * limitConfig.minRewardRate);
        
        return {
            grantedPoints,
            limitInfo: {
                dailyTotalPoints: dailyTotalPoints + grantedPoints,
                remainingFullReward: 0,
                remainingReducedReward: 0,
                isInReducedPhase: true,
                reductionRate: limitConfig.minRewardRate,
                isSourceLimited,
            },
        };
    }
    
    /**
     * 获取今日日期字符串（YYYY-MM-DD）
     * @returns 今日日期字符串
     */
    static getTodayDateString(): string {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }
    
    /**
     * 获取重置时间（明天00:00的ISO字符串）
     * @returns 重置时间的ISO字符串
     */
    static getResetTime(): string {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.toISOString();
    }
}

