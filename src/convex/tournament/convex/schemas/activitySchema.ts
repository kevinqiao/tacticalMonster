import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * 活动系统Schema定义
 */
export const activitySchema = {
    // 活动模板表
    activity_templates: defineTable({
        activityId: v.string(),
        name: v.string(),
        description: v.string(),
        type: v.union(
            v.literal("login"),
            v.literal("limited_time"),
            v.literal("progress"),
            v.literal("recharge")
        ),
        category: v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("event"),
            v.literal("seasonal")
        ),
        startDate: v.string(),
        endDate: v.string(),
        isActive: v.boolean(),
        priority: v.number(), // 优先级，数字越大优先级越高
        icon: v.optional(v.string()), // 活动图标URL
        banner: v.optional(v.string()), // 活动横幅URL
        seasonId: v.optional(v.string()), // 赛季ID（仅seasonal类型使用，关联Battle Pass赛季）
        rules: v.any(), // 活动规则配置（JSON），可包含shopDiscount等商店相关配置
        rewards: v.optional(v.array(v.any())), // 奖励配置（JSON数组）
        requirements: v.optional(v.any()), // 参与条件（可选）
        shopIds: v.optional(v.array(v.string())), // 关联的商店ID列表（可选）
        shopDiscount: v.optional(v.number()), // 商店折扣率（0-100，可选，也可在rules.shopDiscount中配置）
        resetInterval: v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("monthly"),
            v.literal("none")
        ),
        maxCompletions: v.number(), // 最大完成次数（-1表示无限制）
        createdAt: v.string(),
        updatedAt: v.string(),
    })
        .index("by_activityId", ["activityId"])
        .index("by_type", ["type"])
        .index("by_category", ["category"])
        .index("by_active", ["isActive"])
        .index("by_dates", ["startDate", "endDate"])
        .index("by_priority", ["priority"])
        .index("by_season", ["seasonId"])
        .index("by_category_season", ["category", "seasonId"]),

    // 玩家活动进度表
    player_activity_progress: defineTable({
        uid: v.string(),
        activityId: v.string(),
        progress: v.any(), // 进度数据（JSON）
        completedMilestones: v.array(v.string()), // 已完成的里程碑ID数组
        claimedRewards: v.array(v.string()), // 已领取的奖励ID数组
        lastUpdate: v.string(), // 最后更新时间
        startDate: v.string(), // 开始参与时间
        endDate: v.optional(v.string()), // 结束时间（如果活动已结束）
        status: v.union(
            v.literal("active"),
            v.literal("completed"),
            v.literal("expired"),
            v.literal("claimed")
        ),
        createdAt: v.string(),
        updatedAt: v.string(),
    })
        .index("by_uid", ["uid"])
        .index("by_activityId", ["activityId"])
        .index("by_uid_activityId", ["uid", "activityId"])
        .index("by_status", ["status"])
        .index("by_uid_status", ["uid", "status"]),

    // 活动奖励配置表（可选，用于复杂奖励结构）
    activity_rewards: defineTable({
        rewardId: v.string(),
        activityId: v.string(),
        milestone: v.string(), // 里程碑标识（如"day_1", "day_7", "tier_1"等）
        rewards: v.any(), // 奖励内容（UnifiedRewards格式）
        conditions: v.optional(v.any()), // 领取条件（可选）
        createdAt: v.string(),
        updatedAt: v.string(),
    })
        .index("by_rewardId", ["rewardId"])
        .index("by_activityId", ["activityId"])
        .index("by_activityId_milestone", ["activityId", "milestone"]),
};

