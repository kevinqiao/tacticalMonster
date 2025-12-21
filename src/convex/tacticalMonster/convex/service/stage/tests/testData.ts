/**
 * Stage 测试数据准备函数
 * 用于 openStage Challenge 类型测试
 * 
 * 注意：Monster 配置直接从配置文件读取，不存数据库
 */

import { MONSTER_CONFIGS_MAP } from "../../../data/monsterConfigs";
import { TeamService } from "../../team/teamService";

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
 * 计算怪物Power（基于配置文件）
 * Power = (HP + Attack * 2 + Defense * 1.5) * StarMultiplier
 */
function calculateMonsterPowerFromConfig(
    monsterId: string,
    level: number,
    stars: number
): number {
    // 从配置文件获取怪物配置
    const config = MONSTER_CONFIGS_MAP[monsterId];
    if (!config) {
        throw new Error(`怪物配置不存在: ${monsterId}`);
    }

    // 计算等级和星级加成的属性
    const hpGrowthRate = 0.15;  // 每级增长15%基础HP
    const damageGrowthRate = 0.10;  // 每级增长10%基础伤害
    const defenseGrowthRate = 0.12;  // 每级增长12%基础防御

    const actualHp = config.baseHp * (1 + (level - 1) * hpGrowthRate);
    const actualAttack = config.baseDamage * (1 + (level - 1) * damageGrowthRate);
    const actualDefense = config.baseDefense * (1 + (level - 1) * defenseGrowthRate);

    // 基础Power计算
    const basePower = actualHp + actualAttack * 2 + actualDefense * 1.5;

    // 星级倍数（每星增加10%）
    const starMultiplier = 1 + (stars - 1) * 0.1;

    return Math.floor(basePower * starMultiplier);
}

/**
 * 准备 Challenge Stage 测试数据
 * 只负责创建 team（通过创建 mr_player_monsters 并设置 teamPosition），stage 和 player_stage 的创建由 createStage 和 openStage 方法处理
 * @param ctx Convex context
 * @param params 测试参数
 */
export async function setupChallengeStageTestData(
    ctx: any,
    params: {
        uid: string;
        ruleId: string;
    }
): Promise<{
    teamId?: string;
}> {
    const { uid } = params;
    const result: {
        teamId?: string;
    } = {};
    const nowISO = new Date().toISOString();

    // 创建测试玩家队伍（通过创建 mr_player_monsters 并设置 teamPosition）
    // teamPosition 现在是 Hex 坐标对象 { q: number, r: number }
    const testMonsters = [
        { monsterId: "monster_037", level: 1, stars: 1 },
        { monsterId: "monster_037", level: 1, stars: 1 },
        { monsterId: "monster_037", level: 1, stars: 1 },
        { monsterId: "monster_037", level: 1, stars: 1 },
    ];

    // 检查怪物配置是否存在（从配置文件检查）
    for (const monster of testMonsters) {
        checkMonsterConfigExists(monster.monsterId);
    }

    // 检查是否已存在队伍（使用 inTeam 字段判断）
    const existingTeamMonsters = await ctx.db
        .query("mr_player_monsters")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .filter((q: any) => q.eq(q.field("inTeam"), 1))
        .collect();

    if (existingTeamMonsters.length === 0) {
        // 创建怪物并设置 teamPosition（使用 Hex 坐标对象）
        for (let i = 0; i < testMonsters.length; i++) {
            const monster = testMonsters[i];
            const position = TeamService.getDefaultPosition(i);
            await ctx.db.insert("mr_player_monsters", {
                uid,
                monsterId: monster.monsterId,
                level: monster.level,
                stars: monster.stars,
                experience: 0,
                shards: 0,
                unlockedSkills: [],
                inTeam: 1,
                teamPosition: position,  // 使用 Hex 坐标对象 { q, r }
                obtainedAt: nowISO,
                updatedAt: nowISO,
            });
        }
        result.teamId = "created";  // 标识已创建队伍
    } else {
        result.teamId = "existing";  // 标识队伍已存在
    }

    return result;
}

/**
 * 清理 Challenge Stage 测试数据
 * @param ctx Convex context
 * @param uids 玩家UID列表
 */
export async function cleanupChallengeStageTestData(
    ctx: any,
    uids: string[]
): Promise<{
    deleted: {
        teams: number;
        playerStages: number;
        stages: number;
    };
    errors: string[];
}> {
    const result = {
        deleted: {
            teams: 0,
            playerStages: 0,
            stages: 0,
        },
        errors: [] as string[],
    };

    for (const uid of uids) {
        try {
            // 清理 mr_player_monsters（设置 inTeam 为 0，使其不在队伍中）
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

            // 清理 mr_player_stages
            const playerStages = await ctx.db
                .query("mr_player_stages")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .collect();
            for (const playerStage of playerStages) {
                await ctx.db.delete(playerStage._id);
                result.deleted.playerStages++;
            }

            // 清理关联的 mr_stage
            const stageIds = new Set<string>();
            for (const playerStage of playerStages) {
                if (playerStage.stageId) {
                    stageIds.add(playerStage.stageId);
                }
            }

            for (const stageId of stageIds) {
                const stages = await ctx.db
                    .query("mr_stage")
                    .withIndex("by_stageId", (q: any) => q.eq("stageId", stageId))
                    .collect();
                for (const stage of stages) {
                    // map 数据直接保存在 mr_stage 中，不需要单独清理
                    await ctx.db.delete(stage._id);
                    result.deleted.stages++;
                }
            }
        } catch (error: any) {
            result.errors.push(`清理 ${uid} 的数据时出错: ${error.message}`);
        }
    }

    return result;
}

