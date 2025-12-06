/**
 * Battle Pass 系统集成测试
 * 测试积分添加、等级升级、奖励领取、Premium Pass 等流程
 */

import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";
import { BattlePassSystem } from "../../battlePassSystem";
import { EXPECTED_REWARDS_BY_LEVEL, TEST_SEASON_POINTS_SOURCES } from "../testData";

/**
 * 测试：初始化玩家 Battle Pass
 */
export const testInitializeBattlePass = internalMutation({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, args) => {
        console.log("==========================================");
        console.log(`[testInitializeBattlePass] 开始测试 Battle Pass 初始化`);
        console.log(`玩家 UID: ${args.uid}`);
        console.log("==========================================");

        const { uid } = args;
        const errors: string[] = [];
        const steps: string[] = [];

        try {
            // 步骤1: 初始化 Battle Pass
            console.log("\n[步骤1] 初始化 Battle Pass...");
            steps.push("步骤1: 初始化 Battle Pass");
            const battlePass = await BattlePassSystem.initializePlayerBattlePass(ctx, uid);
            steps.push(`✓ Battle Pass 初始化成功，等级: ${battlePass.currentLevel}`);
            console.log(`✓ Battle Pass 初始化成功，等级: ${battlePass.currentLevel}`);

            // 步骤2: 验证 Battle Pass 记录
            console.log("\n[步骤2] 验证 Battle Pass 记录...");
            steps.push("步骤2: 验证 Battle Pass 记录");
            const record = await BattlePassSystem.getPlayerBattlePass(ctx, uid);
            if (!record) {
                console.error("❌ Battle Pass 记录不存在");
                errors.push("Battle Pass 记录不存在");
            } else {
                console.log(`Battle Pass 记录:`, {
                    level: record.currentLevel,
                    points: record.currentSeasonPoints,
                    isPremium: record.isPremium,
                });
                if (record.currentLevel !== 1) {
                    console.error(`❌ 初始等级不正确，期望 1，实际 ${record.currentLevel}`);
                    errors.push(`初始等级不正确，期望 1，实际 ${record.currentLevel}`);
                }
                if (record.currentSeasonPoints !== 0) {
                    console.error(`❌ 初始积分不正确，期望 0，实际 ${record.currentSeasonPoints}`);
                    errors.push(`初始积分不正确，期望 0，实际 ${record.currentSeasonPoints}`);
                }
                if (record.isPremium !== false) {
                    console.error(`❌ 初始 Premium 状态不正确，期望 false，实际 ${record.isPremium}`);
                    errors.push(`初始 Premium 状态不正确，期望 false，实际 ${record.isPremium}`);
                }
                if (errors.length === 0) {
                    steps.push("✓ Battle Pass 记录验证成功");
                    console.log("✓ Battle Pass 记录验证成功");
                }
            }

            console.log("\n==========================================");
            console.log(`[testInitializeBattlePass] 测试完成`);
            console.log(`成功: ${errors.length === 0 ? "✅" : "❌"}`);
            console.log(`错误数量: ${errors.length}`);
            console.log("==========================================\n");

            return {
                success: errors.length === 0,
                errors,
                steps,
                data: record,
            };
        } catch (error: any) {
            console.error("\n==========================================");
            console.error(`[testInitializeBattlePass] 测试执行失败`);
            console.error(`错误: ${error.message}`);
            console.error("==========================================\n");
            errors.push(`测试执行失败: ${error.message}`);
            return {
                success: false,
                errors,
                steps,
            };
        }
    },
});

/**
 * 测试：添加赛季积分并验证等级升级
 */
