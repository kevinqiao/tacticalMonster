import { findTypeById } from "../../../dao/tournamentDao";
import { getTorontoDate } from "../../utils";
import { TournamentHandler } from "../common";
import { MatchManager } from "../matchManager";
import { baseHandler } from "./base";
/**
    * 查找或创建独立锦标赛
    */
async function createTournament(ctx: any, params: {
    uid: string;
    tournamentType: any;
}) {
    const { uid, tournamentType } = params;
    const now = getTorontoDate();
    const config = tournamentType.config;
    const season = await ctx.db
        .query("seasons")
        .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
        .first();

    // 创建新的独立锦标赛
    const tournamentId = await ctx.db.insert("tournaments", {
        seasonId: season._id,
        gameType: tournamentType.gameType,
        status: "open",
        tournamentType,
        isSubscribedRequired: config.isSubscribedRequired || false,
        isSingleMatch: false, // 独立锦标赛
        prizePool: config.entryRequirements?.entryFee?.coins ? config.entryRequirements.entryFee.coins * 0.8 : 0,
        config: {
            ...config,
            independent: {
                maxPlayers: config.matchRules?.maxPlayers || 1,
                minPlayers: config.matchRules?.minPlayers || 1,
                attemptNumber: 1
            }
        },
        createdAt: now.iso,
        updatedAt: now.iso,
        endTime: new Date(now.localDate.getTime() + (config.duration || 24 * 60 * 60 * 1000)).toISOString(),
    });

    // 创建玩家参与关系
    await ctx.db.insert("player_tournaments", {
        uid,
        tournamentId,
        joinedAt: now.iso,
        createdAt: now.iso,
        updatedAt: now.iso,
    });

    const tournament = await ctx.db.get(tournamentId);

    return tournament;
}
/**
 * 独立锦标赛处理器
 * 处理独立锦标赛类型
 * 特点：每个玩家都有独立的锦标赛实例
 */
export const singlePlayerIndependentTournamentHandler: TournamentHandler = {
    ...baseHandler,
    /**
        * 加入锦标赛
        */
    join: async (ctx: any, params: {
        uid: string;
        gameType: string;
        typeId: string;
    }) => {
        const { uid, gameType, typeId } = params;

        // 获取锦标赛类型配置
        const tournamentType = await ctx.runQuery(findTypeById, { typeId });
        if (!tournamentType) {
            throw new Error("锦标赛类型不存在");
        }

        // 验证加入资格
        await singlePlayerIndependentTournamentHandler.validateJoin(ctx, {
            uid,
            gameType,
            tournamentType
        });

        // 获取玩家库存并处理入场费
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        // 扣除入场费
        await singlePlayerIndependentTournamentHandler.deductJoinCost(ctx, { uid, tournamentType, inventory });

        // 查找或创建锦标赛
        const tournament = await createTournament!(ctx, {
            uid,
            tournamentType
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
            matchId,
            playerMatchId,
            gameId: `independent_match_${matchId}`,
            serverUrl: "remote_server_url",
            matchStatus: "pending",
            success: true
        };
    }

}; 