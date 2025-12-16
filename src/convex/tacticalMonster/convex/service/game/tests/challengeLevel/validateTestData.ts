/**
 * 挑战关卡测试数据验证函数（TacticalMonster模块）
 */

import { TIER_CONFIGS } from "../../../../data/tierConfigs";
import { MonsterRumbleTierService } from "../../../tier/monsterRumbleTierService";

/**
 * 验证游戏相关测试数据
 * 
 * 注意：地图配置现在从 StageRuleConfig.stageContent.mapConfig 中读取，不再验证数据库中的 levelConfig
 */
export async function validateGameTestData(
    ctx: any,
    playerIds: string[],
    monsterConfigIds: string[],
    levelConfigId?: string  // 可选，已废弃，保留用于向后兼容
) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. 验证怪物配置
    for (const monsterId of monsterConfigIds) {
        const config = await ctx.db
            .query("mr_monster_configs")
            .withIndex("by_monsterId", (q: any) => q.eq("monsterId", monsterId))
            .first();

        if (!config) {
            errors.push(`怪物配置不存在: ${monsterId}`);
        }
    }

    // 2. 验证玩家怪物和队伍Power
    for (const uid of playerIds) {
        // 先检查玩家是否有怪物
        const monsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        if (monsters.length === 0) {
            errors.push(`玩家 ${uid} 没有怪物`);
            continue;
        }

        // 获取上场队伍（使用索引优化查询，只查询 teamPosition >= 0 的记录）
        const teamMonsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid_teamPosition", (q: any) =>
                q.eq("uid", uid)
                    .gte("teamPosition", 0)
            )
            .collect();

        const team = teamMonsters
            .sort((a: any, b: any) => (a.teamPosition || 0) - (b.teamPosition || 0))
            .slice(0, 4);

        if (team.length === 0) {
            warnings.push(`玩家 ${uid} 没有配置上场队伍（teamPosition为空）`);
            continue;
        }

        if (team.length < 4) {
            warnings.push(`玩家 ${uid} 的队伍只有${team.length}个怪物，建议4个`);
        }

        // 验证Power（需要根据玩家等级判断Tier）
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (player) {
            // 根据玩家等级判断Tier
            let expectedTier: string | null = null;
            if (player.level >= 1 && player.level < 11) {
                expectedTier = "bronze";
            } else if (player.level >= 11 && player.level < 31) {
                expectedTier = "silver";
            } else if (player.level >= 31 && player.level < 51) {
                expectedTier = "gold";
            } else if (player.level >= 51) {
                expectedTier = "platinum";
            }

            if (expectedTier) {
                const tierConfig = TIER_CONFIGS[expectedTier as keyof typeof TIER_CONFIGS];
                try {
                    const validation = await MonsterRumbleTierService.validatePowerRange(
                        ctx,
                        uid,
                        expectedTier
                    );

                    if (!validation.valid) {
                        errors.push(`玩家 ${uid} ${validation.reason}`);
                    } else {
                        // Power在范围内，验证是否符合预期范围
                        if (validation.teamPower !== undefined) {
                            if (
                                validation.teamPower < tierConfig.powerMin ||
                                (tierConfig.powerMax !== Infinity &&
                                    validation.teamPower > tierConfig.powerMax)
                            ) {
                                warnings.push(
                                    `玩家 ${uid} 的队伍Power（${validation.teamPower}）不在Tier ${expectedTier} 的预期范围内（${tierConfig.powerMin}-${tierConfig.powerMax}）`
                                );
                            }
                        }
                    }
                } catch (error: any) {
                    warnings.push(`无法验证玩家 ${uid} 的Power: ${error.message}`);
                }
            }
        }
    }

    // 3. 验证地图配置（已废弃：不再验证数据库中的 levelConfig）
    // 所有配置现在在 StageRuleConfig.stageContent.mapConfig 中手动配置
    if (levelConfigId) {
        warnings.push(`levelConfigId 参数已废弃，地图配置应在 StageRuleConfig.stageContent.mapConfig 中验证`);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