export const testAddSeasonPoints = internalMutation({
    args: {
        uid: v.string(),
        seasonPointsAmount: v.number(),
        source: v.string(),
        expectedLevel: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        console.log("==========================================");
        console.log(`[testAddSeasonPoints] 开始测试添加赛季积分`);
        console.log(`玩家 UID: ${args.uid}`);
        console.log(`积分数量: ${args.seasonPointsAmount}`);
        console.log(`积分来源: ${args.source}`);
        console.log(`期望等级: ${args.expectedLevel || "未指定"}`);
        console.log("==========================================");

        const { uid, seasonPointsAmount, source, expectedLevel } = args;
        const errors: string[] = [];
        const steps: string[] = [];

        try {
            // 步骤1: 获取当前等级
            console.log("\n[步骤1] 获取当前等级...");
            steps.push("步骤1: 获取当前等级");
            let battlePass = await BattlePassSystem.getPlayerBattlePass(ctx, uid);
            if (!battlePass) {
                console.log("Battle Pass 不存在，正在初始化...");
                battlePass = await BattlePassSystem.initializePlayerBattlePass(ctx, uid);
            }
            const oldLevel = battlePass.currentLevel;
            const oldPoints = battlePass.currentSeasonPoints;
            steps.push(`当前等级: ${oldLevel}, 当前积分: ${oldPoints}`);
            console.log(`当前等级: ${oldLevel}, 当前积分: ${oldPoints}`);

            // 步骤2: 添加赛季积分
            console.log("\n[步骤2] 添加赛季积分...");
            steps.push("步骤2: 添加赛季积分");
            console.log(`添加 ${seasonPointsAmount} 积分，来源: ${source}`);
            const result = await BattlePassSystem.addSeasonPoints(ctx, uid, seasonPointsAmount, source);

            if (!result.success) {
                console.error(`❌ 添加积分失败: ${result.message}`);
                errors.push(`添加积分失败: ${result.message}`);
                return {
                    success: false,
                    errors,
                    steps,
                };
            }

            steps.push(`✓ 成功添加 ${seasonPointsAmount} 积分`);
            console.log(`✓ 成功添加 ${seasonPointsAmount} 积分`);
            if (result.rewards && result.rewards.length > 0) {
                console.log(`解锁了 ${result.rewards.length} 个等级的奖励`);
            }

            // 步骤3: 验证等级升级
            steps.push("步骤3: 验证等级升级");
            const newBattlePass = await BattlePassSystem.getPlayerBattlePass(ctx, uid);
            if (!newBattlePass) {
                errors.push("无法获取更新后的 Battle Pass");
            } else {
                const newLevel = newBattlePass.currentLevel;
                const newPoints = newBattlePass.currentSeasonPoints;

                // 计算期望等级（每100积分升1级，最高25级）
                const totalPoints = oldPoints + seasonPointsAmount;
                const calculatedLevel = Math.min(Math.floor(totalPoints / 100) + 1, 25);

                if (newLevel !== calculatedLevel) {
                    console.error(`❌ 等级升级不正确，期望 ${calculatedLevel}，实际 ${newLevel}`);
                    errors.push(`等级升级不正确，期望 ${calculatedLevel}，实际 ${newLevel}`);
                } else {
                    steps.push(`✓ 等级升级成功: ${oldLevel} → ${newLevel}`);
                    console.log(`✓ 等级升级成功: ${oldLevel} → ${newLevel}`);
                }

                if (expectedLevel && newLevel !== expectedLevel) {
                    console.error(`❌ 等级不符合预期，期望 ${expectedLevel}，实际 ${newLevel}`);
                    errors.push(`等级不符合预期，期望 ${expectedLevel}，实际 ${newLevel}`);
                }

                // 验证积分
                if (newPoints !== totalPoints) {
                    console.error(`❌ 积分不正确，期望 ${totalPoints}，实际 ${newPoints}`);
                    errors.push(`积分不正确，期望 ${totalPoints}，实际 ${newPoints}`);
                } else {
                    steps.push(`✓ 积分更新成功: ${oldPoints} → ${newPoints}`);
                    console.log(`✓ 积分更新成功: ${oldPoints} → ${newPoints}`);
                }

                // 验证解锁的奖励
                if (result.rewards && result.rewards.length > 0) {
                    steps.push(`✓ 解锁了 ${result.rewards.length} 个等级的奖励`);
                    console.log(`✓ 解锁了 ${result.rewards.length} 个等级的奖励`);
                }

                console.log("\n==========================================");
                console.log(`[testAddSeasonPoints] 测试完成`);
                console.log(`成功: ${errors.length === 0 ? "✅" : "❌"}`);
                console.log(`错误数量: ${errors.length}`);
                console.log("==========================================\n");

                return {
                    success: errors.length === 0,
                    errors,
                    steps,
                    data: {
                        oldLevel,
                        newLevel,
                        oldPoints,
                        newPoints,
                        unlockedRewards: result.rewards,
                    },
                };
            }

            console.log("\n==========================================");
            console.log(`[testAddSeasonPoints] 测试完成（无法获取 Battle Pass）`);
            console.log(`成功: ${errors.length === 0 ? "✅" : "❌"}`);
            console.log(`错误数量: ${errors.length}`);
            console.log("==========================================\n");

            return {
                success: errors.length === 0,
                errors,
                steps,
            };

        } catch (error: any) {
            errors.push(`测试执行失败: ${error.message}`);
            return {
                success: false,
                errors,
                steps,
            };
        }
    },
});

