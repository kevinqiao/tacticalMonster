import { baseHandler, TournamentHandler } from "./base";

/**
 * 赛季锦标赛处理器
 * 处理 seasonal_championship 等赛季锦标赛
 */
export const seasonalHandler: TournamentHandler = {
    ...baseHandler,

    /**
     * 查找或创建赛季锦标赛
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

        // 查找本赛季的锦标赛
        let tournament = await ctx.db
            .query("tournaments")
            .withIndex("by_type_status", (q: any) =>
                q.eq("tournamentType", tournamentType)
                    .eq("status", "open")
                    .eq("gameType", gameType)
                    .eq("segmentName", player.segmentName)
            )
            .filter((q: any) => q.eq(q.field("seasonId"), season._id))
            .first();

        if (!tournament) {
            // 创建新的赛季锦标赛
            const tournamentId = await ctx.db.insert("tournaments", {
                seasonId: season._id,
                gameType,
                segmentName: player.segmentName,
                status: "open",
                tournamentType,
                isSubscribedRequired: config.isSubscribedRequired || false,
                isSingleMatch: config.matchRules?.isSingleMatch || false,
                prizePool: config.entryRequirements?.entryFee?.coins ? config.entryRequirements.entryFee.coins * 0.8 : 0,
                config: {
                    ...config,
                    seasonalChallenge: {
                        seasonId: season._id,
                        attemptNumber: 1
                    }
                },
                createdAt: now.iso,
                updatedAt: now.iso,
                endTime: new Date(now.localDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });

            // 创建玩家参与关系
            await ctx.db.insert("player_tournaments", {
                uid,
                tournamentId,
                joinedAt: now.iso,
                createdAt: now.iso,
                updatedAt: now.iso,
            });

            tournament = await ctx.db.get(tournamentId);
        } else {
            // 创建玩家参与关系（如果不存在）
            const existingParticipation = await ctx.db
                .query("player_tournaments")
                .withIndex("by_uid_tournament", (q: any) =>
                    q.eq("uid", uid).eq("tournamentId", tournament._id)
                )
                .first();

            if (!existingParticipation) {
                await ctx.db.insert("player_tournaments", {
                    uid,
                    tournamentId: tournament._id,
                    joinedAt: now.iso,
                    createdAt: now.iso,
                    updatedAt: now.iso,
                });
            }
        }

        return tournament;
    },

    /**
     * 获取时间标识符
     */
    getTimeIdentifier(now: any, tournamentType: string): string {
        return "seasonal";
    },

    /**
     * 获取时间范围
     */
    getTimeRangeForTournament(tournamentType: string): "daily" | "weekly" | "seasonal" | "total" {
        return "seasonal";
    }
}; 