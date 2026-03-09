/**
 * 战斗系统测试数据准备函数
 * 用于创建完整的战斗测试数据，包括玩家、队伍、stage、游戏实例
 */

import { v } from "convex/values";
import { internal } from "../../../../_generated/api";
import { action, internalMutation, query } from "../../../../_generated/server";
import { MONSTER_CONFIGS_MAP } from "../../../../data/monsterConfigs";
import { GameModel, PhaseChanges } from "../../../../types/gameTypes";
import { StageManagerService } from "../../../stage/stageManagerService";
import { TeamService } from "../../../team/teamService";
import { GameRuleConfigService } from "../../gameRuleConfigService";
import { GameService } from "../../gameService";

/**
 * 召唤技能测试专用队伍
 * monster_008（Support）拥有 summon_minion，等级 6 已解锁
 * 召唤测试时传入 setupCombatTestData 的 teamMonsters 参数
 */
export const SUMMON_TEST_TEAM_MONSTERS = [
    { monsterId: "monster_008", level: 6, stars: 1 },  // Support，有 summon_minion
    { monsterId: "monster_001", level: 5, stars: 1 },
    { monsterId: "monster_002", level: 5, stars: 1 },
    { monsterId: "monster_004", level: 5, stars: 1 },
];

/**
 * 检查怪物配置是否存在（从配置文件检查）
 */
function checkMonsterConfigExists(monsterId: string): void {
    const config = MONSTER_CONFIGS_MAP[monsterId];
    if (!config) {
        throw new Error(`怪物配置不存在: ${monsterId}（配置文件中不存在）`);
    }
}

/**
 * 准备战斗测试数据
 * 创建完整的战斗测试数据，包括玩家、队伍、stage、游戏实例
 * 召唤测试时传入 teamMonsters: SUMMON_TEST_TEAM_MONSTERS
 */
