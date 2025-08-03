import { TaskTemplate } from "../service/task/taskSystem";

// ============================================================================
// 任务模板配置 - TypeScript 格式
// ============================================================================

export const TASK_TEMPLATES: TaskTemplate[] = [
    {
        templateId: "daily_login",
        name: "每日登录",
        description: "每日登录游戏即可获得奖励",
        type: "daily",
        category: "gameplay",
        condition: {
            type: "simple",
            action: "login",
            targetValue: 2
        },
        rewards: {
            coins: 50,
            props: [],
            tickets: [],
            seasonPoints: 10,
            // gamePoints: {
            //     general: 20
            // }
        },
        resetInterval: "daily",
        isActive: true,
        version: "1.0.0",
        lastUpdated: "2024-01-01T00:00:00.000Z"
    },
    // {
    //     templateId: "daily_win_3_matches",
    //     name: "连胜三局",
    //     description: "在任意游戏中连续获胜3局",
    //     type: "daily",
    //     category: "gameplay",
    //     condition: {
    //         type: "simple",
    //         action: "win_match",
    //         targetValue: 3
    //     },
    //     rewards: {
    //         coins: 100,
    //         props: [
    //             {
    //                 gameType: "ludo",
    //                 propType: "dice_boost",
    //                 quantity: 2
    //             }
    //         ],
    //         tickets: [
    //             {
    //                 gameType: "ludo",
    //                 tournamentType: "daily",
    //                 quantity: 1
    //             }
    //         ],
    //         seasonPoints: 25,
    //         gamePoints: {
    //             general: 50
    //         }
    //     },
    //     resetInterval: "daily",
    //     isActive: true,
    //     version: "1.0.0",
    //     lastUpdated: "2024-01-01T00:00:00.000Z"
    // },
    // {
    //     templateId: "weekly_solitaire_master",
    //     name: "Solitaire大师",
    //     description: "在Solitaire游戏中完成10局游戏",
    //     type: "weekly",
    //     category: "gameplay",
    //     gameType: "solitaire",
    //     condition: {
    //         type: "simple",
    //         action: "complete_match",
    //         targetValue: 10,
    //         gameType: "solitaire"
    //     },
    //     rewards: {
    //         coins: 200,
    //         props: [
    //             {
    //                 gameType: "solitaire",
    //                 propType: "hint_card",
    //                 quantity: 5
    //             }
    //         ],
    //         tickets: [
    //             {
    //                 gameType: "solitaire",
    //                 tournamentType: "weekly",
    //                 quantity: 2
    //             }
    //         ],
    //         seasonPoints: 50,
    //         gamePoints: {
    //             general: 100,
    //             specific: {
    //                 gameType: "solitaire",
    //                 points: 50
    //             }
    //         }
    //     },
    //     resetInterval: "weekly",
    //     isActive: true,
    //     version: "1.0.0",
    //     lastUpdated: "2024-01-01T00:00:00.000Z"
    // },
    // {
    //     templateId: "consecutive_login_7",
    //     name: "连续登录7天",
    //     description: "连续登录游戏7天",
    //     type: "one_time",
    //     category: "challenge",
    //     condition: {
    //         type: "time_based",
    //         action: "login",
    //         targetValue: 7,
    //         consecutive: true
    //     },
    //     rewards: {
    //         coins: 500,
    //         props: [
    //             {
    //                 gameType: "ludo",
    //                 propType: "golden_dice",
    //                 quantity: 1
    //             },
    //             {
    //                 gameType: "solitaire",
    //                 propType: "premium_hint",
    //                 quantity: 3
    //             }
    //         ],
    //         tickets: [
    //             {
    //                 gameType: "ludo",
    //                 tournamentType: "elite",
    //                 quantity: 1
    //             },
    //             {
    //                 gameType: "solitaire",
    //                 tournamentType: "elite",
    //                 quantity: 1
    //             }
    //         ],
    //         seasonPoints: 100,
    //         gamePoints: {
    //             general: 200
    //         }
    //     },
    //     isActive: true,
    //     version: "1.0.0",
    //     lastUpdated: "2024-01-01T00:00:00.000Z"
    // },
    {
        templateId: "multi_stage_tournament_champion",
        name: "锦标赛冠军之路",
        description: "完成多阶段锦标赛挑战",
        type: "multi_stage",
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
                    gameType: "ludo",
                    propType: "tournament_boost",
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
        lastUpdated: "2024-01-01T00:00:00.000Z"
    },
    {
        templateId: "conditional_social_achiever",
        name: "社交达人",
        description: "完成社交任务组合",
        type: "conditional",
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
                    gameType: "ludo",
                    propType: "social_boost",
                    quantity: 1
                }
            ],
            tickets: [],
            seasonPoints: 30,
        },
        isActive: true,
        version: "1.0.0",
        lastUpdated: "2024-01-01T00:00:00.000Z"
    },
    // {
    //     templateId: "season_gold_promotion",
    //     name: "黄金段位晋升",
    //     description: "晋升到黄金段位",
    //     type: "season",
    //     category: "achievement",
    //     condition: {
    //         type: "simple",
    //         action: "reach_segment",
    //         targetValue: 1
    //     },
    //     rewards: {
    //         coins: 1000,
    //         props: [
    //             {
    //                 gameType: "ludo",
    //                 propType: "golden_frame",
    //                 quantity: 1
    //             },
    //             {
    //                 gameType: "solitaire",
    //                 propType: "golden_theme",
    //                 quantity: 1
    //             }
    //         ],
    //         tickets: [
    //             {
    //                 gameType: "ludo",
    //                 tournamentType: "elite",
    //                 quantity: 3
    //             },
    //             {
    //                 gameType: "solitaire",
    //                 tournamentType: "elite",
    //                 quantity: 3
    //             }
    //         ],
    //         seasonPoints: 200,
    //         gamePoints: {
    //             general: 400
    //         }
    //     },
    //     isActive: true,
    //     allocationRules: {
    //         segmentName: [
    //             "bronze",
    //             "silver"
    //         ]
    //     },
    //     version: "1.0.0",
    //     lastUpdated: "2024-01-01T00:00:00.000Z"
    // },
    // {
    //     templateId: "weekly_prop_collector",
    //     name: "道具收集者",
    //     description: "使用10个道具",
    //     type: "weekly",
    //     category: "collection",
    //     condition: {
    //         type: "simple",
    //         action: "use_prop",
    //         targetValue: 10
    //     },
    //     rewards: {
    //         coins: 300,
    //         props: [
    //             {
    //                 gameType: "ludo",
    //                 propType: "prop_chest",
    //                 quantity: 1
    //             },
    //             {
    //                 gameType: "solitaire",
    //                 propType: "prop_chest",
    //                 quantity: 1
    //             }
    //         ],
    //         tickets: [],
    //         seasonPoints: 40,
    //         gamePoints: {
    //             general: 80
    //         }
    //     },
    //     resetInterval: "weekly",
    //     isActive: true,
    //     version: "1.0.0",
    //     lastUpdated: "2024-01-01T00:00:00.000Z"
    // },
    // {
    //     templateId: "daily_tournament_participant",
    //     name: "锦标赛参与者",
    //     description: "参与任意锦标赛",
    //     type: "daily",
    //     category: "tournament",
    //     condition: {
    //         type: "simple",
    //         action: "tournament_join",
    //         targetValue: 1
    //     },
    //     rewards: {
    //         coins: 75,
    //         props: [],
    //         tickets: [
    //             {
    //                 gameType: "ludo",
    //                 tournamentType: "daily",
    //                 quantity: 1
    //             }
    //         ],
    //         seasonPoints: 15,
    //         gamePoints: {
    //             general: 30
    //         }
    //     },
    //     resetInterval: "daily",
    //     isActive: true,
    //     version: "1.0.0",
    //     lastUpdated: "2024-01-01T00:00:00.000Z"
    // },
    // {
    //     templateId: "achievement_unlocker",
    //     name: "成就解锁者",
    //     description: "解锁任意成就",
    //     type: "one_time",
    //     category: "achievement",
    //     condition: {
    //         type: "simple",
    //         action: "unlock_achievement",
    //         targetValue: 1
    //     },
    //     rewards: {
    //         coins: 200,
    //         props: [
    //             {
    //                 gameType: "ludo",
    //                 propType: "achievement_badge",
    //                 quantity: 1
    //             }
    //         ],
    //         tickets: [],
    //         seasonPoints: 25,
    //         gamePoints: {
    //             general: 50
    //         }
    //     },
    //     isActive: true,
    //     version: "1.0.0",
    //     lastUpdated: "2024-01-01T00:00:00.000Z"
    // },
    // {
    //     templateId: "premium_subscriber_bonus",
    //     name: "订阅者专属奖励",
    //     description: "订阅者每日额外奖励",
    //     type: "daily",
    //     category: "challenge",
    //     condition: {
    //         type: "simple",
    //         action: "login",
    //         targetValue: 1
    //     },
    //     rewards: {
    //         coins: 100,
    //         props: [
    //             {
    //                 gameType: "ludo",
    //                 propType: "premium_boost",
    //                 quantity: 1
    //             },
    //             {
    //                 gameType: "solitaire",
    //                 propType: "premium_hint",
    //                 quantity: 2
    //             }
    //         ],
    //         tickets: [
    //             {
    //                 gameType: "ludo",
    //                 tournamentType: "daily",
    //                 quantity: 2
    //             },
    //             {
    //                 gameType: "solitaire",
    //                 tournamentType: "daily",
    //                 quantity: 2
    //             }
    //         ],
    //         seasonPoints: 20,
    //         gamePoints: {
    //             general: 40
    //         }
    //     },
    //     resetInterval: "daily",
    //     isActive: true,
    //     allocationRules: {
    //         subscriptionRequired: true
    //     },
    //     version: "1.0.0",
    //     lastUpdated: "2024-01-01T00:00:00.000Z"
    // },
    {
        templateId: "time_based_weekly_challenge",
        name: "一周挑战",
        description: "在一周内完成多个目标",
        type: "time_based",
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
                    gameType: "ludo",
                    propType: "weekly_chest",
                    quantity: 1
                },
                {
                    gameType: "solitaire",
                    propType: "weekly_chest",
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
        lastUpdated: "2024-01-01T00:00:00.000Z"
    }
];

// ============================================================================
// 任务模板分类
// ============================================================================

export const TASK_TEMPLATES_BY_TYPE = {
    daily: TASK_TEMPLATES.filter(template => template.type === "daily"),
    weekly: TASK_TEMPLATES.filter(template => template.type === "weekly"),
    monthly: TASK_TEMPLATES.filter(template => template.type === "monthly"),
    one_time: TASK_TEMPLATES.filter(template => template.type === "one_time"),
    achievement: TASK_TEMPLATES.filter(template => template.type === "achievement"),
    season: TASK_TEMPLATES.filter(template => template.type === "season"),
    multi_stage: TASK_TEMPLATES.filter(template => template.type === "multi_stage"),
    conditional: TASK_TEMPLATES.filter(template => template.type === "conditional"),
    time_based: TASK_TEMPLATES.filter(template => template.type === "time_based")
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
export function getTaskTemplatesByType(type: string): TaskTemplate[] {
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

        // 检查条件配置
        if (template.condition) {
            if (!template.condition.type) {
                errors.push(`模板 ${template.templateId}: 条件缺少 type`);
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
            // if (!template.rewards.gamePoints) {
            //     errors.push(`模板 ${template.templateId}: 奖励缺少 gamePoints`);
            // }
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