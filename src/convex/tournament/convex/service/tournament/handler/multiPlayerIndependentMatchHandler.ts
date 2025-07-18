import { findTypeById } from "../../../dao/tournamentDao";
import { getTorontoDate } from "../../utils";
import {
    TournamentHandler,
    getPlayerAttempts,
} from "../common";
import { MatchManager } from "../matchManager";
import { multiPlayerHandler } from "./multiPlayerHandler";

/**
 * 多人独立比赛锦标赛处理器
 * 特点：
 * 1. 多个玩家共享同一个锦标赛实例
 * 2. 每个玩家进行独立的单人比赛
 * 3. 根据所有玩家的独立比赛成绩进行排名
 * 4. 支持多次尝试和每场奖励
 */
export const multiPlayerIndependentMatchHandler: TournamentHandler = {
    ...multiPlayerHandler,



    /**
     * 加入锦标赛
     */
    join: async (ctx: any, params: {
        uid: string;
        gameType: string;
        typeId: string;
    }) => {
        const { uid, gameType, typeId } = params;
        const now = getTorontoDate();

        // 获取锦标赛类型配置
        const tournamentType = await ctx.runQuery(findTypeById, { typeId });
        if (!tournamentType) {
            throw new Error("锦标赛类型不存在");
        }

        // 验证加入资格
        await multiPlayerIndependentMatchHandler.validateJoin(ctx, {
            uid,
            gameType,
            tournamentType
        });

        // 获取玩家信息
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!player) {
            throw new Error("玩家不存在");
        }

        // 获取玩家库存并处理入场费
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        // 扣除入场费
        await multiPlayerIndependentMatchHandler.deductJoinCost(ctx, { uid, tournamentType, inventory, now });

        // 获取玩家尝试次数
        const timeRange = tournamentType.timeRange || "total";
        const attempts = await getPlayerAttempts(ctx, {
            uid,
            tournamentType
        });

        // 查找或创建锦标赛
        const tournament = await multiPlayerIndependentMatchHandler.findAndJoinTournament!(ctx, {
            uid,
            gameType,
            tournamentType,
            player,
            now,
            attemptNumber: attempts + 1
        });

        // 创建独立的单人比赛
        const matchId = await MatchManager.createMatch(ctx, {
            tournamentId: tournament._id,
            gameType,
            matchType: "single_player",
            maxPlayers: 1,
            minPlayers: 1,
            gameData: {
                tournamentType: typeId,
                attemptNumber: attempts + 1,
                independentMatch: {
                    playerUid: uid,
                    isIndependent: true
                }
            }
        });

        // 玩家加入比赛
        const playerMatchId = await MatchManager.joinMatch(ctx, {
            matchId,
            tournamentId: tournament._id,
            uid,
            gameType
        });

        return {
            tournamentId: tournament._id,
            attemptNumber: attempts + 1,
            matchId,
            playerMatchId,
            gameId: `independent_match_${matchId}`,
            serverUrl: "remote_server_url",
            matchStatus: "pending",
            success: true
        };
    },


};

