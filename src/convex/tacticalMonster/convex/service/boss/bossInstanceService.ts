/**
 * Boss实例服务
 * 管理Boss组合的游戏实例创建（创建多个角色）
 */

import { applyBossScale, BossConfig, getBossConfig, getMergedBossConfig } from "../../data/bossConfigs";
import { MONSTER_CONFIGS_MAP } from "../../data/monsterConfigs.js";
import { HexCoord } from "../../utils/hexUtils";

export interface BossPositions {
    bossMain: HexCoord;
    minions: Array<{ minionId: string; position: HexCoord }>;
}

export class BossInstanceService {
    /**
     * 创建Boss组合实例（Boss本体 + 所有小怪）
     * 会在tacticalMonster_game_character中创建多个角色
     * 
     * @param ctx Convex上下文
     * @param params 创建参数
     * @param params.scalingConfig 缩放配置（可选）
     *   - 单人挑战关卡：需要 difficultyMultiplier、playerPower、baseBossPower
     *     计算流程：目标Boss Power = 玩家Power × difficultyMultiplier
     *             缩放比例 = 目标Boss Power / 基础Boss Power
     *   - 多人PVE锦标赛：需要 avgTierPower 和 playerPower
     *     使用公式：scale = K × (Avg_Tier_Power / Player_Power)
     *   - 如果不提供：不缩放，使用基础属性
     */
    static async createBossInstance(
        ctx: any,
        params: {
            gameId: string;
            bossId: string;
            levelId: string;
            positions: BossPositions;
            behaviorSeed: string;
        }
    ): Promise<{
        bossInstanceId: string;
        characterIds: {
            bossMain: string;
            minions: string[];
        };
        appliedScale?: number;  // 应用的缩放倍数
    }> {
        const bossConfig = getBossConfig(params.bossId);
        if (!bossConfig) {
            throw new Error(`Boss配置不存在: ${params.bossId}`);
        }

        // 计算缩放倍数
        let scale = 1.0;
        // 1. 创建Boss本体角色（应用缩放）
        const bossMainCharacterId = await this.createBossMainCharacter(
            ctx,
            params.gameId,
            bossConfig,
            params.positions.bossMain,
            scale  // 传递缩放倍数
        );

        // 2. 创建小怪角色
        const minionCharacterIds: string[] = [];
        if (bossConfig.minions && params.positions.minions) {
            for (const minionPos of params.positions.minions) {
                const minionConfig = bossConfig.minions.find(
                    m => minionPos.minionId.startsWith(m.minionId)
                );
                if (minionConfig) {
                    const minionCharId = await this.createMinionCharacter(
                        ctx,
                        params.gameId,
                        minionConfig,
                        minionPos.position
                    );
                    minionCharacterIds.push(minionCharId);
                }
            }
        }

        // 3. 创建Boss实例记录
        const bossInstanceId = `boss_instance_${params.gameId}_${Date.now()}`;
        await ctx.db.insert("mr_boss_instances", {
            bossInstanceId,
            gameId: params.gameId,
            bossId: params.bossId,
            levelId: params.levelId,
            characterIds: {
                bossMain: bossMainCharacterId,
                minions: minionCharacterIds,
            },
            currentPhase: bossConfig.phases?.[0]?.phaseName || "phase1",
            status: "alive",
            behaviorSeed: params.behaviorSeed,
            createdAt: new Date().toISOString(),
        });

        return {
            bossInstanceId,
            characterIds: {
                bossMain: bossMainCharacterId,
                minions: minionCharacterIds,
            },
            appliedScale: scale,  // 返回应用的缩放倍数
        };
    }

