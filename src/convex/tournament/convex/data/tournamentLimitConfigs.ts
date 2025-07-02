/**
 * 锦标赛限制配置示例
 * 展示如何配置成每日一次、每周一次或每赛季一次的限制
 */

import { LimitConfig } from "./tournamentConfigs";

/**
 * 每日一次限制配置
 */
export const DAILY_ONCE_LIMITS: LimitConfig = {
    daily: {
        maxParticipations: 1,
        maxTournaments: 1,
        maxAttempts: 1
    },
    weekly: {
        maxParticipations: 7,
        maxTournaments: 7,
        maxAttempts: 7
    },
    seasonal: {
        maxParticipations: 90,
        maxTournaments: 90,
        maxAttempts: 90
    },
    total: {
        maxParticipations: 1000,
        maxTournaments: 1000,
        maxAttempts: 1000
    },
    subscribed: {
        daily: {
            maxParticipations: 2,
            maxTournaments: 2,
            maxAttempts: 2
        },
        weekly: {
            maxParticipations: 14,
            maxTournaments: 14,
            maxAttempts: 14
        },
        seasonal: {
            maxParticipations: 180,
            maxTournaments: 180,
            maxAttempts: 180
        }
    }
};

/**
 * 每周一次限制配置
 */
export const WEEKLY_ONCE_LIMITS: LimitConfig = {
    daily: {
        maxParticipations: 1,
        maxTournaments: 1,
        maxAttempts: 1
    },
    weekly: {
        maxParticipations: 1,
        maxTournaments: 1,
        maxAttempts: 1
    },
    seasonal: {
        maxParticipations: 13,
        maxTournaments: 13,
        maxAttempts: 13
    },
    total: {
        maxParticipations: 1000,
        maxTournaments: 1000,
        maxAttempts: 1000
    },
    subscribed: {
        daily: {
            maxParticipations: 1,
            maxTournaments: 1,
            maxAttempts: 1
        },
        weekly: {
            maxParticipations: 2,
            maxTournaments: 2,
            maxAttempts: 2
        },
        seasonal: {
            maxParticipations: 26,
            maxTournaments: 26,
            maxAttempts: 26
        }
    }
};

/**
 * 每赛季一次限制配置
 */
export const SEASONAL_ONCE_LIMITS: LimitConfig = {
    daily: {
        maxParticipations: 1,
        maxTournaments: 1,
        maxAttempts: 1
    },
    weekly: {
        maxParticipations: 1,
        maxTournaments: 1,
        maxAttempts: 1
    },
    seasonal: {
        maxParticipations: 1,
        maxTournaments: 1,
        maxAttempts: 1
    },
    total: {
        maxParticipations: 1000,
        maxTournaments: 1000,
        maxAttempts: 1000
    },
    subscribed: {
        daily: {
            maxParticipations: 1,
            maxTournaments: 1,
            maxAttempts: 1
        },
        weekly: {
            maxParticipations: 1,
            maxTournaments: 1,
            maxAttempts: 1
        },
        seasonal: {
            maxParticipations: 2,
            maxTournaments: 2,
            maxAttempts: 2
        }
    }
};

/**
 * 每日三次限制配置（当前independentTournament的默认配置）
 */
export const DAILY_THREE_LIMITS: LimitConfig = {
    daily: {
        maxParticipations: 3,
        maxTournaments: 3,
        maxAttempts: 3
    },
    weekly: {
        maxParticipations: 21,
        maxTournaments: 21,
        maxAttempts: 21
    },
    seasonal: {
        maxParticipations: 90,
        maxTournaments: 90,
        maxAttempts: 90
    },
    total: {
        maxParticipations: 1000,
        maxTournaments: 1000,
        maxAttempts: 1000
    },
    subscribed: {
        daily: {
            maxParticipations: 5,
            maxTournaments: 5,
            maxAttempts: 5
        },
        weekly: {
            maxParticipations: 35,
            maxTournaments: 35,
            maxAttempts: 35
        },
        seasonal: {
            maxParticipations: 150,
            maxTournaments: 150,
            maxAttempts: 150
        }
    }
};

/**
 * 无限制配置
 */
export const UNLIMITED_LIMITS: LimitConfig = {
    daily: {
        maxParticipations: 999,
        maxTournaments: 999,
        maxAttempts: 999
    },
    weekly: {
        maxParticipations: 9999,
        maxTournaments: 9999,
        maxAttempts: 9999
    },
    seasonal: {
        maxParticipations: 99999,
        maxTournaments: 99999,
        maxAttempts: 99999
    },
    total: {
        maxParticipations: 999999,
        maxTournaments: 999999,
        maxAttempts: 999999
    },
    subscribed: {
        daily: {
            maxParticipations: 999,
            maxTournaments: 999,
            maxAttempts: 999
        },
        weekly: {
            maxParticipations: 9999,
            maxTournaments: 9999,
            maxAttempts: 9999
        },
        seasonal: {
            maxParticipations: 99999,
            maxTournaments: 99999,
            maxAttempts: 99999
        }
    }
};

