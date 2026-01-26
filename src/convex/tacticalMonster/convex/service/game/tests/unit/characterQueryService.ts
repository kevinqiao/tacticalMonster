/**
 * CharacterQueryService 单元测试
 * 测试角色查询服务的各个查询方法
 */

import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";
import { CharacterQueryService } from "../../characterQueryService";
import {
    createMockGameModel,
    createMockGameMonster,
    createMockGameBoss,
    createMockGameMinion,
    createTestResult,
    TestResult,
} from "./testUtils";

/**
 * 测试 getCharacter 方法
 */
export const testCharacterQueryServiceGetCharacter = internalMutation({
    args: {},
    handler: async (ctx): Promise<TestResult> => {
        const testResult = createTestResult("testCharacterQueryServiceGetCharacter");

        try {
            const game = createMockGameModel();
            const service = new CharacterQueryService();
            service.setGame(game);

            // 1. 测试游戏状态为空
            testResult.steps.push("测试1: 游戏状态为空");
            const service1 = new CharacterQueryService();
            const result1 = service1.getCharacter("monster_001");
            if (result1 !== null) {
                testResult.errors.push(`测试1失败: 期望 null, 实际 ${result1?.monsterId}`);
            } else {
                testResult.steps.push("✓ 测试1通过: 游戏状态为空时返回 null");
            }

            // 2. 测试参数错误（多个参数）
            testResult.steps.push("测试2: 参数错误（多个参数）");
            const result2 = service.getCharacter("monster_001", "boss_001");
            if (result2 !== null) {
                testResult.errors.push(`测试2失败: 期望 null, 实际 ${result2?.monsterId}`);
            } else {
                testResult.steps.push("✓ 测试2通过: 多个参数时返回 null");
            }

            // 3. 测试玩家角色查询（monsterId）
            testResult.steps.push("测试3: 玩家角色查询");
            const result3 = service.getCharacter("monster_001");
            if (!result3 || result3.monsterId !== "monster_001") {
                testResult.errors.push(`测试3失败: 期望 monster_001, 实际 ${result3?.monsterId}`);
            } else {
                testResult.steps.push("✓ 测试3通过: 玩家角色查询成功");
            }

            // 4. 测试玩家角色不存在
            testResult.steps.push("测试4: 玩家角色不存在");
            const result4 = service.getCharacter("monster_999");
            if (result4 !== null) {
                testResult.errors.push(`测试4失败: 期望 null, 实际 ${result4?.monsterId}`);
            } else {
                testResult.steps.push("✓ 测试4通过: 玩家角色不存在时返回 null");
            }

            // 5. 测试 Boss 主体查询（bossId）
            testResult.steps.push("测试5: Boss 主体查询");
            const result5 = service.getCharacter(undefined, game.boss.bossId);
            if (!result5 || result5.monsterId !== game.boss.monsterId) {
                testResult.errors.push(`测试5失败: 期望 ${game.boss.monsterId}, 实际 ${result5?.monsterId}`);
            } else {
                testResult.steps.push("✓ 测试5通过: Boss 主体查询成功");
            }

            // 6. 测试 Boss 主体不存在
            testResult.steps.push("测试6: Boss 主体不存在");
            const result6 = service.getCharacter(undefined, "boss_999");
            if (result6 !== null) {
                testResult.errors.push(`测试6失败: 期望 null, 实际 ${result6?.monsterId}`);
            } else {
                testResult.steps.push("✓ 测试6通过: Boss 主体不存在时返回 null");
            }

            // 7. 测试小怪查询（minionId）
            testResult.steps.push("测试7: 小怪查询");
            if (game.boss.minions.length > 0) {
                const minion = game.boss.minions[0];
                const result7 = service.getCharacter(undefined, undefined, minion.minionId);
                if (!result7 || result7.monsterId !== minion.monsterId) {
                    testResult.errors.push(`测试7失败: 期望 ${minion.monsterId}, 实际 ${result7?.monsterId}`);
                } else {
                    testResult.steps.push("✓ 测试7通过: 小怪查询成功");
                }
            } else {
                testResult.steps.push("⚠ 测试7跳过: 没有小怪数据");
            }

            // 8. 测试小怪不存在
            testResult.steps.push("测试8: 小怪不存在");
            const result8 = service.getCharacter(undefined, undefined, "minion_999");
            if (result8 !== null) {
                testResult.errors.push(`测试8失败: 期望 null, 实际 ${result8?.monsterId}`);
            } else {
                testResult.steps.push("✓ 测试8通过: 小怪不存在时返回 null");
            }

            // 9. 测试相同 monsterId 的小怪区分
            testResult.steps.push("测试9: 相同 monsterId 的小怪区分");
            const gameWithMultipleMinions = createMockGameModel();
            const minion1 = createMockGameMinion({ minionId: "minion_1", monsterId: "minion_001" });
            const minion2 = createMockGameMinion({ minionId: "minion_2", monsterId: "minion_001" });
            gameWithMultipleMinions.boss.minions = [minion1, minion2];
            const service9 = new CharacterQueryService();
            service9.setGame(gameWithMultipleMinions);
            const result9a = service9.getCharacter(undefined, undefined, "minion_1");
            const result9b = service9.getCharacter(undefined, undefined, "minion_2");
            if (!result9a || result9a.monsterId !== "minion_001" || result9a.minionId !== "minion_1") {
                testResult.errors.push(`测试9a失败: 期望 minion_1, 实际 ${result9a?.minionId}`);
            } else if (!result9b || result9b.monsterId !== "minion_001" || result9b.minionId !== "minion_2") {
                testResult.errors.push(`测试9b失败: 期望 minion_2, 实际 ${result9b?.minionId}`);
            } else {
                testResult.steps.push("✓ 测试9通过: 相同 monsterId 的小怪可以正确区分");
            }

            testResult.success = testResult.errors.length === 0;
        } catch (error: any) {
            testResult.errors.push(`测试异常: ${error.message}`);
        }

        return testResult;
    },
});

