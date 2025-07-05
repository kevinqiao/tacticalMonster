import { internal } from "../../../_generated/api";

/**
 * 锦标赛类型配置使用示例
 */
export class TournamentTypeExamples {

    /**
     * 示例1: 加载所有锦标赛类型配置
     */
    static async loadAllTournamentTypesExample(ctx: any) {
        console.log("=== 加载所有锦标赛类型配置 ===");

        try {
            const result = await ctx.runMutation(
                internal.service.tournament.tournamentDataLoader.loadAllTournamentTypes
            );

            console.log("加载结果:", result);
            return result;
        } catch (error) {
            console.error("加载失败:", error);
            throw error;
        }
    }

    /**
     * 示例2: 按类别加载锦标赛类型
     */
    static async loadByCategoryExample(ctx: any) {
        console.log("=== 按类别加载锦标赛类型 ===");

        const categories = ["daily", "weekly", "monthly", "seasonal", "special", "ranked", "casual", "championship", "tournament"];

        for (const category of categories) {
            try {
                console.log(`加载 ${category} 类别...`);
                const result = await ctx.runMutation(
                    internal.service.tournament.tournamentDataLoader.loadTournamentTypesByCategory,
                    { category }
                );

                console.log(`${category} 类别加载结果:`, result.summary);
            } catch (error) {
                console.error(`${category} 类别加载失败:`, error);
            }
        }
    }

    /**
     * 示例3: 获取锦标赛类型统计
     */
    static async getStatsExample(ctx: any) {
        console.log("=== 获取锦标赛类型统计 ===");

        try {
            const stats = await ctx.runMutation(
                internal.service.tournament.tournamentDataLoader.getTournamentTypeStats
            );

            console.log("锦标赛类型统计:", stats);
            return stats;
        } catch (error) {
            console.error("获取统计失败:", error);
            throw error;
        }
    }

    /**
     * 示例4: 清理并重新加载配置
     */
    static async reloadAllConfigsExample(ctx: any) {
        console.log("=== 清理并重新加载所有配置 ===");

        try {
            // 1. 清理现有配置
            console.log("清理现有配置...");
            await ctx.runMutation(
                internal.service.tournament.tournamentDataLoader.clearAllTournamentTypes
            );

            // 2. 重新加载所有配置
            console.log("重新加载配置...");
            const result = await ctx.runMutation(
                internal.service.tournament.tournamentDataLoader.loadAllTournamentTypes
            );

            console.log("重新加载完成:", result);
            return result;
        } catch (error) {
            console.error("重新加载失败:", error);
            throw error;
        }
    }

    /**
     * 示例5: 测试特定类别的锦标赛创建
     */
    static async testTournamentCreationExample(ctx: any) {
        console.log("=== 测试锦标赛创建 ===");

        const testCases = [
            {
                typeId: "daily_solitaire_challenge",
                uid: "test_user_1",
                gameType: "solitaire",
                description: "测试每日纸牌挑战"
            },
            {
                typeId: "weekly_rummy_masters",
                uid: "test_user_2",
                gameType: "rummy",
                description: "测试每周拉米大师赛"
            },
            {
                typeId: "special_halloween_bonanza",
                uid: "test_user_3",
                gameType: "solitaire",
                description: "测试万圣节特别赛"
            }
        ];

        for (const testCase of testCases) {
            try {
                console.log(`测试创建锦标赛: ${testCase.description}`);

                const result = await ctx.runMutation(
                    internal.service.tournament.tournamentService.joinTournament,
                    {
                        uid: testCase.uid,
                        gameType: testCase.gameType,
                        tournamentType: testCase.typeId
                    }
                );

                console.log(`创建成功:`, result);
            } catch (error) {
                console.error(`创建失败: ${testCase.description}`, error);
            }
        }
    }