/**
 * 测试：领取 Battle Pass 奖励
 */
export const testClaimBattlePassRewards = internalMutation({
    args: {
        uid: v.string(),
        level: v.number(),
        isPremium: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { uid, level, isPremium = false } = args;
        const errors: string[] = [];
        const steps: string[] = [];

        try {
            // 步骤1: 确保玩家达到指定等级
            steps.push("步骤1: 验证玩家等级");
            let battlePass = await BattlePassSystem.getPlayerBattlePass(ctx, uid);
            if (!battlePass) {
                battlePass = await BattlePassSystem.initializePlayerBattlePass(ctx, uid);
            }

            if (!battlePass) {
                errors.push("无法初始化 Battle Pass");
                return {
                    success: false,
                    errors,
                    steps,
                };
            }

            if (battlePass.currentLevel < level) {
                // 添加足够的积分以达到指定等级
                const pointsNeeded = (level - battlePass.currentLevel) * 100;
                await BattlePassSystem.addSeasonPoints(ctx, uid, pointsNeeded, "test");
                battlePass = await BattlePassSystem.getPlayerBattlePass(ctx, uid);
            }

            if (!battlePass) {
                errors.push("无法获取 Battle Pass");
                return {
                    success: false,
                    errors,
                    steps,
                };
            }

            if (isPremium && !battlePass.isPremium) {
                // 购买 Premium Pass
                await BattlePassSystem.purchasePremiumBattlePass(ctx, uid);
                battlePass = await BattlePassSystem.getPlayerBattlePass(ctx, uid);
            }

            if (!battlePass) {
                errors.push("无法获取 Battle Pass");
                return {
                    success: false,
                    errors,
                    steps,
                };
            }

            if (battlePass.currentLevel < level) {
                errors.push(`玩家等级不足，当前 ${battlePass.currentLevel}，需要 ${level}`);
                return {
                    success: false,
                    errors,
                    steps,
                };
            }

            if (battlePass.claimedLevels.includes(level)) {
                steps.push(`⚠ 等级 ${level} 的奖励已经领取过`);
            }

            steps.push(`✓ 玩家等级验证通过: ${battlePass.currentLevel}`);

            // 步骤2: 记录领取前的库存
            steps.push("步骤2: 记录领取前的库存");
            const inventory = await ctx.db
                .query("player_inventory")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .first();
            const beforeCoins = inventory?.coins || 0;

            // 步骤3: 领取奖励
            steps.push("步骤3: 领取奖励");
            const result = await BattlePassSystem.claimBattlePassRewards(ctx, uid, level);

            if (!result.success) {
                errors.push(`领取奖励失败: ${result.message}`);
                return {
                    success: false,
                    errors,
                    steps,
                };
            }

            steps.push(`✓ 成功领取等级 ${level} 的奖励`);

            // 步骤4: 验证奖励发放
            steps.push("步骤4: 验证奖励发放");
            const afterInventory = await ctx.db
                .query("player_inventory")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .first();
            const afterCoins = afterInventory?.coins || 0;
            const coinIncrease = afterCoins - beforeCoins;

            // 验证期望奖励
            const track = isPremium ? "premium" : "free";
            const expectedRewards = EXPECTED_REWARDS_BY_LEVEL[track as keyof typeof EXPECTED_REWARDS_BY_LEVEL][level as keyof typeof EXPECTED_REWARDS_BY_LEVEL["free"]];

            if (expectedRewards) {
                if (expectedRewards.coins && coinIncrease < expectedRewards.coins) {
                    errors.push(`金币奖励不足，期望至少 ${expectedRewards.coins}，实际增加 ${coinIncrease}`);
                } else if (expectedRewards.coins) {
                    steps.push(`✓ 金币奖励正确: +${coinIncrease}`);
                }
            }

            // 步骤5: 验证已领取等级记录
            steps.push("步骤5: 验证已领取等级记录");
            const updatedBattlePass = await BattlePassSystem.getPlayerBattlePass(ctx, uid);
            if (!updatedBattlePass?.claimedLevels.includes(level)) {
                errors.push(`已领取等级记录不正确，等级 ${level} 未在 claimedLevels 中`);
            } else {
                steps.push(`✓ 已领取等级记录正确`);
            }

            return {
                success: errors.length === 0,
                errors,
                steps,
                data: {
                    rewards: result.rewards,
                    coinIncrease,
                    expectedRewards,
                    claimedLevels: updatedBattlePass?.claimedLevels,
                },
            };
        } catch (error: any) {
            errors.push(`测试执行失败: ${error.message}`);
            return {
                success: false,
                errors,
                steps,
            };
        }
    },
});