/**
 * 测试 getCharacterParams 方法
 */
export const testCharacterQueryServiceGetCharacterParams = internalMutation({
    args: {},
    handler: async (ctx): Promise<TestResult> => {
        const testResult = createTestResult("testCharacterQueryServiceGetCharacterParams");

        try {
            const game = createMockGameModel();
            const service = new CharacterQueryService();
            service.setGame(game);

            // 1. 测试游戏状态为空
            testResult.steps.push("测试1: 游戏状态为空");
            const service1 = new CharacterQueryService();
            const result1 = service1.getCharacterParams("test_player_001", "monster_001");
            if (result1.monsterId !== "monster_001" || result1.bossId || result1.minionId) {
                testResult.errors.push(`测试1失败: 期望 {monsterId: "monster_001"}, 实际 ${JSON.stringify(result1)}`);
            } else {
                testResult.steps.push("✓ 测试1通过: 游戏状态为空时仍可转换玩家角色");
            }

            // 2. 测试玩家角色转换（uid !== "boss"）
            testResult.steps.push("测试2: 玩家角色转换");
            const result2 = service.getCharacterParams("test_player_001", "monster_001");
            if (result2.monsterId !== "monster_001" || result2.bossId || result2.minionId) {
                testResult.errors.push(`测试2失败: 期望 {monsterId: "monster_001"}, 实际 ${JSON.stringify(result2)}`);
            } else {
                testResult.steps.push("✓ 测试2通过: 玩家角色转换成功");
            }

            // 3. 测试 Boss 主体转换（uid === "boss" 且 monsterId === boss.bossId）
            testResult.steps.push("测试3: Boss 主体转换");
            const result3 = service.getCharacterParams("boss", game.boss.bossId);
            if (result3.bossId !== game.boss.bossId || result3.monsterId || result3.minionId) {
                testResult.errors.push(`测试3失败: 期望 {bossId: "${game.boss.bossId}"}, 实际 ${JSON.stringify(result3)}`);
            } else {
                testResult.steps.push("✓ 测试3通过: Boss 主体转换成功");
            }

            // 4. 测试小怪转换（uid === "boss" 且 monsterId !== boss.bossId）
            testResult.steps.push("测试4: 小怪转换");
            if (game.boss.minions.length > 0) {
                const minion = game.boss.minions[0];
                const result4 = service.getCharacterParams("boss", minion.minionId);
                if (result4.minionId !== minion.minionId || result4.monsterId || result4.bossId) {
                    testResult.errors.push(`测试4失败: 期望 {minionId: "${minion.minionId}"}, 实际 ${JSON.stringify(result4)}`);
                } else {
                    testResult.steps.push("✓ 测试4通过: 小怪转换成功");
                }
            } else {
                testResult.steps.push("⚠ 测试4跳过: 没有小怪数据");
            }

            // 5. 测试游戏状态为空时的 Boss 转换
            testResult.steps.push("测试5: 游戏状态为空时的 Boss 转换");
            const result5 = service1.getCharacterParams("boss", "boss_001");
            if (result5.minionId !== "boss_001" || result5.monsterId || result5.bossId) {
                testResult.errors.push(`测试5失败: 期望 {minionId: "boss_001"}, 实际 ${JSON.stringify(result5)}`);
            } else {
                testResult.steps.push("✓ 测试5通过: 游戏状态为空时 Boss 转换为小怪");
            }

            testResult.success = testResult.errors.length === 0;
        } catch (error: any) {
            testResult.errors.push(`测试异常: ${error.message}`);
        }

        return testResult;
    },
});