export async function setupCombatTestData(
    ctx: any,
    params?: {
        uid?: string;
        gameId?: string;
        stageId?: string;
        ruleId?: string;
        bossId?: string;
        teamMonsters?: Array<{ monsterId: string; level: number; stars: number }>;
        skipFirstTurn?: boolean;  // 是否跳过 startFirstTurn（用于测试初始状态）
    }
): Promise<{
    uid: string;
    gameId: string;
    stageId: string;
    ruleId: string;
    game: GameModel | null;
    phaseChanges?: PhaseChanges;
    errors: string[];
}> {
    const errors: string[] = [];
    const nowISO = new Date().toISOString();

    // 1. 设置默认参数
    const uid = params?.uid || "test_combat_player_001";
    const gameId = params?.gameId || `test_combat_game_${Date.now()}`;
    const ruleId = params?.ruleId || "monster_rumble_challenge_bronze_boss_1";
    const bossId = params?.bossId || "boss_bronze_1";
    const skipFirstTurn = params?.skipFirstTurn || false;

    // 2. 创建或获取测试玩家队伍
    const teamMonsters = params?.teamMonsters || [
        { monsterId: "monster_001", level: 5, stars: 1 },
        { monsterId: "monster_002", level: 6, stars: 2 },
        { monsterId: "monster_003", level: 7, stars: 1 },
        { monsterId: "monster_004", level: 8, stars: 3 }
    ];

    // 检查怪物配置是否存在
    for (const monster of teamMonsters) {
        try {
            checkMonsterConfigExists(monster.monsterId);
        } catch (error: any) {
            errors.push(error.message);
        }
    }

    // 查询该 uid 下所有怪物（用于“清空队伍”或“按 monsterId 查找”）
    const allPlayerMonsters = await ctx.db
        .query("mr_player_monsters")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .collect();

    const existingTeamMonsters = allPlayerMonsters.filter((m: any) => m.inTeam === 1);

    // ✅ 当传入了 teamMonsters 时，强制将队伍设为该列表（保证创建的战斗中包含 monster_008 等）
    // 1. 先清空当前队伍（所有 inTeam=1 的改为 inTeam=0）
    for (const m of existingTeamMonsters) {
        await ctx.db.patch(m._id, { inTeam: 0, teamPosition: undefined });
    }

    // 2. 按 teamMonsters 顺序设置队伍：存在则更新并入队，不存在则插入
    for (let i = 0; i < teamMonsters.length; i++) {
        const monster = teamMonsters[i];
        const position = TeamService.getDefaultPosition(i);
        const monsterConfig = MONSTER_CONFIGS_MAP[monster.monsterId];
        const skillIds = monsterConfig?.skillIds || [];

        const existing = allPlayerMonsters.find((m: any) => m.monsterId === monster.monsterId);
        try {
            if (existing) {
                await ctx.db.patch(existing._id, {
                    level: monster.level,
                    stars: monster.stars,
                    unlockedSkills: skillIds,
                    inTeam: 1,
                    teamPosition: position,
                    updatedAt: nowISO,
                });
            } else {
                await ctx.db.insert("mr_player_monsters", {
                    uid,
                    monsterId: monster.monsterId,
                    level: monster.level,
                    stars: monster.stars,
                    experience: 0,
                    shards: 0,
                    isUnlocked: true,
                    unlockedSkills: skillIds,
                    inTeam: 1,
                    teamPosition: position,
                    obtainedAt: nowISO,
                    updatedAt: nowISO,
                });
            }
        } catch (error: any) {
            errors.push(`设置队伍怪物 ${monster.monsterId} 失败: ${error.message}`);
        }
    }

    // 3. 创建测试 stage
    let stageId = params?.stageId;
    if (!stageId) {
        try {
            // 获取规则配置
            const ruleConfig = GameRuleConfigService.getGameRuleConfig(ruleId);
            if (!ruleConfig) {
                errors.push(`规则配置不存在: ${ruleId}`);
            } else {
                // 使用默认难度创建 stage
                const difficulty = ruleConfig.stageContent?.difficultyAdjustment?.difficultyMultiplier || 1.0;
                const stage = await StageManagerService.createStage(ctx, {
                    ruleId,
                    difficulty,
                });

                if (!stage) {
                    errors.push(`创建 stage 失败: ${ruleId}`);
                } else {
                    stageId = stage.stageId;

                    // 插入 mr_stage_stats 记录（如果不存在）
                    // 注意：先使用 by_stage 索引查询，然后过滤 ruleId（因为可能没有 by_ruleId 索引）
                    const existingStats = await ctx.db
                        .query("mr_stage_stats")
                        .withIndex("by_stage", (q: any) => q.eq("stageId", stageId))
                        .filter((q: any) => q.eq(q.field("ruleId"), ruleId))
                        .first();

                    if (!existingStats) {
                        await ctx.db.insert("mr_stage_stats", {
                            ruleId,
                            stageId: stage.stageId,
                            powerLevel: 1,
                            attempts: 0,
                        });
                    }
                }
            }
        } catch (error: any) {
            errors.push(`创建 stage 失败: ${error.message}`);
        }
    }

    if (!stageId) {
        return {
            uid,
            gameId,
            stageId: "",
            ruleId,
            game: null,
            errors,
        };
    }

    // 4. 创建游戏实例
    let game: GameModel | null = null;
    let phaseChanges: PhaseChanges | undefined;

    try {
        const gameService = new GameService(ctx);
        const result = await gameService.createGame(uid, gameId, ruleId, stageId);

        if (result.game) {
            game = result.game;
            if (!skipFirstTurn && result.phaseChanges) {
                phaseChanges = result.phaseChanges;
            }
        } else {
            errors.push("创建游戏失败: game 为 null");
        }
    } catch (error: any) {
        errors.push(`创建游戏失败: ${error.message}`);
    }

    return {
        uid,
        gameId,
        stageId,
        ruleId,
        game,
        phaseChanges,
        errors,
    };
}

/**
 * 清理战斗测试数据
 */
