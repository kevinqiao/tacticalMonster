import { TaskTemplate } from "../service/task/taskSystem";

// ============================================================================
// 任务模板配置 - 基于GamePlatformDesign.markdown
// ============================================================================

// 任务类型定义
// - one_time: 一次性任务，完成后永久有效，不能重复完成
// - daily: 每日任务，每天重置
// - weekly: 每周任务，每周重置  
// - seasonal: 赛季任务，每个赛季重置
export type TaskType = "one_time" | "daily" | "weekly" | "seasonal";

// 任务条件类型定义
// - simple: 简单条件，单一目标值
// - conditional: 条件任务，支持AND/OR逻辑组合多个子条件
// - multi_stage: 多阶段任务，按顺序完成多个阶段
// - time_based: 时间任务，在指定时间窗口内完成
export type TaskConditionType = "simple" | "conditional" | "multi_stage" | "time_based";

export const TASK_TEMPLATES: TaskTemplate[] = [
    // ============================================================================
    // 每日任务
    // ============================================================================
    {
        templateId: "daily_login",
        name: "每日登录",
        description: "每日登录游戏即可获得奖励",
        type: "daily",
        category: "gameplay",
        condition: {
            type: "simple",
            action: "login",
            targetValue: 1
        },
        rewards: {
            coins: 10,
            props: [],
            tickets: [],
            seasonPoints: 50,
        },
        resetInterval: "daily",
        isActive: true,
        version: "1.0.0",
        lastUpdated: "2025-08-01T00:00:00.000Z"
    },
    {
        templateId: "daily_chess_3_matches",
        name: "Chess3局",
        description: "在Chess中完成3局游戏",
        type: "daily",
        category: "gameplay",
        gameType: "chess",
        condition: {
            type: "simple",
            action: "complete_match",
            targetValue: 3,
            gameType: "chess"
        },
        rewards: {
            coins: 10,
            props: [],
            tickets: [{ type: "bronze", quantity: 1 }],
            seasonPoints: 50,
        },
        resetInterval: "daily",
        isActive: true,
        version: "1.0.0",
        lastUpdated: "2025-08-01T00:00:00.000Z"
    },
    {
        templateId: "daily_rummy_score_100",
        name: "Rummy得分100",
        description: "在Rummy中获得100分",
        type: "daily",
        category: "gameplay",
        gameType: "rummy",
        condition: {
            type: "simple",
            action: "score_points",
            targetValue: 100,
            gameType: "rummy"
        },
        rewards: {
            coins: 10,
            props: [],
            tickets: [],
            seasonPoints: 50,
        },
        resetInterval: "daily",
        isActive: true,
        version: "1.0.0",
        lastUpdated: "2025-08-01T00:00:00.000Z"
    },
    {
        templateId: "daily_prop_match_3_wins",
        name: "道具对局3胜",
        description: "在道具对局中获得3次胜利",
        type: "daily",
        category: "gameplay",
        condition: {
            type: "simple",
            action: "win_match",
            targetValue: 3
        },
        rewards: {
            coins: 0,
            props: [{ gameType: "chess", propType: "undo_move", quantity: 1 }],
            tickets: [],
            seasonPoints: 75,
        },
        resetInterval: "daily",
        isActive: true,
        version: "1.0.0",
        lastUpdated: "2025-08-01T00:00:00.000Z"
    },
    {
        templateId: "daily_tournament_participant",
        name: "锦标赛参与者",
        description: "参与任意锦标赛",
        type: "daily",
        category: "tournament",
        condition: {
            type: "simple",
            action: "tournament_join",
            targetValue: 1
        },
        rewards: {
            coins: 0,
            props: [],
            tickets: [{ type: "bronze", quantity: 1 }],
            seasonPoints: 15,
        },
        resetInterval: "daily",
        isActive: true,
        version: "1.0.0",
        lastUpdated: "2025-08-01T00:00:00.000Z"
    },

    // ============================================================================
    // 每周任务
    // ============================================================================
    {
        templateId: "weekly_solitaire_master",
        name: "Solitaire大师",
        description: "在Solitaire游戏中完成10局游戏",
        type: "weekly",
        category: "gameplay",
        gameType: "solitaire",
        condition: {
            type: "simple",
            action: "complete_match",
            targetValue: 10,
            gameType: "solitaire"
        },
        rewards: {
            coins: 200,
            props: [
                {
                    gameType: "solitaire",
                    propType: "hint_card",
                    quantity: 5
                }
            ],
            tickets: [
                {
                    type: "silver",
                    quantity: 2
                }
            ],
            seasonPoints: 50,
        },
        resetInterval: "weekly",
        isActive: true,
        version: "1.0.0",
        lastUpdated: "2025-08-01T00:00:00.000Z"
    },
    {
        templateId: "weekly_prop_collector",
        name: "道具收集者",
        description: "使用10个道具",
        type: "weekly",
        category: "collection",
        condition: {
            type: "simple",
            action: "use_prop",
            targetValue: 10
        },
        rewards: {
            coins: 300,
            props: [
                {
                    gameType: "chess",
                    propType: "undo_move",
                    quantity: 1
                },
                {
                    gameType: "solitaire",
                    propType: "hint_card",
                    quantity: 1
                }
            ],
            tickets: [],
            seasonPoints: 40,
        },
        resetInterval: "weekly",
        isActive: true,
        version: "1.0.0",
        lastUpdated: "2025-08-01T00:00:00.000Z"
    },
    {
        templateId: "time_based_weekly_challenge",
        name: "一周挑战",
        description: "在一周内完成多个目标",
        type: "weekly",
        category: "challenge",
        condition: {
            type: "time_based",
            action: "complete_match",
            targetValue: 4,
            withinDays: 7
        },
        rewards: {
            coins: 400,
            props: [
                {
                    gameType: "chess",
                    propType: "undo_move",
                    quantity: 1
                },
                {
                    gameType: "solitaire",
                    propType: "hint_card",
                    quantity: 1
                }
            ],
            tickets: [
                {
                    type: "bronze",
                    quantity: 3
                },
                {
                    type: "silver",
                    quantity: 3
                }
            ],
            seasonPoints: 75,
        },
        resetInterval: "weekly",
        isActive: true,
        version: "1.0.0",
        lastUpdated: "2025-08-01T00:00:00.000Z"
    },

    // ============================================================================
    // 一次性任务
    // ============================================================================
    {
        templateId: "multi_stage_tournament_champion",
        name: "锦标赛冠军之路",
        description: "完成多阶段锦标赛挑战",
        type: "one_time",
        category: "tournament",
        condition: {
            type: "multi_stage",
            stages: [
                {
                    action: "tournament_join",
                    targetValue: 1,
                    reward: {
                        coins: 50,
                        seasonPoints: 10
                    }
                },
                {
                    action: "win_match",
                    targetValue: 3,
                    reward: {
                        coins: 100,
                        seasonPoints: 20
                    }
                },
                {
                    action: "complete_match",
                    targetValue: 5,
                    reward: {
                        coins: 200,
                        seasonPoints: 50
                    }
                }
            ]
        },
        rewards: {
            coins: 500,
            props: [
                {
                    gameType: "chess",
                    propType: "undo_move",
                    quantity: 1
                }
            ],
            tickets: [
                {
                    type: "bronze",
                    quantity: 1
                }
            ],
            seasonPoints: 150,
        },
        isActive: true,
        version: "1.0.0",
        lastUpdated: "2025-08-01T00:00:00.000Z"
    },
    {
        templateId: "conditional_social_achiever",
        name: "社交达人",
        description: "完成社交任务组合",
        type: "one_time",
        category: "social",
        condition: {
            type: "conditional",
            logic: "or",
            subConditions: [
                {
                    type: "simple",
                    action: "invite_friend",
                    targetValue: 3
                },
                {
                    type: "simple",
                    action: "share_game",
                    targetValue: 5
                },
                {
                    type: "simple",
                    action: "join_clan",
                    targetValue: 1
                }
            ]
        },
        rewards: {
            coins: 150,
            props: [
                {
                    gameType: "chess",
                    propType: "undo_move",
                    quantity: 1
                }
            ],
            tickets: [],
            seasonPoints: 30,
        },
        isActive: true,
        version: "1.0.0",
        lastUpdated: "2025-08-01T00:00:00.000Z"
    },
    {
        templateId: "consecutive_login_7",
        name: "连续登录7天",
        description: "连续登录游戏7天",
        type: "one_time",
        category: "challenge",
        condition: {
            type: "time_based",
            action: "login",
            targetValue: 7,
            consecutive: true
        },
        rewards: {
            coins: 500,
            props: [
                {
                    gameType: "chess",
                    propType: "undo_move",
                    quantity: 1
                },
                {
                    gameType: "solitaire",
                    propType: "hint_card",
                    quantity: 3
                }
            ],
            tickets: [
                {
                    type: "silver",
                    quantity: 1
                }
            ],
            seasonPoints: 100,
        },
        isActive: true,
        version: "1.0.0",
        lastUpdated: "2025-08-01T00:00:00.000Z"
    },
    {
        templateId: "achievement_unlocker",
        name: "成就解锁者",
        description: "解锁任意成就",
        type: "one_time",
        category: "achievement",
        condition: {
            type: "simple",
            action: "unlock_achievement",
            targetValue: 1
        },
        rewards: {
            coins: 200,
            props: [
                {
                    gameType: "chess",
                    propType: "undo_move",
                    quantity: 1
                }
            ],
            tickets: [],
            seasonPoints: 25,
        },
        isActive: true,
        version: "1.0.0",
        lastUpdated: "2025-08-01T00:00:00.000Z"
    },

    // ============================================================================
    // 赛季任务
    // ============================================================================
    {
        templateId: "seasonal_gold_promotion",
        name: "黄金段位晋升",
        description: "晋升到黄金段位",
        type: "seasonal",
        category: "achievement",
        condition: {
            type: "simple",
            action: "reach_segment",
            targetValue: 1
        },
        rewards: {
            coins: 1000,
            props: [
                {
                    gameType: "chess",
                    propType: "undo_move",
                    quantity: 1
                },
                {
                    gameType: "solitaire",
                    propType: "hint_card",
                    quantity: 1
                }
            ],
            tickets: [
                {
                    type: "gold",
                    quantity: 3
                }
            ],
            seasonPoints: 200,
        },
        isActive: true,
        allocationRules: {
            segmentName: [
                "bronze",
                "silver"
            ]
        },
        version: "1.0.0",
        lastUpdated: "2025-08-01T00:00:00.000Z"
    },
    {
        templateId: "seasonal_tournament_champion",
        name: "赛季锦标赛冠军",
        description: "在赛季锦标赛中获得前10%",
        type: "seasonal",
        category: "tournament",
        condition: {
            type: "simple",
            action: "tournament_top_10_percent",
            targetValue: 1
        },
        rewards: {
            coins: 500,
            props: [
                {
                    gameType: "chess",
                    propType: "undo_move",
                    quantity: 2
                }
            ],
            tickets: [
                {
                    type: "gold",
                    quantity: 1
                }
            ],
            seasonPoints: 500,
        },
        isActive: true,
        version: "1.0.0",
        lastUpdated: "2025-08-01T00:00:00.000Z"
    },

    // ============================================================================
    // Chess首周特殊任务
    // ============================================================================
    {
        templateId: "chess_first_week_login",
        name: "Chess首周登录",
        description: "Chess首周每日登录奖励",
        type: "daily",
        category: "gameplay",
        condition: {
            type: "simple",
            action: "login",
            targetValue: 1
        },
        rewards: {
            coins: 0,
            props: [
                {
                    gameType: "chess",
                    propType: "undo_move",
                    quantity: 1
                }
            ],
            tickets: [{ type: "bronze", quantity: 1 }],
            seasonPoints: 100,
        },
        resetInterval: "daily",
        isActive: true,
        allocationRules: {
            gamePreferences: ["chess"]
        },
        version: "1.0.0",
        lastUpdated: "2025-08-01T00:00:00.000Z"
    },
    {
        templateId: "chess_first_week_prop_task",
        name: "Chess首周道具任务",
        description: "Chess首周道具对局任务",
        type: "daily",
        category: "gameplay",
        condition: {
            type: "simple",
            action: "win_match",
            targetValue: 3
        },
        rewards: {
            coins: 0,
            props: [
                {
                    gameType: "chess",
                    propType: "undo_move",
                    quantity: 2
                }
            ],
            tickets: [],
            seasonPoints: 150,
        },
        resetInterval: "daily",
        isActive: true,
        allocationRules: {
            gamePreferences: ["chess"]
        },
        version: "1.0.0",
        lastUpdated: "2025-08-01T00:00:00.000Z"
    }
];

