import { TournamentHandler } from "../common";
import { baseHandler } from "./base";

/**
 * 排位锦标赛处理器
 * 处理 ranked_competitive 等排位锦标赛
 */
export const rankedHandler: TournamentHandler = {
    ...baseHandler,

    /**
     * 查找或创建排位锦标赛
     */
    async findOrCreateTournament(ctx: any, params: {
        uid: string;
        gameType: string;
        tournamentType: string;
        player: any;
        season: any;
        config: any;
        now: any;
    }) {
        const { uid, gameType, tournamentType, player, season, config, now } = params;

        // 排位锦标赛总是创建独立的锦标赛
        const tournamentId = await ctx.db.insert("tournaments", {
            seasonId: season._id,
            gameType,
            segmentName: player.segmentName,
            status: "open",
            tournamentType,
            isSubscribedRequired: config.isSubscribedRequired || false,
            isSingleMatch: config.matchRules?.isSingleMatch || false,
            prizePool: config.entryRequirements?.entryFee?.coins ? config.entryRequirements.entryFee.coins * 0.8 : 0,
            config,
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

        return await ctx.db.get(tournamentId);
    },

    /**
     * 获取时间标识符
     */
    getTimeIdentifier(now: any, tournamentType: string): string {
        return "ranked";
    },


}; 