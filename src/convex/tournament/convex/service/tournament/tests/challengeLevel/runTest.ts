/**
 * 挑战关卡测试数据运行入口（Tournament模块）
 * 提供公开的mutation/action，可以在Convex Dashboard中直接调用
 */

import { v } from "convex/values";
import { internal } from "../../../../_generated/api";
import { action, mutation } from "../../../../_generated/server";
import { validateTestDataImpl } from "./validateTestData";

/**
 * 获取 TacticalMonster 模块的 URL
 */
function getTacticalMonsterUrl(): string {
    // 从环境变量获取，如果没有则使用默认值
    // 注意：实际部署时需要配置正确的 URL
    return process.env.TACTICAL_MONSTER_URL || "https://shocking-leopard-487.convex.site";
}

/**
 * 创建挑战关卡测试数据（公开action，支持HTTP调用）
 * 可以在Convex Dashboard中直接调用
 */
export const setupChallengeLevelTestData = action({
    args: {},
    handler: async (ctx): Promise<{
        success: boolean;
        data: any;
        validation: any;
    }> => {
        console.log("==========================================");
        console.log("[setupChallengeLevelTestData] 开始创建测试数据");
        console.log("==========================================");

        try {
            // 1. 调用内部mutation创建Tournament模块数据
            const result = await ctx.runMutation(
                internal.service.tournament.tests.challengeLevel.setupTestData.setupChallengeLevelTestData,
                {}
            );

            console.log("\n✅ Tournament模块测试数据创建成功:");
            console.log(JSON.stringify(result.tournament, null, 2));

            // 2. 通过HTTP调用TacticalMonster模块创建游戏数据
            let gameData: any = null;
            try {
                console.log("\n[步骤2] 调用TacticalMonster模块创建游戏数据...");
                const tacticalMonsterUrl = getTacticalMonsterUrl();
                const endpointUrl = `${tacticalMonsterUrl}/setupGameTestData`;
                console.log(`调用URL: ${endpointUrl}`);
                console.log(`请求参数: ${JSON.stringify({
                    playerIds: result.tournament.playerIds,
                    tier: "bronze",
                    bossId: "boss_bronze_1",
                })}`);

                const response = await fetch(endpointUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        playerIds: result.tournament.playerIds,
                        tier: "bronze",
                        bossId: "boss_bronze_1",
                    }),
                });

                console.log(`HTTP响应状态: ${response.status} ${response.statusText}`);

                if (!response.ok) {
                    const errorText = await response.text().catch(() => "无法读取错误信息");
                    let errorData: any = {};
                    try {
                        errorData = JSON.parse(errorText);
                    } catch {
                        // 如果不是JSON，使用原始文本
                    }
                    throw new Error(
                        errorData.message ||
                        `HTTP ${response.status}: ${response.statusText}. 响应: ${errorText.substring(0, 200)}`
                    );
                }

                const httpResult = await response.json();
                if (!httpResult.success) {
                    throw new Error(httpResult.message || "设置游戏测试数据失败");
                }

                gameData = httpResult.data;
                console.log("✅ TacticalMonster模块游戏数据创建成功");
                result.tacticalMonster = gameData;
            } catch (error: any) {
                // 如果HTTP调用失败，记录警告但不中断流程
                console.warn(
                    `⚠️  无法通过HTTP调用TacticalMonster模块创建游戏测试数据: ${error.message}`
                );
                console.warn(
                    "\n故障排除提示:"
                );
                console.warn(
                    "  1. 检查 TACTICAL_MONSTER_URL 环境变量是否正确配置"
                );
                console.warn(
                    `  2. 当前使用的URL: ${getTacticalMonsterUrl()}`
                );
                console.warn(
                    "  3. 确认TacticalMonster模块已部署且HTTP endpoint可访问"
                );
                console.warn(
                    "  4. HTTP endpoint路径应该是: /setupGameTestData"
                );
                console.warn(
                    "  5. 可以手动调用: TacticalMonster模块的 /setupGameTestData endpoint"
                );
            }

            // 3. 执行验证
            console.log("\n==========================================");
            console.log("[验证测试数据]");
            console.log("==========================================");

            // 验证需要mutation context，通过runMutation调用验证
            const validation = await ctx.runMutation(
                internal.service.tournament.tests.challengeLevel.validateTestData.validateTestData,
                {
                    playerIds: result.tournament.playerIds,
                    tournamentTypeId: result.tournament.tournamentTypeId,
                }
            );

            if (validation.valid) {
                console.log("✅ 数据验证通过");
            } else {
                console.log("❌ 数据验证失败:");
                validation.errors.forEach((err: string) => console.error(`  - ${err}`));
            }

            if (validation.warnings.length > 0) {
                console.log("⚠️  警告:");
                validation.warnings.forEach((warn: string) => console.warn(`  - ${warn}`));
            }

            return {
                success: true,
                data: result,
                validation,
            };
        } catch (error: any) {
            console.error("❌ 创建测试数据失败:", error.message);
            throw error;
        }
    },
});

/**
 * 验证测试数据（公开mutation）
 */
export const validateChallengeLevelTestData = mutation({
    args: {
        playerIds: v.optional(v.array(v.string())),
        tournamentTypeId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const playerIds = args.playerIds || [
            "test_player_bronze",
            "test_player_silver",
            "test_player_gold",
        ];
        const tournamentTypeId =
            args.tournamentTypeId || "monster_rumble_challenge_bronze_boss_1";

        console.log("==========================================");
        console.log("[validateChallengeLevelTestData] 开始验证");
        console.log("==========================================");

        const validation = await validateTestDataImpl(
            ctx,
            playerIds,
            tournamentTypeId
        );

        if (validation.valid) {
            console.log("✅ 数据验证通过");
        } else {
            console.log("❌ 数据验证失败:");
            validation.errors.forEach((err: string) => console.error(`  - ${err}`));
        }

        if (validation.warnings.length > 0) {
            console.log("⚠️  警告:");
            validation.warnings.forEach((warn: string) => console.warn(`  - ${warn}`));
        }

        return validation;
    },
});