// ============================================================================
// 任务模板分类
// ============================================================================

export const TASK_TEMPLATES_BY_TYPE = {
    one_time: TASK_TEMPLATES.filter(template => template.type === "one_time"),
    daily: TASK_TEMPLATES.filter(template => template.type === "daily"),
    weekly: TASK_TEMPLATES.filter(template => template.type === "weekly"),
    seasonal: TASK_TEMPLATES.filter(template => template.type === "seasonal")
};

export const TASK_TEMPLATES_BY_CATEGORY = {
    gameplay: TASK_TEMPLATES.filter(template => template.category === "gameplay"),
    social: TASK_TEMPLATES.filter(template => template.category === "social"),
    collection: TASK_TEMPLATES.filter(template => template.category === "collection"),
    challenge: TASK_TEMPLATES.filter(template => template.category === "challenge"),
    tournament: TASK_TEMPLATES.filter(template => template.category === "tournament"),
    achievement: TASK_TEMPLATES.filter(template => template.category === "achievement")
};

// ============================================================================
// 任务模板工具函数
// ============================================================================

/**
 * 根据模板ID获取任务模板
 */
export function getTaskTemplateById(templateId: string): TaskTemplate | undefined {
    return TASK_TEMPLATES.find(template => template.templateId === templateId);
}