/**
 * 测试 getAllCharacters 方法
 */
export const testCharacterQueryServiceGetAllCharacters = internalMutation({
    args: {},
    handler: async (ctx): Promise<TestResult> => {
        const testResult = createTestResult("testCharacterQueryServiceGetAllCharacters");

        try {
            // 1. 测试游戏状态为空
            testResult.steps.push("测试1: 游戏状态为空");
            const service1 = new CharacterQueryService();
            const result1 = service1.getAllCharacters();
            if (result1.length !== 0) {
                testResult.errors.push(`测试1失败: 期望 [], 实际长度 ${result1.length}`);
            } else {
                testResult.steps.push("✓ 测试1通过: 游戏状态为空时返回空数组");
            }

            // 2. 测试获取所有角色
            testResult.steps.push("测试2: 获取所有角色");
            const game = createMockGameModel();
            const service2 = new CharacterQueryService();
            service2.setGame(game);
            const result2 = service2.getAllCharacters();
            
            // 应该包含：玩家队伍 + Boss + 小怪
            const expectedCount = game.team.length + 1 + game.boss.minions.length; // +1 for boss
            if (result2.length !== expectedCount) {
                testResult.errors.push(`测试2失败: 期望 ${expectedCount} 个角色, 实际 ${result2.length}`);
            } else {
                testResult.steps.push(`✓ 测试2通过: 获取到 ${result2.length} 个角色`);
            }

            // 3. 验证角色类型
            testResult.steps.push("测试3: 验证角色类型");
            const playerMonsters = result2.filter((c) => c.uid !== "boss");
            const bossMonsters = result2.filter((c) => c.uid === "boss" && (c as any).bossId);
            const minionMonsters = result2.filter((c) => c.uid === "boss" && (c as any).minionId);
            
            if (playerMonsters.length !== game.team.length) {
                testResult.errors.push(`测试3失败: 玩家角色数量不匹配, 期望 ${game.team.length}, 实际 ${playerMonsters.length}`);
            } else if (bossMonsters.length !== 1) {
                testResult.errors.push(`测试3失败: Boss 数量不匹配, 期望 1, 实际 ${bossMonsters.length}`);
            } else if (minionMonsters.length !== game.boss.minions.length) {
                testResult.errors.push(`测试3失败: 小怪数量不匹配, 期望 ${game.boss.minions.length}, 实际 ${minionMonsters.length}`);
            } else {
                testResult.steps.push("✓ 测试3通过: 角色类型验证通过");
            }

            // 4. 测试没有小怪的情况
            testResult.steps.push("测试4: 没有小怪的情况");
            const gameWithoutMinions = createMockGameModel();
            gameWithoutMinions.boss.minions = [];
            const service4 = new CharacterQueryService();
            service4.setGame(gameWithoutMinions);
            const result4 = service4.getAllCharacters();
            const expectedCount4 = gameWithoutMinions.team.length + 1; // +1 for boss
            if (result4.length !== expectedCount4) {
                testResult.errors.push(`测试4失败: 期望 ${expectedCount4} 个角色, 实际 ${result4.length}`);
            } else {
                testResult.steps.push("✓ 测试4通过: 没有小怪时返回正确数量");
            }

            // 5. 测试多个小怪的情况
            testResult.steps.push("测试5: 多个小怪的情况");
            const gameWithMultipleMinions = createMockGameModel();
            const minion1 = createMockGameMinion({ minionId: "minion_1" });
            const minion2 = createMockGameMinion({ minionId: "minion_2" });
            const minion3 = createMockGameMinion({ minionId: "minion_3" });
            gameWithMultipleMinions.boss.minions = [minion1, minion2, minion3];
            const service5 = new CharacterQueryService();
            service5.setGame(gameWithMultipleMinions);
            const result5 = service5.getAllCharacters();
            const expectedCount5 = gameWithMultipleMinions.team.length + 1 + 3; // +1 for boss, +3 for minions
            if (result5.length !== expectedCount5) {
                testResult.errors.push(`测试5失败: 期望 ${expectedCount5} 个角色, 实际 ${result5.length}`);
            } else {
                testResult.steps.push("✓ 测试5通过: 多个小怪时返回正确数量");
            }

            testResult.success = testResult.errors.length === 0;
        } catch (error: any) {
            testResult.errors.push(`测试异常: ${error.message}`);
        }

        return testResult;
    },
});
