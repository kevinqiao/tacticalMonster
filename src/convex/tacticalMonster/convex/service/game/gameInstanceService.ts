/**
 * 游戏实例服务
 * 创建Monster Rumble游戏实例（包含动态生成的关卡）
 */

import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { BossConfigService } from "../boss/bossConfigService";
import { BossInstanceService, BossPositions } from "../boss/bossInstanceService";
import { BossScalingConfig, BossScalingService } from "../boss/bossScalingService";
import { StageManagerService } from "../stage/stageManagerService";
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
            ruleId?: string;  // 新增：StageRuleConfig ruleId，如果提供则使用 StageManagerService 创建 stage
        }
    ): Promise<{ gameId: string; appliedScale?: number; stageId?: string }> {
        const { matchId, tier, bossId, maxPlayers = 20, seed, typeId, playerUid, playerPowers, scalingConfig, ruleId } = params;

        let stageId: string | undefined;

        // 1. 生成关卡（包含Boss组合和地图障碍物）
        // 要求必须提供 ruleId，所有配置必须在 StageRuleConfig.stageContent.mapConfig 中手动配置
        if (!ruleId) {
            throw new Error(
                `ruleId 是必需的。请使用 StageManagerService.createStage(ruleId) 并确保 StageRuleConfig.stageContent.mapConfig 已配置。`
            );
        }

        // 1.1 获取 stage 配置
        const stageConfig = StageManagerService.getStageConfig(ruleId);
        const bossIdFromConfig = stageConfig.stageContent?.bossConfig?.bossId ||
            (stageConfig.stageContent?.bossConfig?.bossPool &&
                stageConfig.stageContent.bossConfig.bossPool[0]);
        if (!bossIdFromConfig) {
            throw new Error(`无法确定 Boss ID：stageConfig.bossConfig 配置无效`);
        }

        // 1.2 从 BossConfig 获取 bossPositions（Boss定义中包含位置信息）
        const bossConfig = BossConfigService.getBossConfig(bossIdFromConfig);
        if (!bossConfig) {
            throw new Error(`Boss配置不存在: ${bossIdFromConfig}`);
        }

        // 从BossConfig中获取位置信息（Boss定义中包含position包括小怪）
        // 如果BossConfig中没有位置信息，使用默认位置
        const bossPositions: BossPositions = {
            bossMain: (bossConfig as any).position || { q: 0, r: 0 }, // 如果BossConfig中有position则使用
            minions: (bossConfig.minions || []).flatMap((minion: any) => {
                const positions = minion.positions || []; // 如果minion配置中有positions则使用
                return Array.from({ length: minion.quantity }, (_, i) => ({
                    minionId: `${minion.minionId}_${i}`,
                    position: positions[i] || { q: 0, r: 0 }, // 默认位置
                }));
            }),
        };

        // 1.3 为玩家提供4个空位（玩家手动部署，只保留区域定义）
        const { mapConfig } = stageConfig;
        const { rows, cols } = mapConfig.mapSize;


        // 1.4 计算 difficulty（Boss Power / Player Team Power 比率）
        // 先获取缩放配置来计算 difficulty
        let calculatedDifficulty = 1.0; // 默认值
        if (typeId) {
            const tempScalingConfig = await this.getScalingConfigFromTournament(
                ctx,
                typeId,
                playerUid,
                playerPowers,
                tier
            );
            if (tempScalingConfig?.difficultyMultiplier !== undefined) {
                calculatedDifficulty = tempScalingConfig.difficultyMultiplier;
            }
        } else if (scalingConfig?.difficultyMultiplier !== undefined) {
            calculatedDifficulty = scalingConfig.difficultyMultiplier;
        }

        // 1.5 使用 StageManagerService 创建 stage
        const stage = await StageManagerService.createStage(ctx, {
            ruleId,
            seed,
            difficulty: calculatedDifficulty,
        });
        stageId = stage.stageId;

        // 1.6 获取地图数据（从 mr_map 表）
        const mapData = await ctx.db
            .query("mr_map")
            .withIndex("by_mapId", (q: any) => q.eq("mapId", stage.mapId))
            .first();

        if (!mapData) {
            throw new Error(`地图数据不存在: ${stage.mapId}`);
        }

        // 2. 创建游戏主记录（按照 mr_games 表结构）
        const gameId = `mr_game_${matchId}_${Date.now()}`;
        const gameSeed = seed || `game_${Date.now()}_${Math.random()}`;
        const now = new Date().toISOString();

        // 构建符合 mr_games 表结构的数据
        await ctx.db.insert("mr_games", {
            uid: "",  // 创建时为空，玩家加入时更新
            teamPower: 0,  // 创建时为0，玩家加入时更新
            team: [],  // 创建时为空数组，玩家加入时更新
            boss: [],  // Boss数据将在创建Boss实例后更新
            map: {
                rows: mapData.rows,
                cols: mapData.cols,
                obstacles: mapData.obstacles.map((obs: any) => ({
                    q: obs.q,
                    r: obs.r,
                    // mr_map 表的 obstacles 包含 type 和 asset，但 mr_games.map.obstacles 只需要 q 和 r
                })),
                disables: mapData.disables || [],
            },
            stageId,
            matchId,
            gameId,
            status: 0,  // 0: waiting
            score: 0,
            lastUpdate: now,
            createdAt: now,
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
        // （因为此时已经知道stage.bossId）
        if (finalScalingConfig &&
            finalScalingConfig.difficultyMultiplier !== undefined &&
            finalScalingConfig.playerPower !== undefined &&
            finalScalingConfig.baseBossPower === undefined &&
            stage.bossId) {
            // 获取合并后的Boss配置并计算基础Power
            const mergedConfig = BossConfigService.getMergedBossConfig(stage.bossId);
            if (mergedConfig) {
                finalScalingConfig.baseBossPower = BossScalingService.calculateBossPower(mergedConfig);
            }
        }

        // 5. 创建Boss组合实例（应用缩放）
        const bossInstanceResult = await BossInstanceService.createBossInstance(
            ctx,
            {
                gameId,
                bossId: stage.bossId,
                levelId: `level_${stage.bossId}`,
                positions: bossPositions,
                behaviorSeed: gameSeed,
                scalingConfig: finalScalingConfig,  // 传递缩放配置（包含完整的缩放参数）
            }
        );

        // 6. 更新 mr_games.boss 字段（从 tacticalMonster_game_character 获取Boss数据）
        const bossCharacters = await ctx.db
            .query("tacticalMonster_game_character")
            .filter((q: any) =>
                q.and(
                    q.eq(q.field("gameId"), gameId),
                    q.or(
                        q.eq(q.field("character_id"), bossInstanceResult.characterIds.bossMain),
                        q.eq(q.field("character_id"), bossInstanceResult.characterIds.minions[0])
                    )
                )
            )
            .collect();

        // 构建 boss 数组（符合 mr_games.boss 结构）
        const bossMainChar = bossCharacters.find((c: any) => c.character_id === bossInstanceResult.characterIds.bossMain);
        const minionChars = bossCharacters.filter((c: any) =>
            bossInstanceResult.characterIds.minions.includes(c.character_id)
        );

        const bossData = [];
        if (bossMainChar) {
            bossData.push({
                monsterId: bossMainChar.monsterId || stage.bossId,
                hp: bossMainChar.stats?.hp?.current || bossMainChar.stats?.hp?.max || 0,
                damage: bossMainChar.stats?.damage || 0,
                defense: bossMainChar.stats?.defense || 0,
                speed: bossMainChar.stats?.speed || 0,
                position: bossMainChar.position || { q: 0, r: 0 },
                minions: minionChars.map((minion: any) => ({
                    monsterId: minion.monsterId || "",
                    hp: minion.stats?.hp?.current || minion.stats?.hp?.max || 0,
                    damage: minion.stats?.damage || 0,
                    defense: minion.stats?.defense || 0,
                    speed: minion.stats?.speed || 0,
                    position: minion.position || { q: 0, r: 0 },
                })),
            });
        }

        // 更新 mr_games 表的 boss 字段
        const mrGame = await ctx.db
            .query("mr_games")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .first();

        if (mrGame) {
            await ctx.db.patch(mrGame._id, {
                boss: bossData,
                lastUpdate: new Date().toISOString(),
            });
        }

        return {
            gameId,
            appliedScale: bossInstanceResult.appliedScale,
            stageId,  // 返回 stageId（如果使用 StageManagerService 创建）
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
            // 计算房间平均Power（直接使用房间均值，不考虑EMA）
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
        ruleId: v.string(),  // 必需：StageRuleConfig ruleId
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
                ruleId: args.ruleId,  // 传递 ruleId
            }
        );

        return result;
    },
});