/**
 * 根据类型获取任务模板
 */
export function getTaskTemplatesByType(type: TaskType): TaskTemplate[] {
    return TASK_TEMPLATES.filter(template => template.type === type);
}

/**
 * 根据分类获取任务模板
 */
export function getTaskTemplatesByCategory(category: string): TaskTemplate[] {
    return TASK_TEMPLATES.filter(template => template.category === category);
}

/**
 * 根据游戏类型获取任务模板
 */
export function getTaskTemplatesByGameType(gameType: string): TaskTemplate[] {
    return TASK_TEMPLATES.filter(template =>
        template.gameType === gameType || !template.gameType
    );
}

/**
 * 获取活跃的任务模板
 */
export function getActiveTaskTemplates(): TaskTemplate[] {
    return TASK_TEMPLATES.filter(template => template.isActive);
}

/**
 * 获取所有任务模板ID
 */
export function getAllTaskTemplateIds(): string[] {
    return TASK_TEMPLATES.map(template => template.templateId);
}

/**
 * 获取Chess首周任务模板
 */
export function getChessFirstWeekTasks(): TaskTemplate[] {
    return TASK_TEMPLATES.filter(template =>
        template.templateId.includes("chess_first_week")
    );
}

/**
 * 验证任务模板配置
 */
export function validateTaskTemplates(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    TASK_TEMPLATES.forEach((template, index) => {
        // 检查必需字段
        if (!template.templateId) {
            errors.push(`模板 ${index}: 缺少 templateId`);
        }
        if (!template.name) {
            errors.push(`模板 ${index}: 缺少 name`);
        }
        if (!template.description) {
            errors.push(`模板 ${index}: 缺少 description`);
        }
        if (!template.type) {
            errors.push(`模板 ${index}: 缺少 type`);
        }
        if (!template.category) {
            errors.push(`模板 ${index}: 缺少 category`);
        }
        if (!template.condition) {
            errors.push(`模板 ${index}: 缺少 condition`);
        }
        if (!template.rewards) {
            errors.push(`模板 ${index}: 缺少 rewards`);
        }

        // 检查任务类型是否有效
        const validTaskTypes: TaskType[] = ["one_time", "daily", "weekly", "seasonal"];
        if (!validTaskTypes.includes(template.type as TaskType)) {
            errors.push(`模板 ${template.templateId}: 无效的任务类型 ${template.type}`);
        }

        // 检查条件配置
        if (template.condition) {
            const validConditionTypes: TaskConditionType[] = ["simple", "conditional", "multi_stage", "time_based"];
            if (!validConditionTypes.includes(template.condition.type as TaskConditionType)) {
                errors.push(`模板 ${template.templateId}: 无效的条件类型 ${template.condition.type}`);
            }
            if (!template.condition.action) {
                errors.push(`模板 ${template.templateId}: 条件缺少 action`);
            }
            if (template.condition.targetValue === undefined) {
                errors.push(`模板 ${template.templateId}: 条件缺少 targetValue`);
            }
        }

        // 检查奖励配置
        if (template.rewards) {
            if (template.rewards.coins === undefined) {
                errors.push(`模板 ${template.templateId}: 奖励缺少 coins`);
            }
            if (template.rewards.seasonPoints === undefined) {
                errors.push(`模板 ${template.templateId}: 奖励缺少 seasonPoints`);
            }
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

// ============================================================================
// 默认导出
// ============================================================================

export default TASK_TEMPLATES; 