/**
 * 测试：完整的 Battle Pass 流程（初始化 → 积分 → 升级 → 领取）
 */
export const testCompleteBattlePassFlow = internalMutation({
    args: {
        uid: v.string(),
        testLevels: v.optional(v.array(v.number())),
    },
    handler: async (ctx, args) => {
        const { uid, testLevels = [1, 3, 5, 10] } = args;
        const errors: string[] = [];
        const steps: string[] = [];

        try {
            // 步骤1: 初始化 Battle Pass（直接调用服务类方法）
            steps.push("步骤1: 初始化 Battle Pass");
            let initResult: any;
            try {
                const battlePass = await BattlePassSystem.initializePlayerBattlePass(ctx, uid);
                initResult = {
                    success: true,
                    errors: [],
                    steps: [`✓ Battle Pass 初始化成功，等级: ${battlePass.currentLevel}`],
                    data: battlePass,
                };
            } catch (error: any) {
                initResult = {
                    success: false,
                    errors: [error.message],
                    steps: [],
                };
            }
            if (!initResult.success) {
                errors.push(...initResult.errors);
                return {
                    success: false,
                    errors,
                    steps,
                };
            }
            steps.push(...initResult.steps);

            // 步骤2: 添加积分以达到测试等级
            steps.push("步骤2: 添加积分以达到测试等级");
            const maxLevel = Math.max(...testLevels);
            const totalPointsNeeded = (maxLevel - 1) * 100;

            // 分多次添加积分，模拟真实场景
            const pointsPerBatch = 50;
            let addedPoints = 0;
            while (addedPoints < totalPointsNeeded) {
                const batchPoints = Math.min(pointsPerBatch, totalPointsNeeded - addedPoints);
                const source = TEST_SEASON_POINTS_SOURCES[addedPoints % TEST_SEASON_POINTS_SOURCES.length];
                await BattlePassSystem.addSeasonPoints(ctx, uid, batchPoints, source.source);
                addedPoints += batchPoints;
            }
            steps.push(`✓ 添加了 ${addedPoints} 积分，达到等级 ${maxLevel}`);

            // 步骤3: 验证每个测试等级的奖励（直接调用服务类方法）
            steps.push("步骤3: 验证每个测试等级的奖励");
            for (const level of testLevels) {
                try {
                    // 确保玩家达到指定等级
                    let battlePass = await BattlePassSystem.getPlayerBattlePass(ctx, uid);
                    if (!battlePass) {
                        battlePass = await BattlePassSystem.initializePlayerBattlePass(ctx, uid);
                    }
                    if (battlePass && battlePass.currentLevel < level) {
                        const pointsNeeded = (level - battlePass.currentLevel) * 100;
                        await BattlePassSystem.addSeasonPoints(ctx, uid, pointsNeeded, "test");
                    }

                    // 领取奖励
                    const result = await BattlePassSystem.claimBattlePassRewards(ctx, uid, level);
                    if (!result.success) {
                        errors.push(`等级 ${level} 奖励领取失败: ${result.message}`);
                    } else {
                        steps.push(`✓ 等级 ${level} 奖励领取成功`);
                    }
                } catch (error: any) {
                    errors.push(`等级 ${level} 奖励领取异常: ${error.message}`);
                }
            }

            return {
                success: errors.length === 0,
                errors,
                steps,
            };
        } catch (error: any) {
            errors.push(`测试执行失败: ${error.message}`);
            return {
                success: false,
                errors,
                steps,
            };
        }
    },
});

