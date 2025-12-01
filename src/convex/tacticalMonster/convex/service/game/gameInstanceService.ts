/**
 * 游戏实例服务
 * 创建Monster Rumble游戏实例（包含动态生成的关卡）
 */

import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { LevelGenerationService } from "../level/levelGenerationService";
import { BossInstanceService } from "../boss/bossInstanceService";
import { BossSelectionService } from "../boss/bossSelectionService";

export class GameInstanceService {
    /**
     * 创建Monster Rumble游戏实例（包含动态生成的关卡）
     */
    static async createMonsterRumbleGame(
        ctx: any,
        params: {
            matchId: string;
            tier: string;
            bossId?: string;
            maxPlayers?: number;
            seed?: string;
        }
    ): Promise<{ gameId: string; level: any }> {
        const { matchId, tier, bossId, maxPlayers = 20, seed } = params;

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

        // 3. 创建Boss组合实例
        await BossInstanceService.createBossInstance(
            ctx,
            {
                gameId,
                bossId: level.bossId,
                levelId: level.levelId,
                positions: level.bossPositions,
                behaviorSeed: gameSeed,
            }
        );

        return {
            gameId,
            level,
        };
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
            }
        );
        
        return result;
    },
});