    /**
     * 示例6: 验证配置完整性
     */
    static async validateConfigsExample(ctx: any) {
        console.log("=== 验证配置完整性 ===");

        try {
            // 获取所有锦标赛类型
            const allTypes = await ctx.db.query("tournament_types").collect();

            const validationResults = [];

            for (const type of allTypes) {
                const validation = {
                    typeId: type.typeId,
                    category: type.category,
                    isValid: true,
                    errors: [] as string[]
                };

                // 验证必需字段
                if (!type.name) {
                    validation.isValid = false;
                    validation.errors.push("缺少名称");
                }

                if (!type.description) {
                    validation.isValid = false;
                    validation.errors.push("缺少描述");
                }

                if (!type.category) {
                    validation.isValid = false;
                    validation.errors.push("缺少类别");
                }

                if (!type.defaultConfig) {
                    validation.isValid = false;
                    validation.errors.push("缺少默认配置");
                }

                // 验证配置结构
                if (type.defaultConfig) {
                    if (!type.defaultConfig.entryFee) {
                        validation.isValid = false;
                        validation.errors.push("缺少入场费配置");
                    }

                    if (!type.defaultConfig.rules) {
                        validation.isValid = false;
                        validation.errors.push("缺少规则配置");
                    }

                    if (!type.defaultConfig.rewards) {
                        validation.isValid = false;
                        validation.errors.push("缺少奖励配置");
                    }
                }

                validationResults.push(validation);
            }

            const summary = {
                total: validationResults.length,
                valid: validationResults.filter(v => v.isValid).length,
                invalid: validationResults.filter(v => !v.isValid).length,
                results: validationResults
            };

            console.log("验证结果:", summary);
            return summary;
        } catch (error) {
            console.error("验证失败:", error);
            throw error;
        }
    }

    /**
     * 示例7: 按类别展示配置
     */
    static async showConfigsByCategoryExample(ctx: any) {
        console.log("=== 按类别展示配置 ===");

        try {
            const allTypes = await ctx.db.query("tournament_types").collect();

            const configsByCategory: Record<string, any[]> = {};

            for (const type of allTypes) {
                if (!configsByCategory[type.category]) {
                    configsByCategory[type.category] = [];
                }
                configsByCategory[type.category].push({
                    typeId: type.typeId,
                    name: type.name,
                    description: type.description,
                    isActive: type.isActive,
                    gameType: type.defaultConfig?.entryFee?.tickets?.gameType || "unknown"
                });
            }

            for (const [category, configs] of Object.entries(configsByCategory)) {
                console.log(`\n--- ${category.toUpperCase()} 类别 (${configs.length} 个) ---`);
                for (const config of configs) {
                    console.log(`  ${config.typeId}: ${config.name} (${config.gameType})`);
                    console.log(`    描述: ${config.description}`);
                    console.log(`    状态: ${config.isActive ? '活跃' : '非活跃'}`);
                }
            }

            return configsByCategory;
        } catch (error) {
            console.error("展示配置失败:", error);
            throw error;
        }
    }
}

/**
 * 运行所有示例
 */
export async function runAllTournamentTypeExamples(ctx: any) {
    console.log("开始运行锦标赛类型配置示例...\n");

    try {
        // 1. 加载所有配置
        await TournamentTypeExamples.loadAllTournamentTypesExample(ctx);
        console.log("\n");

        // 2. 获取统计信息
        await TournamentTypeExamples.getStatsExample(ctx);
        console.log("\n");

        // 3. 验证配置
        await TournamentTypeExamples.validateConfigsExample(ctx);
        console.log("\n");

        // 4. 按类别展示
        await TournamentTypeExamples.showConfigsByCategoryExample(ctx);
        console.log("\n");

        console.log("所有示例运行完成！");
    } catch (error) {
        console.error("运行示例失败:", error);
        throw error;
    }
}

/**
 * 运行特定示例
 */
export async function runSpecificExample(ctx: any, exampleName: string) {
    console.log(`运行示例: ${exampleName}`);

    switch (exampleName) {
        case "loadAll":
            return await TournamentTypeExamples.loadAllTournamentTypesExample(ctx);
        case "loadByCategory":
            return await TournamentTypeExamples.loadByCategoryExample(ctx);
        case "getStats":
            return await TournamentTypeExamples.getStatsExample(ctx);
        case "reload":
            return await TournamentTypeExamples.reloadAllConfigsExample(ctx);
        case "testCreation":
            return await TournamentTypeExamples.testTournamentCreationExample(ctx);
        case "validate":
            return await TournamentTypeExamples.validateConfigsExample(ctx);
        case "showConfigs":
            return await TournamentTypeExamples.showConfigsByCategoryExample(ctx);
        default:
            throw new Error(`未知示例: ${exampleName}`);
    }
} 