export async function cleanupCombatTestData(
    ctx: any,
    params: {
        uid?: string;
        gameId?: string;
        stageId?: string;
        cleanupStage?: boolean;  // 是否清理 stage
        cleanupTeam?: boolean;  // 是否清理队伍
    }
): Promise<{
    deleted: {
        games: number;
        events: number;
        rounds: number;
        stages: number;
        teams: number;
    };
    errors: string[];
}> {
    const result = {
        deleted: {
            games: 0,
            events: 0,
            rounds: 0,
            stages: 0,
            teams: 0,
        },
        errors: [] as string[],
    };

    const { uid, gameId, stageId, cleanupStage = false, cleanupTeam = false } = params;

    // 1. 清理游戏相关数据
    if (gameId) {
        try {
            // 清理游戏事件
            const events = await ctx.db
                .query("mr_game_event")
                .withIndex("by_game", (q: any) => q.eq("gameId", gameId))
                .collect();
            for (const event of events) {
                await ctx.db.delete(event._id);
                result.deleted.events++;
            }

            // 清理游戏回合
            const rounds = await ctx.db
                .query("mr_game_round")
                .withIndex("by_game", (q: any) => q.eq("gameId", gameId))
                .collect();
            for (const round of rounds) {
                await ctx.db.delete(round._id);
                result.deleted.rounds++;
            }

            // 清理游戏
            const games = await ctx.db
                .query("mr_games")
                .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
                .collect();
            for (const game of games) {
                await ctx.db.delete(game._id);
                result.deleted.games++;
            }
        } catch (error: any) {
            result.errors.push(`清理游戏 ${gameId} 数据时出错: ${error.message}`);
        }
    }

    // 2. 清理 stage（可选）
    if (cleanupStage && stageId) {
        try {
            // 清理 mr_stage_stats
            const stageStats = await ctx.db
                .query("mr_stage_stats")
                .withIndex("by_ruleId", (q: any) => q.eq("ruleId", ""))
                .filter((q: any) => q.eq(q.field("stageId"), stageId))
                .collect();
            for (const stat of stageStats) {
                await ctx.db.delete(stat._id);
            }

            // 清理 mr_stage
            const stages = await ctx.db
                .query("mr_stage")
                .withIndex("by_stageId", (q: any) => q.eq("stageId", stageId))
                .collect();
            for (const stage of stages) {
                await ctx.db.delete(stage._id);
                result.deleted.stages++;
            }
        } catch (error: any) {
            result.errors.push(`清理 stage ${stageId} 数据时出错: ${error.message}`);
        }
    }

    // 3. 清理队伍（可选）
    if (cleanupTeam && uid) {
        try {
            const teamMonsters = await ctx.db
                .query("mr_player_monsters")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .filter((q: any) => q.eq(q.field("inTeam"), 1))
                .collect();
            for (const monster of teamMonsters) {
                await ctx.db.patch(monster._id, {
                    teamPosition: undefined,
                    inTeam: 0,
                    updatedAt: new Date().toISOString(),
                });
                result.deleted.teams++;
            }
        } catch (error: any) {
            result.errors.push(`清理 ${uid} 的队伍数据时出错: ${error.message}`);
        }
    }

    return result;
}

/**
 * 验证战斗测试数据完整性
 */
