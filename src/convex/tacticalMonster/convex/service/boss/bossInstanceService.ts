/**
 * Boss实例服务
 * 管理Boss组合的游戏实例创建（创建多个角色）
 */

import { BossConfigService } from "./bossConfigService";
import { BossConfig } from "../../data/bossConfigs";
import { HexCoord } from "../../utils/hexUtils";

export interface BossPositions {
    bossMain: HexCoord;
    minions: Array<{ minionId: string; position: HexCoord }>;
}

export class BossInstanceService {
    /**
     * 创建Boss组合实例（Boss本体 + 所有小怪）
     * 会在tacticalMonster_game_character中创建多个角色
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
    }> {
        const bossConfig = BossConfigService.getBossConfig(params.bossId);
        if (!bossConfig) {
            throw new Error(`Boss配置不存在: ${params.bossId}`);
        }

        // 1. 创建Boss本体角色
        const bossMainCharacterId = await this.createBossMainCharacter(
            ctx,
            params.gameId,
            bossConfig,
            params.positions.bossMain
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
        };
    }

    /**
     * 创建Boss本体角色
     */
    private static async createBossMainCharacter(
        ctx: any,
        gameId: string,
        bossConfig: BossConfig,
        position: HexCoord
    ): Promise<string> {
        const characterId = `boss_main_${gameId}_${Date.now()}`;

        // 计算Boss属性（可根据level/scale调整）
        const stats = {
            hp: { current: bossConfig.baseHp, max: bossConfig.baseHp },
            mp: { current: 100, max: 100 },
            stamina: { current: 100, max: 100 },
            attack: bossConfig.baseDamage,
            defense: bossConfig.baseDefense,
            speed: bossConfig.baseSpeed || 10,
        };

        await ctx.db.insert("tacticalMonster_game_character", {
            gameId,
            character_id: characterId,
            uid: "boss",  // 使用"boss"作为uid标识
            name: bossConfig.name,
            level: 1,  // Boss等级可以根据Tier调整
            stats,
            q: position.q,
            r: position.r,
            facing: 0,
            skills: bossConfig.skills || [],
            asset: bossConfig.assetPath,  // 简化：直接使用路径字符串
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

        const stats = {
            hp: { current: minionConfig.baseHp, max: minionConfig.baseHp },
            mp: { current: 50, max: 50 },
            stamina: { current: 50, max: 50 },
            attack: minionConfig.baseDamage,
            defense: minionConfig.baseDefense,
            speed: minionConfig.baseSpeed,
        };

        await ctx.db.insert("tacticalMonster_game_character", {
            gameId,
            character_id: characterId,
            uid: "boss",  // 小怪也使用"boss"作为uid
            name: minionConfig.name,
            level: 1,
            stats,
            q: position.q,
            r: position.r,
            facing: 0,
            skills: minionConfig.skills || [],
            asset: minionConfig.assetPath,  // 简化：直接使用路径字符串
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
