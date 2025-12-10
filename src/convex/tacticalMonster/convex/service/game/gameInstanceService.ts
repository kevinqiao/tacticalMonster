/**
 * 游戏实例服务
 * 创建Monster Rumble游戏实例（包含动态生成的关卡）
 */

import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { BossConfigService } from "../boss/bossConfigService";
import { BossInstanceService } from "../boss/bossInstanceService";
import { BossScalingConfig, BossScalingService } from "../boss/bossScalingService";
import { LevelGenerationService } from "../level/levelGenerationService";
import { MonsterRumbleTierService } from "../tier/monsterRumbleTierService";

export class GameInstanceService {
    /**
     * 创建Monster Rumble游戏实例（包含动态生成的关卡）
     * 
     * @param params.scalingConfig 缩放配置（可选）
     *   - 如果提供，将应用Boss属性缩放
     *   - 如果不提供，将尝试从tournament配置中获取
     */
    static async createMonsterRumbleGame(
        ctx: any,
        params: {
            matchId: string;
            tier: string;
            bossId?: string;
            maxPlayers?: number;
            seed?: string;
            // 缩放相关参数
            typeId?: string;  // 锦标赛类型ID（用于获取difficultyAdjustment配置）
            playerUid?: string;  // 玩家UID（用于计算玩家Power，用于自适应缩放）
            playerPowers?: Array<{ uid: string; power: number }>;  // 所有玩家的Power（多人PVE锦标赛）
            scalingConfig?: BossScalingConfig;  // 直接提供的缩放配置（优先级最高）
        }
    ): Promise<{ gameId: string; level: any; appliedScale?: number }> {
        const { matchId, tier, bossId, maxPlayers = 20, seed, typeId, playerUid, playerPowers, scalingConfig } = params;

        // 1. 生成关卡（包含Boss组合和地图障碍物）
        const level = await LevelGenerationService.generateLevel(
            ctx,
            tier,
            bossId,
            seed
        );

        // 2. 创建游戏主记录
        const gameId = `mr_game_${matchId}_${Date.now()}`;
        const timeoutAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5分钟超时
        const gameSeed = seed || `game_${Date.now()}_${Math.random()}`;

        await ctx.db.insert("tacticalMonster_game", {
            gameId,
            matchId,
            tier,
            bossId: level.bossId,
            maxPlayers,
            currentPlayers: 0,
            status: "waiting",
            map: level.mapId,  // 使用动态生成的地图ID
            timeoutAt,
            seed: gameSeed,
            createdAt: new Date().toISOString(),
        });

        // 3. 计算缩放配置
        let finalScalingConfig: BossScalingConfig | undefined = scalingConfig;

        // 如果没有直接提供缩放配置，尝试从锦标赛配置获取
        if (!finalScalingConfig && typeId) {
            // 如果是单人关卡但没有playerPowers，尝试获取玩家Power
            let resolvedPlayerPowers = playerPowers;
            if (!resolvedPlayerPowers && playerUid) {
                try {
                    const playerPower = await MonsterRumbleTierService.calculateTeamPower(ctx, playerUid);
                    resolvedPlayerPowers = [{ uid: playerUid, power: playerPower }];
                } catch (error) {
                    console.warn(`无法获取玩家Power: ${playerUid}`, error);
                }
            }

            finalScalingConfig = await this.getScalingConfigFromTournament(
                ctx,
                typeId,
                playerUid,
                resolvedPlayerPowers,
                tier
            );
        }

        // 4. 如果是单人挑战关卡自适应模式，需要在创建Boss前计算baseBossPower
        // （因为此时已经知道level.bossId）
        if (finalScalingConfig &&
            finalScalingConfig.difficultyMultiplier !== undefined &&
            finalScalingConfig.playerPower !== undefined &&
            finalScalingConfig.baseBossPower === undefined &&
            level.bossId) {
            // 获取合并后的Boss配置并计算基础Power
            const mergedConfig = BossConfigService.getMergedBossConfig(level.bossId);
            if (mergedConfig) {
                finalScalingConfig.baseBossPower = BossScalingService.calculateBossPower(mergedConfig);
            }
        }

        // 5. 创建Boss组合实例（应用缩放）
        const bossInstanceResult = await BossInstanceService.createBossInstance(
            ctx,
            {
                gameId,
                bossId: level.bossId,
                levelId: level.levelId,
                positions: level.bossPositions,
                behaviorSeed: gameSeed,
                scalingConfig: finalScalingConfig,  // 传递缩放配置（包含完整的缩放参数）
            }
        );

        return {
            gameId,
            level,
            appliedScale: bossInstanceResult.appliedScale,
        };
    }