export async function validateCombatTestData(
    ctx: any,
    params: {
        gameId: string;
    }
): Promise<{
    valid: boolean;
    errors: string[];
    game?: GameModel;
    details?: {
        hasTeam: boolean;
        hasBoss: boolean;
        hasRound: boolean;
        hasEvents: boolean;
        teamSize: number;
        bossHp: number;
        roundNumber: number;
    };
}> {
    const { gameId } = params;
    const errors: string[] = [];
    let game: GameModel | undefined;

    try {
        // 1. 加载游戏
        const gameDoc = await ctx.db
            .query("mr_games")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .first();

        if (!gameDoc) {
            errors.push(`游戏不存在: ${gameId}`);
            return { valid: false, errors };
        }

        // 转换为 GameModel（简化版，实际应该使用 GameLifecycleService.load）
        game = gameDoc as any;
        if (!game) {
            errors.push(`游戏不存在: ${gameId}`);
            return { valid: false, errors };
        }

        // 2. 验证队伍
        const hasTeam = game.team && Array.isArray(game.team) && game.team.length > 0;
        if (!hasTeam) {
            errors.push("游戏缺少队伍数据");
        }

        // 3. 验证 Boss
        const hasBoss = !!(game.boss && game.boss.bossId);
        if (!hasBoss) {
            errors.push("游戏缺少 Boss 数据");
        }

        // 4. 验证回合
        const hasRound = !!(game.currentRound && game.currentRound.no > 0);
        if (!hasRound) {
            errors.push("游戏缺少回合数据");
        }

        // 5. 验证事件
        const events = await ctx.db
            .query("mr_game_event")
            .withIndex("by_game", (q: any) => q.eq("gameId", gameId))
            .collect();
        const hasEvents = events.length > 0;

        // 6. 收集详细信息
        const details = {
            hasTeam,
            hasBoss,
            hasRound,
            hasEvents,
            teamSize: game.team?.length || 0,
            bossHp: game.boss?.stats?.hp?.current || 0,
            roundNumber: game.currentRound?.no || 0,
        };

        const valid = errors.length === 0;

        return {
            valid,
            errors,
            game,
            details,
        };
    } catch (error: any) {
        errors.push(`验证测试数据时出错: ${error.message}`);
        return { valid: false, errors };
    }
}

// ========== 导出 Convex Functions ==========

/**
 * 导出为 internalMutation（用于测试）
 */
export const setupCombatTestDataMutation = internalMutation({
    args: {
        uid: v.optional(v.string()),
        gameId: v.optional(v.string()),
        stageId: v.optional(v.string()),
        ruleId: v.optional(v.string()),
        bossId: v.optional(v.string()),
        teamMonsters: v.optional(v.array(v.object({
            monsterId: v.string(),
            level: v.number(),
            stars: v.number(),
        }))),
        skipFirstTurn: v.optional(v.boolean()),
    },
    handler: async (ctx, params) => {
        return await setupCombatTestData(ctx, params);
    },
});

export const cleanupCombatTestDataMutation = internalMutation({
    args: {
        uid: v.optional(v.string()),
        gameId: v.optional(v.string()),
        stageId: v.optional(v.string()),
        cleanupStage: v.optional(v.boolean()),
        cleanupTeam: v.optional(v.boolean()),
    },
    handler: async (ctx, params) => {
        return await cleanupCombatTestData(ctx, params);
    },
});

/**
 * 导出为 action（用于 CLI 调用）
 */
export const setupCombatTestDataAction = action({
    args: {
        uid: v.optional(v.string()),
        gameId: v.optional(v.string()),
        stageId: v.optional(v.string()),
        ruleId: v.optional(v.string()),
        bossId: v.optional(v.string()),
        teamMonsters: v.optional(v.array(v.object({
            monsterId: v.string(),
            level: v.number(),
            stars: v.number(),
        }))),
        skipFirstTurn: v.optional(v.boolean()),
    },
    handler: async (ctx, params): Promise<any> => {
        return await ctx.runMutation(
            internal.service.game.tests.combat.combatTestData.setupCombatTestDataMutation,
            params
        );
    },
});

export const cleanupCombatTestDataAction = action({
    args: {
        uid: v.optional(v.string()),
        gameId: v.optional(v.string()),
        stageId: v.optional(v.string()),
        cleanupStage: v.optional(v.boolean()),
        cleanupTeam: v.optional(v.boolean()),
    },
    handler: async (ctx, params): Promise<any> => {
        return await ctx.runMutation(
            internal.service.game.tests.combat.combatTestData.cleanupCombatTestDataMutation,
            params
        );
    },
});

export const validateCombatTestDataQuery = query({
    args: {
        gameId: v.string(),
    },
    handler: async (ctx, params) => {
        return await validateCombatTestData(ctx, params);
    },
});