/**
 * 测试：Premium Pass 购买和奖励领取
 */
export const testPremiumPassFlow = internalMutation({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, args) => {
        const { uid } = args;
        const errors: string[] = [];
        const steps: string[] = [];

        try {
            // 步骤1: 确保玩家有足够的金币
            steps.push("步骤1: 确保玩家有足够的金币");
            const inventory = await ctx.db
                .query("player_inventory")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .first();

            const premiumPrice = 500;
            if (!inventory || inventory.coins < premiumPrice) {
                // 添加金币
                await ctx.db.patch(inventory?._id || (await ctx.db.insert("player_inventory", {
                    uid,
                    coins: premiumPrice + 1000,
                    props: [],
                    tickets: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                })), {
                    coins: premiumPrice + 1000,
                });
                steps.push(`✓ 添加了 ${premiumPrice + 1000} 金币`);
            }

            // 步骤2: 购买 Premium Pass
            steps.push("步骤2: 购买 Premium Pass");
            const purchaseResult = await BattlePassSystem.purchasePremiumBattlePass(ctx, uid);

            if (!purchaseResult.success) {
                errors.push(`购买 Premium Pass 失败: ${purchaseResult.message}`);
                return {
                    success: false,
                    errors,
                    steps,
                };
            }

            steps.push("✓ Premium Pass 购买成功");

            // 步骤3: 验证 Premium 状态
            steps.push("步骤3: 验证 Premium 状态");
            const battlePass = await BattlePassSystem.getPlayerBattlePass(ctx, uid);
            if (!battlePass?.isPremium) {
                errors.push("Premium 状态未更新");
            } else {
                steps.push("✓ Premium 状态验证成功");
            }

            // 步骤4: 领取 Premium 奖励（直接调用服务类方法）
            steps.push("步骤4: 领取 Premium 奖励");
            let claimResult: any = { success: true, errors: [], steps: [] };
            try {
                // 确保玩家达到等级 1
                let battlePass = await BattlePassSystem.getPlayerBattlePass(ctx, uid);
                if (!battlePass) {
                    battlePass = await BattlePassSystem.initializePlayerBattlePass(ctx, uid);
                }
                if (battlePass && battlePass.currentLevel < 1) {
                    await BattlePassSystem.addSeasonPoints(ctx, uid, 100, "test");
                }

                // 领取奖励
                const result = await BattlePassSystem.claimBattlePassRewards(ctx, uid, 1);
                claimResult = {
                    success: result.success,
                    errors: result.success ? [] : [result.message],
                    steps: [],
                };
            } catch (error: any) {
                claimResult = {
                    success: false,
                    errors: [error.message],
                    steps: [],
                };
            }

            if (!claimResult.success) {
                errors.push(`Premium 奖励领取失败: ${claimResult.errors.join(", ")}`);
            } else {
                steps.push("✓ Premium 奖励领取成功");
            }

            return {
                success: errors.length === 0,
                errors,
                steps,
                data: {
                    purchaseResult,
                    claimResult,
                },
            };
        } catch (error: any) {
            errors.push(`测试执行失败: ${error.message}`);
            return {
                success: false,
                errors,
                steps,
            };
        }
    },
});

