import { LimitConfig } from "./tournamentConfigs";

/**
 * 测试 limits 配置的工具函数
 */
export class LimitsConfigurationTester {

    /**
     * 验证 limits 配置的合理性
     */
    static validateLimitsConfig(limits: LimitConfig): { valid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 检查必需的时间范围
        const requiredTimeRanges = ['daily', 'weekly', 'seasonal', 'total'];
        for (const timeRange of requiredTimeRanges) {
            if (!limits[timeRange]) {
                errors.push(`缺少 ${timeRange} 时间范围配置`);
                continue;
            }

            const config = limits[timeRange];
            if (config.maxParticipations <= 0) {
                errors.push(`${timeRange}.maxParticipations 必须大于 0`);
            }
            if (config.maxTournaments <= 0) {
                errors.push(`${timeRange}.maxTournaments 必须大于 0`);
            }
            if (config.maxAttempts <= 0) {
                errors.push(`${timeRange}.maxAttempts 必须大于 0`);
            }
        }

        // 检查订阅用户配置
        if (limits.subscribed) {
            const subscribedRanges = ['daily', 'weekly', 'seasonal'];
            for (const timeRange of subscribedRanges) {
                if (limits.subscribed[timeRange]) {
                    const normal = limits[timeRange];
                    const subscribed = limits.subscribed[timeRange];

                    if (subscribed.maxParticipations <= normal.maxParticipations) {
                        warnings.push(`订阅用户 ${timeRange}.maxParticipations 应该大于普通用户`);
                    }
                    if (subscribed.maxTournaments <= normal.maxTournaments) {
                        warnings.push(`订阅用户 ${timeRange}.maxTournaments 应该大于普通用户`);
                    }
                    if (subscribed.maxAttempts <= normal.maxAttempts) {
                        warnings.push(`订阅用户 ${timeRange}.maxAttempts 应该大于普通用户`);
                    }
                }
            }
        }

        // 检查时间范围之间的逻辑关系
        if (limits.daily && limits.weekly) {
            if (limits.daily.maxParticipations * 7 < limits.weekly.maxParticipations) {
                warnings.push('每周限制应该合理反映每日限制的累积');
            }
        }

        if (limits.weekly && limits.seasonal) {
            if (limits.weekly.maxParticipations * 4 < limits.seasonal.maxParticipations) {
                warnings.push('赛季限制应该合理反映每周限制的累积');
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 生成推荐的 limits 配置
     */
    static generateRecommendedLimits(tournamentType: string, gameType: string): LimitConfig {
        const baseConfig = {
            daily: {
                maxParticipations: 5,
                maxTournaments: 2,
                maxAttempts: 5
            },
            weekly: {
                maxParticipations: 35,
                maxTournaments: 14,
                maxAttempts: 35
            },
            seasonal: {
                maxParticipations: 150,
                maxTournaments: 60,
                maxAttempts: 150
            },
            total: {
                maxParticipations: 1000,
                maxTournaments: 500,
                maxAttempts: 1000
            },
            subscribed: {
                daily: {
                    maxParticipations: 8,
                    maxTournaments: 3,
                    maxAttempts: 8
                },
                weekly: {
                    maxParticipations: 56,
                    maxTournaments: 21,
                    maxAttempts: 56
                },
                seasonal: {
                    maxParticipations: 240,
                    maxTournaments: 90,
                    maxAttempts: 240
                }
            }
        };

        // 根据锦标赛类型调整
        switch (tournamentType) {
            case 'daily_tournament':
                return {
                    ...baseConfig,
                    daily: { maxParticipations: 3, maxTournaments: 1, maxAttempts: 3 },
                    weekly: { maxParticipations: 21, maxTournaments: 7, maxAttempts: 21 },
                    seasonal: { maxParticipations: 90, maxTournaments: 30, maxAttempts: 90 }
                };

            case 'weekly_tournament':
                return {
                    ...baseConfig,
                    daily: { maxParticipations: 1, maxTournaments: 1, maxAttempts: 1 },
                    weekly: { maxParticipations: 7, maxTournaments: 1, maxAttempts: 7 },
                    seasonal: { maxParticipations: 30, maxTournaments: 4, maxAttempts: 30 }
                };

            case 'seasonal_tournament':
                return {
                    ...baseConfig,
                    daily: { maxParticipations: 2, maxTournaments: 1, maxAttempts: 2 },
                    weekly: { maxParticipations: 14, maxTournaments: 2, maxAttempts: 14 },
                    seasonal: { maxParticipations: 60, maxTournaments: 10, maxAttempts: 60 }
                };

            case 'premium_tournament':
                return {
                    ...baseConfig,
                    daily: { maxParticipations: 2, maxTournaments: 1, maxAttempts: 2 },
                    weekly: { maxParticipations: 14, maxTournaments: 3, maxAttempts: 14 },
                    seasonal: { maxParticipations: 60, maxTournaments: 15, maxAttempts: 60 },
                    subscribed: {
                        daily: { maxParticipations: 4, maxTournaments: 2, maxAttempts: 4 },
                        weekly: { maxParticipations: 28, maxTournaments: 6, maxAttempts: 28 },
                        seasonal: { maxParticipations: 120, maxTournaments: 30, maxAttempts: 120 }
                    }
                };

            default:
                return baseConfig;
        }
    }

    /**
     * 计算限制使用率
     */
    static calculateLimitUsage(current: number, limit: number): number {
        return Math.round((current / limit) * 100);
    }

    /**
     * 检查是否接近限制
     */
    static isNearLimit(current: number, limit: number, threshold: number = 80): boolean {
        return this.calculateLimitUsage(current, limit) >= threshold;
    }

    /**
     * 获取限制状态描述
     */
    static getLimitStatus(current: number, limit: number): {
        status: 'safe' | 'warning' | 'critical' | 'exceeded';
        usage: number;
        remaining: number;
        message: string;
    } {
        const usage = this.calculateLimitUsage(current, limit);
        const remaining = Math.max(0, limit - current);

        if (current >= limit) {
            return {
                status: 'exceeded',
                usage,
                remaining: 0,
                message: `已超过限制 (${current}/${limit})`
            };
        } else if (usage >= 90) {
            return {
                status: 'critical',
                usage,
                remaining,
                message: `接近限制 (${current}/${limit}, 剩余 ${remaining})`
            };
        } else if (usage >= 70) {
            return {
                status: 'warning',
                usage,
                remaining,
                message: `使用率较高 (${current}/${limit}, 剩余 ${remaining})`
            };
        } else {
            return {
                status: 'safe',
                usage,
                remaining,
                message: `使用正常 (${current}/${limit}, 剩余 ${remaining})`
            };
        }
    }
}

/**
 * 测试用例
 */
export const testLimitsConfiguration = () => {
    console.log('=== 测试 Limits 配置 ===');

    // 测试配置验证
    const testConfig: LimitConfig = {
        daily: {
            maxParticipations: 8,
            maxTournaments: 4,
            maxAttempts: 8
        },
        weekly: {
            maxParticipations: 56,
            maxTournaments: 28,
            maxAttempts: 56
        },
        seasonal: {
            maxParticipations: 240,
            maxTournaments: 120,
            maxAttempts: 240
        },
        total: {
            maxParticipations: 1000,
            maxTournaments: 500,
            maxAttempts: 2000
        },
        subscribed: {
            daily: {
                maxParticipations: 12,
                maxTournaments: 6,
                maxAttempts: 12
            },
            weekly: {
                maxParticipations: 84,
                maxTournaments: 42,
                maxAttempts: 84
            },
            seasonal: {
                maxParticipations: 360,
                maxTournaments: 180,
                maxAttempts: 360
            }
        }
    };

    const validation = LimitsConfigurationTester.validateLimitsConfig(testConfig);
    console.log('配置验证结果:', validation);

    // 测试推荐配置生成
    const recommendedConfig = LimitsConfigurationTester.generateRecommendedLimits('premium_tournament', 'chess');
    console.log('推荐配置:', recommendedConfig);

    // 测试限制状态检查
    const statusTests = [
        { current: 5, limit: 10 },
        { current: 8, limit: 10 },
        { current: 9, limit: 10 },
        { current: 10, limit: 10 },
        { current: 12, limit: 10 }
    ];

    statusTests.forEach(test => {
        const status = LimitsConfigurationTester.getLimitStatus(test.current, test.limit);
        console.log(`当前: ${test.current}, 限制: ${test.limit} -> ${status.message}`);
    });

    // 测试使用率计算
    const usageTests = [
        { current: 0, limit: 10 },
        { current: 5, limit: 10 },
        { current: 7, limit: 10 },
        { current: 10, limit: 10 }
    ];

    usageTests.forEach(test => {
        const usage = LimitsConfigurationTester.calculateLimitUsage(test.current, test.limit);
        const isNear = LimitsConfigurationTester.isNearLimit(test.current, test.limit);
        console.log(`使用率: ${test.current}/${test.limit} = ${usage}%, 接近限制: ${isNear}`);
    });
};

/**
 * 模拟玩家限制检查
 */
export const simulatePlayerLimitCheck = (limits: LimitConfig, playerUsage: {
    participations: number;
    tournaments: number;
    attempts: number;
    isSubscribed: boolean;
}) => {
    const { participations, tournaments, attempts, isSubscribed } = playerUsage;

    // 选择适用的限制配置
    const applicableLimits = isSubscribed && limits.subscribed ? limits.subscribed.daily : limits.daily;

    const results = {
        participations: LimitsConfigurationTester.getLimitStatus(participations, applicableLimits.maxParticipations),
        tournaments: LimitsConfigurationTester.getLimitStatus(tournaments, applicableLimits.maxTournaments),
        attempts: LimitsConfigurationTester.getLimitStatus(attempts, applicableLimits.maxAttempts)
    };

    console.log('玩家限制检查结果:');
    console.log(`参与次数: ${results.participations.message}`);
    console.log(`锦标赛类型: ${results.tournaments.message}`);
    console.log(`尝试次数: ${results.attempts.message}`);

    // 检查是否可以参与
    const canParticipate =
        results.participations.status !== 'exceeded' &&
        results.tournaments.status !== 'exceeded' &&
        results.attempts.status !== 'exceeded';

    console.log(`是否可以参与: ${canParticipate ? '是' : '否'}`);

    return {
        canParticipate,
        results
    };
};

// 导出测试函数
export default {
    LimitsConfigurationTester,
    testLimitsConfiguration,
    simulatePlayerLimitCheck
}; 