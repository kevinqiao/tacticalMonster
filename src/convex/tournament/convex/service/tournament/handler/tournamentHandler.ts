import { TournamentHandler, createTournamentCommon } from "../common";
import { baseHandler } from "./base";

/**
 * 通用锦标赛处理器
 * 处理通用锦标赛类型
 */
export const tournamentHandler: TournamentHandler = {
    ...baseHandler,

    /**
     * 查找或创建通用锦标赛
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

        // 通用锦标赛总是创建独立的锦标赛
        return await createTournamentCommon(ctx, {
            uid,
            gameType,
            tournamentType,
            player,
            season,
            config,
            now,
            duration: config.duration || 24 * 60 * 60 * 1000,
            isIndependent: true
        });
    },

    /**
     * 获取时间标识符
     */
    getTimeIdentifier(now: any, tournamentType: string): string {
        return "general";
    },
}; 