/**
 * 获取限制配置
 */
export function getLimitConfig(type: "daily_once" | "weekly_once" | "seasonal_once" | "daily_three" | "unlimited"): LimitConfig {
    switch (type) {
        case "daily_once":
            return DAILY_ONCE_LIMITS;
        case "weekly_once":
            return WEEKLY_ONCE_LIMITS;
        case "seasonal_once":
            return SEASONAL_ONCE_LIMITS;
        case "daily_three":
            return DAILY_THREE_LIMITS;
        case "unlimited":
            return UNLIMITED_LIMITS;
        default:
            return DAILY_THREE_LIMITS;
    }
}

/**
 * 创建自定义限制配置
 */
export function createCustomLimits(params: {
    daily?: number;
    weekly?: number;
    seasonal?: number;
    total?: number;
    subscribedDaily?: number;
    subscribedWeekly?: number;
    subscribedSeasonal?: number;
}): LimitConfig {
    const {
        daily = 3,
        weekly = 21,
        seasonal = 90,
        total = 1000,
        subscribedDaily = 5,
        subscribedWeekly = 35,
        subscribedSeasonal = 150
    } = params;

    return {
        daily: {
            maxParticipations: daily,
            maxTournaments: daily,
            maxAttempts: daily
        },
        weekly: {
            maxParticipations: weekly,
            maxTournaments: weekly,
            maxAttempts: weekly
        },
        seasonal: {
            maxParticipations: seasonal,
            maxTournaments: seasonal,
            maxAttempts: seasonal
        },
        total: {
            maxParticipations: total,
            maxTournaments: total,
            maxAttempts: total
        },
        subscribed: {
            daily: {
                maxParticipations: subscribedDaily,
                maxTournaments: subscribedDaily,
                maxAttempts: subscribedDaily
            },
            weekly: {
                maxParticipations: subscribedWeekly,
                maxTournaments: subscribedWeekly,
                maxAttempts: subscribedWeekly
            },
            seasonal: {
                maxParticipations: subscribedSeasonal,
                maxTournaments: subscribedSeasonal,
                maxAttempts: subscribedSeasonal
            }
        }
    };
}

/**
 * 验证限制配置
 */
export function validateLimitConfig(limits: LimitConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查每日限制
    if (limits.daily.maxParticipations < 1) {
        errors.push("每日参与次数必须至少为1");
    }

    // 检查每周限制
    if (limits.weekly.maxParticipations < limits.daily.maxParticipations) {
        errors.push("每周参与次数不能少于每日参与次数");
    }

    // 检查赛季限制
    if (limits.seasonal.maxParticipations < limits.weekly.maxParticipations) {
        errors.push("赛季参与次数不能少于每周参与次数");
    }

    // 检查订阅用户限制
    if (limits.subscribed.daily.maxParticipations < limits.daily.maxParticipations) {
        errors.push("订阅用户每日参与次数不能少于普通用户");
    }

    if (limits.subscribed.weekly.maxParticipations < limits.weekly.maxParticipations) {
        errors.push("订阅用户每周参与次数不能少于普通用户");
    }

    if (limits.subscribed.seasonal.maxParticipations < limits.seasonal.maxParticipations) {
        errors.push("订阅用户赛季参与次数不能少于普通用户");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * 使用示例
 */
export function limitConfigUsageExamples() {
    console.log("=== 限制配置使用示例 ===");

    // 1. 获取每日一次限制配置
    const dailyOnceConfig = getLimitConfig("daily_once");
    console.log("每日一次限制:", dailyOnceConfig.daily.maxParticipations);

    // 2. 获取每周一次限制配置
    const weeklyOnceConfig = getLimitConfig("weekly_once");
    console.log("每周一次限制:", weeklyOnceConfig.weekly.maxParticipations);

    // 3. 获取每赛季一次限制配置
    const seasonalOnceConfig = getLimitConfig("seasonal_once");
    console.log("每赛季一次限制:", seasonalOnceConfig.seasonal.maxParticipations);

    // 4. 创建自定义限制配置
    const customConfig = createCustomLimits({
        daily: 2,
        weekly: 10,
        seasonal: 50,
        subscribedDaily: 3,
        subscribedWeekly: 15,
        subscribedSeasonal: 75
    });
    console.log("自定义限制配置:", customConfig);

    // 5. 验证配置
    const validation = validateLimitConfig(customConfig);
    console.log("配置验证:", validation);

    // 6. 配置应用到锦标赛类型
    const tournamentConfig = {
        typeId: "custom_tournament",
        name: "自定义限制锦标赛",
        limits: customConfig
    };
    console.log("锦标赛配置:", tournamentConfig);
} 