/**
 * 准备 Arena Stage 测试数据
 * 只负责创建 team（通过创建 mr_player_monsters 并设置 teamPosition），stage 和 arena_stage 的创建由 createStage 方法处理
 * @param ctx Convex context
 * @param params 测试参数
 */
export async function setupArenaStageTestData(
    ctx: any,
    params: {
        uid: string;  // 用于创建 team（arena 也需要 team 验证）
        ruleId: string;
    }
): Promise<{
    teamId?: string;
}> {
    const { uid } = params;
    const result: {
        teamId?: string;
    } = {};
    const nowISO = new Date().toISOString();

    // 创建测试玩家队伍（通过创建 mr_player_monsters 并设置 teamPosition）
    // teamPosition 现在是 Hex 坐标对象 { q: number, r: number }
    const testMonsters = [
        { monsterId: "monster_037", level: 1, stars: 1 },
        { monsterId: "monster_037", level: 1, stars: 1 },
        { monsterId: "monster_037", level: 1, stars: 1 },
        { monsterId: "monster_037", level: 1, stars: 1 },
    ];

    // 检查怪物配置是否存在（从配置文件检查）
    for (const monster of testMonsters) {
        checkMonsterConfigExists(monster.monsterId);
    }

    // 检查是否已存在队伍（使用 inTeam 字段判断）
    const existingTeamMonsters = await ctx.db
        .query("mr_player_monsters")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .filter((q: any) => q.eq(q.field("inTeam"), 1))
        .collect();

    if (existingTeamMonsters.length === 0) {
        // 创建怪物并设置 teamPosition（使用 Hex 坐标对象）
        for (let i = 0; i < testMonsters.length; i++) {
            const monster = testMonsters[i];
            const position = TeamService.getDefaultPosition(i);
            await ctx.db.insert("mr_player_monsters", {
                uid,
                monsterId: monster.monsterId,
                level: monster.level,
                stars: monster.stars,
                experience: 0,
                shards: 0,
                unlockedSkills: [],
                inTeam: 1,
                teamPosition: position,  // 使用 Hex 坐标对象 { q, r }
                obtainedAt: nowISO,
                updatedAt: nowISO,
            });
        }
        result.teamId = "created";  // 标识已创建队伍
    } else {
        result.teamId = "existing";  // 标识队伍已存在
    }

    return result;
}

/**
 * 清理 Arena Stage 测试数据
 * @param ctx Convex context
 * @param uids 玩家UID列表（用于清理 team）
 * @param ruleIds 规则ID列表（用于清理 arena_stage）
 */
export async function cleanupArenaStageTestData(
    ctx: any,
    uids: string[],
    ruleIds: string[]
): Promise<{
    deleted: {
        teams: number;
        arenaStages: number;
        stages: number;
    };
    errors: string[];
}> {
    const result = {
        deleted: {
            teams: 0,
            arenaStages: 0,
            stages: 0,
        },
        errors: [] as string[],
    };

    // 清理 teams（移除 teamPosition，使其不在队伍中）
    for (const uid of uids) {
        try {
            const allMonsters = await ctx.db
                .query("mr_player_monsters")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .collect();

            // 过滤出在队伍中的怪物（inTeam === 1）
            const teamMonsters = allMonsters.filter((monster: any) => {
                return monster.inTeam === 1;
            });
            for (const monster of teamMonsters) {
                await ctx.db.patch(monster._id, {
                    teamPosition: undefined,
                    inTeam: 0,
                    updatedAt: new Date().toISOString(),
                });
                result.deleted.teams++;
            }
        } catch (error: any) {
            result.errors.push(`清理 ${uid} 的 team 数据时出错: ${error.message}`);
        }
    }

    // 清理 arena_stages 和关联的 stages
    for (const ruleId of ruleIds) {
        try {
            // 清理 mr_arena_stage
            const arenaStages = await ctx.db
                .query("mr_arena_stage")
                .withIndex("by_ruleId", (q: any) => q.eq("ruleId", ruleId))
                .collect();

            const stageIds = new Set<string>();
            for (const arenaStage of arenaStages) {
                if (arenaStage.stageId) {
                    stageIds.add(arenaStage.stageId);
                }
                await ctx.db.delete(arenaStage._id);
                result.deleted.arenaStages++;
            }

            // 清理关联的 mr_stage
            for (const stageId of stageIds) {
                const stages = await ctx.db
                    .query("mr_stage")
                    .withIndex("by_stageId", (q: any) => q.eq("stageId", stageId))
                    .collect();
                for (const stage of stages) {
                    await ctx.db.delete(stage._id);
                    result.deleted.stages++;
                }
            }
        } catch (error: any) {
            result.errors.push(`清理 ${ruleId} 的 arena_stage 数据时出错: ${error.message}`);
        }
    }

    return result;
}

