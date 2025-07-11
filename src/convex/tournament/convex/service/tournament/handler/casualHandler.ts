import { TournamentHandler, createTournamentCommon } from "../common";
import { baseHandler } from "./base";

/**
 * 休闲锦标赛处理器
 * 处理 casual_quick_match 等休闲锦标赛
 */
export const casualHandler: TournamentHandler = {
    ...baseHandler,

    /**
     * 查找或创建休闲锦标赛
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

        // 休闲锦标赛总是创建独立的锦标赛
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
        return "casual";
    },
}; 