    /**
     * 创建Boss本体角色
     * 
     * @param scale 缩放倍数（默认1.0，不缩放）
     */
    private static async createBossMainCharacter(
        ctx: any,
        gameId: string,
        bossConfig: BossConfig,
        position: HexCoord,
        scale: number = 1.0  // 新增：缩放倍数参数
    ): Promise<string> {
        // 获取合并后的配置（包含从 characterId 继承的属性）
        const mergedConfig = getMergedBossConfig(bossConfig.bossId);
        if (!mergedConfig) {
            throw new Error(`无法获取合并后的Boss配置: ${bossConfig.bossId}`);
        }

        const characterId = `boss_main_${gameId}_${Date.now()}`;

        // 应用缩放到Boss属性
        const scaledStats = applyBossScale(mergedConfig, scale);

        // 计算Boss属性（应用缩放后的值）
        const stats = {
            hp: { current: scaledStats.hp, max: scaledStats.hp },
            mp: { current: 100, max: 100 },
            stamina: { current: 100, max: 100 },
            attack: scaledStats.attack,
            defense: scaledStats.defense,
            speed: scaledStats.speed,
        };

        await ctx.db.insert("tacticalMonster_game_character", {
            gameId,
            character_id: characterId,
            uid: "boss",  // 使用"boss"作为uid标识
            name: mergedConfig.name,
            level: 1,  // Boss等级可以根据Tier调整
            stats,
            q: position.q,
            r: position.r,
            facing: 0,
            skills: mergedConfig.skills || [],
            asset: mergedConfig.assetPath,
            class: "boss",
            move_range: 2,
            attack_range: { min: 1, max: 3 },
        });

        return characterId;
    }

    /**
     * 创建小怪角色
     */
    private static async createMinionCharacter(
        ctx: any,
        gameId: string,
        minionConfig: any,  // MinionConfig from bossConfigs
        position: HexCoord
    ): Promise<string> {
        const characterId = `minion_${minionConfig.minionId}_${gameId}_${Date.now()}`;

        // 获取小怪的角色配置（从 monsterId 引用）
        const characterConfig = MONSTER_CONFIGS_MAP[minionConfig.monsterId];

        if (!characterConfig) {
            throw new Error(`小怪角色配置不存在: ${minionConfig.characterId}`);
        }

        // 合并配置（MinionConfig 的覆盖属性优先）
        const mergedName = minionConfig.name || characterConfig.name;
        const mergedHp = minionConfig.baseHp ?? characterConfig.baseHp;
        const mergedDamage = minionConfig.baseDamage ?? characterConfig.baseDamage;
        const mergedDefense = minionConfig.baseDefense ?? characterConfig.baseDefense;
        const mergedSpeed = minionConfig.baseSpeed ?? characterConfig.baseSpeed;
        const mergedSkills = minionConfig.skills || characterConfig.skills || [];
        const mergedAssetPath = minionConfig.assetPath || characterConfig.assetPath;

        const stats = {
            hp: { current: mergedHp, max: mergedHp },
            mp: { current: 50, max: 50 },
            stamina: { current: 50, max: 50 },
            attack: mergedDamage,
            defense: mergedDefense,
            speed: mergedSpeed,
        };

        await ctx.db.insert("tacticalMonster_game_character", {
            gameId,
            character_id: characterId,
            uid: "boss",  // 小怪也使用"boss"作为uid
            name: mergedName,
            level: 1,
            stats,
            q: position.q,
            r: position.r,
            facing: 0,
            skills: mergedSkills,
            asset: mergedAssetPath,
            class: "minion",
            move_range: 2,
            attack_range: { min: 1, max: 2 },
        });

        return characterId;
    }

    /**
     * 获取Boss组合实例
     */
    static async getBossInstance(ctx: any, gameId: string): Promise<any | null> {
        const instance = await ctx.db
            .query("mr_boss_instances")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .first();

        return instance || null;
    }

    /**
     * 检查Boss组合状态（Boss本体是否存活）
     */
    static async checkBossStatus(
        ctx: any,
        bossInstanceId: string
    ): Promise<"alive" | "defeated"> {
        const instance = await ctx.db
            .query("mr_boss_instances")
            .filter((q: any) => q.eq(q.field("bossInstanceId"), bossInstanceId))
            .first();

        if (!instance) {
            return "defeated";
        }

        // 检查Boss本体是否存活（通过character表的HP判断）
        const bossMain = await ctx.db
            .query("tacticalMonster_game_character")
            .withIndex("by_game", (q: any) => q.eq("gameId", instance.gameId))
            .filter((q: any) => q.eq(q.field("character_id"), instance.characterIds.bossMain))
            .first();

        if (!bossMain || (bossMain.stats?.hp?.current || 0) <= 0) {
            // 更新Boss实例状态
            await ctx.db.patch(instance._id, {
                status: "defeated",
                updatedAt: new Date().toISOString(),
            });
            return "defeated";
        }

        return "alive";
    }
}