    /**
     * 从锦标赛配置获取缩放配置
     * 
     * @param typeId 锦标赛类型ID
     * @param playerUid 玩家UID（单人关卡使用）
     * @param playerPowers 所有玩家Power（多人PVE锦标赛使用）
     * @param tier Tier（用于EMA查询）
     * @returns 缩放配置
     */
    private static async getScalingConfigFromTournament(
        ctx: any,
        typeId: string,
        playerUid?: string,
        playerPowers?: Array<{ uid: string; power: number }>,
        tier?: string
    ): Promise<BossScalingConfig | undefined> {
        // 1. 查询锦标赛类型配置
        const tournamentType = await ctx.db
            .query("tournament_types")
            .withIndex("by_typeId", (q: any) => q.eq("typeId", typeId))
            .first();

        if (!tournamentType) {
            console.warn(`锦标赛类型不存在: ${typeId}，将不应用缩放`);
            return undefined;
        }

        // 2. 获取难度调整配置
        const difficultyAdjustment = (tournamentType as any).soloChallenge?.levelContent?.difficultyAdjustment;

        if (!difficultyAdjustment) {
            // 没有配置，不缩放
            return undefined;
        }

        // 3. 判断是单人关卡还是多人PVE锦标赛
        const isSinglePlayer = tournamentType.matchRules?.minPlayers === 1 && tournamentType.matchRules?.maxPlayers === 1;
        const isPowerBasedScaling = difficultyAdjustment.powerBasedScaling === true;

        // 4. 单人挑战关卡自适应模式
        // difficultyMultiplier 表示 "Boss Power / Player Team Power" 的目标比率
        if (isSinglePlayer && difficultyAdjustment.difficultyMultiplier !== undefined) {
            // 获取玩家Power（如果未提供，尝试计算）
            let resolvedPlayerPower: number | undefined;

            if (playerUid && !playerPowers) {
                try {
                    resolvedPlayerPower = await MonsterRumbleTierService.calculateTeamPower(ctx, playerUid);
                } catch (error) {
                    console.warn(`无法获取玩家Power: ${playerUid}`, error);
                }
            } else if (playerPowers && playerPowers.length > 0) {
                // 如果提供了playerPowers，使用第一个玩家的Power（单人关卡只有一个玩家）
                resolvedPlayerPower = playerPowers[0].power;
            }

            if (resolvedPlayerPower !== undefined) {
                // 获取Boss基础配置，计算基础Boss Power
                // 注意：这里需要知道bossId才能计算，但bossId可能还未确定
                // 暂时返回配置，基础Boss Power将在创建Boss实例时计算
                return {
                    difficultyMultiplier: difficultyAdjustment.difficultyMultiplier,
                    playerPower: resolvedPlayerPower,
                    // baseBossPower 将在创建Boss时从实际BossConfig计算
                };
            } else {
                // 如果无法获取玩家Power，返回配置但不包含playerPower
                // 调用方需要在创建Boss时提供playerPower和baseBossPower
                return {
                    difficultyMultiplier: difficultyAdjustment.difficultyMultiplier,
                };
            }
        }

        // 5. 自适应缩放模式（多人PVE锦标赛）
        if (isPowerBasedScaling && playerPowers && playerPowers.length > 0) {
            // 计算房间平均Power（异步查询EMA）
            const avgTierPower = await BossScalingService.calculateAvgTierPower(
                ctx,
                playerPowers.map(p => p.power),
                tier
            );

            // 如果提供了playerUid，为该玩家计算缩放配置
            if (playerUid) {
                const playerPowerData = playerPowers.find(p => p.uid === playerUid);
                if (playerPowerData) {
                    return {
                        baseK: 1.2,  // 默认基础缩放系数
                        minScale: difficultyAdjustment.minMultiplier ?? 0.95,
                        maxScale: difficultyAdjustment.maxMultiplier ?? 1.05,
                        avgTierPower,
                        playerPower: playerPowerData.power,  // 当前玩家的Power
                    };
                }
            }

            // 如果没有playerUid或找不到玩家数据，返回通用配置（avgTierPower，但没有playerPower）
            // 这种情况下，调用方需要在创建Boss时提供playerPower
            return {
                baseK: 1.2,  // 默认基础缩放系数
                minScale: difficultyAdjustment.minMultiplier ?? 0.95,
                maxScale: difficultyAdjustment.maxMultiplier ?? 1.05,
                avgTierPower,
            };
        }

        return undefined;
    }
}

/**
 * Internal mutation: 创建Monster Rumble游戏实例
 * 可以在匹配成功后调用此mutation来创建游戏
 */
export const createMonsterRumbleGameInstance = internalMutation({
    args: {
        matchId: v.string(),
        tier: v.string(),
        bossId: v.optional(v.string()),
        maxPlayers: v.optional(v.number()),
        seed: v.optional(v.string()),
        // 缩放相关参数
        typeId: v.optional(v.string()),  // 锦标赛类型ID
        playerUid: v.optional(v.string()),  // 玩家UID（单人关卡）
        playerPowers: v.optional(v.array(v.object({
            uid: v.string(),
            power: v.number(),
        }))),  // 所有玩家Power（多人PVE锦标赛）
    },
    handler: async (ctx, args) => {
        const result = await GameInstanceService.createMonsterRumbleGame(
            ctx,
            {
                matchId: args.matchId,
                tier: args.tier,
                bossId: args.bossId,
                maxPlayers: args.maxPlayers || 20,
                seed: args.seed,
                typeId: args.typeId,
                playerUid: args.playerUid,
                playerPowers: args.playerPowers,
            }
        );

        return result;
    },
});
