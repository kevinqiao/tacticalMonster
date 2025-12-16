/**
 * 挑战关卡测试数据生成函数（TacticalMonster模块）
 * 负责创建怪物配置、玩家怪物、队伍
 * 
 * 注意：地图配置现在必须在 StageRuleConfig.stageContent.mapConfig 中手动配置
 */

import { MONSTER_CONFIGS_MAP } from "../../../../data/monsterConfigs";
import { TIER_CONFIGS } from "../../../../data/tierConfigs";

/**
 * 创建测试怪物配置（如果不存在）
 * @returns 创建的怪物ID列表
 */
export async function createTestMonsterConfigs(ctx: any): Promise<string[]> {
    const monsterIds: string[] = [
        // Legendary (用于Boss配置)
        "monster_001",
        "monster_002",
        "monster_003",
        "monster_004",
        // Epic (用于Gold Tier测试)
        "monster_005",
        "monster_006",
        // Rare (用于Silver Tier测试)
        "monster_014",
        "monster_015",
        // Common (用于Bronze Tier测试)
        "monster_037",
        "monster_038",
    ];

    const createdIds: string[] = [];

    for (const monsterId of monsterIds) {
        // 检查是否已存在
        const existing = await ctx.db
            .query("mr_monster_configs")
            .withIndex("by_monsterId", (q: any) => q.eq("monsterId", monsterId))
            .first();

        if (!existing) {
            // 从 MONSTER_CONFIGS 获取配置
            const config = MONSTER_CONFIGS_MAP[monsterId];
            if (!config) {
                console.warn(`怪物配置不存在: ${monsterId}，跳过创建`);
                continue;
            }

            // 插入数据库
            await ctx.db.insert("mr_monster_configs", {
                monsterId: config.monsterId,
                name: config.name,
                rarity: config.rarity,
                class: config.class,
                race: config.race,
                baseHp: config.baseHp,
                baseDamage: config.baseDamage,
                baseDefense: config.baseDefense,
                baseSpeed: config.baseSpeed,
                skills: config.skills,
                growthRates: config.growthRates,
                assetPath: config.assetPath,
                configVersion: 1,
            });

            createdIds.push(monsterId);
        } else {
            createdIds.push(monsterId);
        }
    }

    return createdIds;
}

/**
 * 计算怪物Power（基于实际配置）
 * Power = (HP + Attack * 2 + Defense * 1.5) * LevelMultiplier * StarMultiplier
 */
