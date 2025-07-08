import { baseHandler, TournamentHandler } from "./base";

/**
 * 多人锦标赛处理器
 * 处理多人锦标赛类型
 */
export const multiPlayerTournamentHandler: TournamentHandler = {
    ...baseHandler,

    /**
     * 查找或创建多人锦标赛
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

        // 查找现有的多人锦标赛
        let tournament = await ctx.db
            .query("tournaments")
            .withIndex("by_type_status", (q: any) =>
                q.eq("tournamentType", tournamentType)
                    .eq("status", "open")
                    .eq("gameType", gameType)
                    .eq("segmentName", player.segmentName)
            )
            .first();

        if (!tournament) {
            // 创建新的多人锦标赛
            const tournamentId = await ctx.db.insert("tournaments", {
                seasonId: season._id,
                gameType,
                segmentName: player.segmentName,
                status: "open",
                tournamentType,
                isSubscribedRequired: config.isSubscribedRequired || false,
                isSingleMatch: false, // 多人锦标赛
                prizePool: config.entryRequirements?.entryFee?.coins ? config.entryRequirements.entryFee.coins * 0.8 : 0,
                config: {
                    ...config,
                    multiPlayer: {
                        maxPlayers: config.matchRules?.maxPlayers || 4,
                        minPlayers: config.matchRules?.minPlayers || 2,
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
        return "multiplayer";
    },

    /**
     * 获取时间范围
     */
    getTimeRangeForTournament(tournamentType: string): "daily" | "weekly" | "seasonal" | "total" {
        return "total";
    }
}; 