async function calculateMonsterPowerFromConfig(
    ctx: any,
    monsterId: string,
    level: number,
    stars: number
): Promise<number> {
    // 获取怪物配置
    const config = await ctx.db
        .query("mr_monster_configs")
        .withIndex("by_monsterId", (q: any) => q.eq("monsterId", monsterId))
        .first();

    if (!config) {
        throw new Error(`怪物配置不存在: ${monsterId}`);
    }

    // 计算等级和星级加成的属性
    // 根据growthRates的注释，每级增长15%基础HP，10%基础伤害，12%基础防御
    // 但由于growthRates存储的是绝对值，我们需要计算回百分比，或者直接使用百分比
    // 为了与MonsterRumbleTierService保持一致，使用百分比增长公式
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
 * 创建测试玩家怪物和队伍
 * @param ctx Convex context
 * @param playerIds 玩家UID列表
 * @returns 创建的怪物记录信息
 */
export async function createTestPlayerMonsters(
    ctx: any,
    playerIds: string[]
): Promise<{
    [uid: string]: {
        monsterIds: string[];
        teamPower: number;
    };
}> {
    const nowISO = new Date().toISOString();
    const result: {
        [uid: string]: {
            monsterIds: string[];
            teamPower: number;
        };
    } = {};

    // 为每个玩家配置不同Tier的队伍
    // 注意：Power计算公式：Power = (HP + Attack*2 + Defense*1.5) * StarMultiplier
    // 其中HP/Attack/Defense = base * (1 + (level-1) * growthRate)
    // 由于Epic/Legendary怪物基础属性太高，需要使用Common怪物或降低队伍数量
    const playerTierConfig = {
        test_player_bronze: {
            tier: "bronze",
            targetPower: { min: 800, max: 1000 },
            // 只使用1个Common怪物，确保Power在范围内
            // Common怪物（骷髅战士，baseHp:600）level 1, stars 1: Power ≈ 920
            // 1个怪物 Power ≈ 920，在Bronze Tier范围内 (0-2000)
            monsters: [
                { monsterId: "monster_037", level: 1, stars: 1, teamPosition: 0 }, // Common: 骷髅战士
            ],
        },
        test_player_silver: {
            tier: "silver",
            targetPower: { min: 2500, max: 3000 },
            // 使用Epic怪物，等级2-3，1星，3个怪物
            monsters: [
                { monsterId: "monster_005", level: 2, stars: 1, teamPosition: 0 },
                { monsterId: "monster_005", level: 2, stars: 1, teamPosition: 1 },
                { monsterId: "monster_005", level: 3, stars: 1, teamPosition: 2 },
            ],
        },
        test_player_gold: {
            tier: "gold",
            targetPower: { min: 5000, max: 6000 },
            // 使用Epic怪物，等级5-6，2星，4个怪物
            monsters: [
                { monsterId: "monster_005", level: 5, stars: 2, teamPosition: 0 },
                { monsterId: "monster_005", level: 5, stars: 2, teamPosition: 1 },
                { monsterId: "monster_005", level: 6, stars: 2, teamPosition: 2 },
                { monsterId: "monster_005", level: 6, stars: 2, teamPosition: 3 },
            ],
        },
    };

    for (const uid of playerIds) {
        const config = playerTierConfig[uid as keyof typeof playerTierConfig];
        if (!config) {
            console.warn(`未找到玩家配置: ${uid}，跳过`);
            continue;
        }

        let totalTeamPower = 0;
        const createdMonsterIds: string[] = [];

        // 清理玩家现有的队伍配置
        // 策略：先清除所有怪物的teamPosition，然后只设置配置中的怪物
        const existingMonsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        // 获取配置中的monsterId集合
        const configMonsterIds = new Set(config.monsters.map((m: any) => m.monsterId));

        // 第一步：清除所有现有怪物的teamPosition（完全清理队伍）
        // 注意：在 Convex 中，清除可选字段应使用 undefined 而不是 null
        let clearedCount = 0;
        for (const monster of existingMonsters) {
            if (monster.teamPosition !== null && monster.teamPosition !== undefined) {
                await ctx.db.patch(monster._id, {
                    teamPosition: undefined,
                    updatedAt: nowISO,
                });
                clearedCount++;
            }
        }
        if (clearedCount > 0) {
            console.log(`[${uid}] 清除了 ${clearedCount} 个怪物的队伍位置（完全清理队伍）`);
        }

        // 第二步：清理不在配置中的怪物（可选，用于日志）
        let removedFromTeamCount = 0;
        for (const monster of existingMonsters) {
            if (!configMonsterIds.has(monster.monsterId)) {
                removedFromTeamCount++;
            }
        }
        if (removedFromTeamCount > 0) {
            console.log(`[${uid}] 注意：有 ${removedFromTeamCount} 个怪物不在新配置中，它们已被从队伍中移除`);
        }

        // 创建/更新配置中的怪物
        for (const monsterConfig of config.monsters) {
            // 检查玩家是否已拥有该怪物
            const existing = await ctx.db
                .query("mr_player_monsters")
                .withIndex("by_uid_monsterId", (q: any) =>
                    q.eq("uid", uid).eq("monsterId", monsterConfig.monsterId)
                )
                .first();

            if (existing) {
                // 更新现有怪物
                await ctx.db.patch(existing._id, {
                    level: monsterConfig.level,
                    stars: monsterConfig.stars,
                    teamPosition: monsterConfig.teamPosition,
                    updatedAt: nowISO,
                });

                // 计算Power
                const power = await calculateMonsterPowerFromConfig(
                    ctx,
                    monsterConfig.monsterId,
                    monsterConfig.level,
                    monsterConfig.stars
                );
                totalTeamPower += power;
            } else {
                // 创建新怪物
                await ctx.db.insert("mr_player_monsters", {
                    uid,
                    monsterId: monsterConfig.monsterId,
                    level: monsterConfig.level,
                    stars: monsterConfig.stars,
                    experience: 0,
                    shards: 0,
                    unlockedSkills: [],
                    teamPosition: monsterConfig.teamPosition,
                    obtainedAt: nowISO,
                    updatedAt: nowISO,
                });

                // 计算Power
                const power = await calculateMonsterPowerFromConfig(
                    ctx,
                    monsterConfig.monsterId,
                    monsterConfig.level,
                    monsterConfig.stars
                );
                totalTeamPower += power;
            }

            createdMonsterIds.push(monsterConfig.monsterId);
        }

        // 验证队伍Power是否在Tier范围内
        const tierConfig = TIER_CONFIGS[config.tier as keyof typeof TIER_CONFIGS];
        console.log(`[${uid}] 队伍配置完成: ${config.monsters.length} 个怪物，总Power: ${totalTeamPower} (目标范围: ${tierConfig.powerMin}-${tierConfig.powerMax})`);

        if (
            totalTeamPower < tierConfig.powerMin ||
            (tierConfig.powerMax !== Infinity && totalTeamPower > tierConfig.powerMax)
        ) {
            console.warn(
                `⚠️ 玩家 ${uid} 队伍Power ${totalTeamPower} 不在Tier ${config.tier} 范围内 (${tierConfig.powerMin}-${tierConfig.powerMax})`
            );
        } else {
            console.log(`✅ 玩家 ${uid} 队伍Power验证通过`);
        }

        result[uid] = {
            monsterIds: createdMonsterIds,
            teamPower: totalTeamPower,
        };
    }

    return result;
}

/**
 * 创建测试地图配置
 * @deprecated 已废弃：所有配置现在必须在 StageRuleConfig.stageContent.mapConfig 中手动配置
 * 不再需要创建数据库中的 level config
 */
export async function createTestLevelConfig(
    ctx: any,
    tier: string,
    bossId: string
): Promise<string> {
    // 不再创建数据库配置，所有配置应在 StageRuleConfig 中手动配置
    console.warn(`createTestLevelConfig 已废弃。所有配置应在 StageRuleConfig.stageContent.mapConfig 中手动配置。`);
    return `level_${tier}_${bossId}`;
}

/**
 * 创建测试地图模板（可选）
 * @param tier Tier名称
 * @returns 创建的模板ID
 */
export async function createTestMapTemplate(ctx: any, tier: string): Promise<string> {
    const templateId = `template_${tier}_1`;
    const tierConfig = TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS];
    if (!tierConfig) {
        throw new Error(`Tier配置不存在: ${tier}`);
    }

    // 检查是否已存在
    const existing = await ctx.db
        .query("mr_map_templates")
        .withIndex("by_templateId", (q: any) => q.eq("templateId", templateId))
        .first();

    // 使用默认地图大小（如果测试需要特定大小，应从 StageRuleConfig 中读取）
    // 这里使用简单的默认值
    const mapSize = { rows: 10, cols: 10 };  // 默认大小

    const templateData = {
        templateId,
        name: `${tier} Tier 地图模板`,
        tier: tier,
        mapSize,
        coreObstacles: [],
        optionalObstacles: [],
        restrictedZones: [
            {
                type: "player",
                region: {
                    minQ: 0,
                    maxQ: Math.floor(mapSize.cols * 0.4),
                    minR: Math.floor(mapSize.rows * 0.6),
                    maxR: mapSize.rows - 1,
                },
            },
            {
                type: "boss",
                region: {
                    minQ: Math.floor(mapSize.cols * 0.7) - 3,
                    maxQ: Math.floor(mapSize.cols * 0.7) + 3,
                    minR: Math.floor(mapSize.rows * 0.3) - 3,
                    maxR: Math.floor(mapSize.rows * 0.3) + 3,
                },
            },
        ],
        configVersion: 1,
    };

    if (existing) {
        await ctx.db.patch(existing._id, templateData);
    } else {
        await ctx.db.insert("mr_map_templates", templateData);
    }

    return templateId;
}

