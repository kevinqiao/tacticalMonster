import { baseHandler, TournamentHandler } from "./base";

/**
 * 每日锦标赛处理器
 * 处理 daily_solitaire_challenge 等每日锦标赛
 */
export const dailyHandler: TournamentHandler = {
    ...baseHandler,

    /**
     * 查找或创建每日锦标赛
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
        const today = now.localDate.toISOString().split("T")[0];

        // 查找今日的锦标赛
        const existingTournaments = await ctx.db
            .query("tournaments")
            .withIndex("by_type_status", (q: any) =>
                q.eq("tournamentType", tournamentType)
                    .eq("status", "open")
                    .eq("gameType", gameType)
                    .eq("segmentName", player.segmentName)
            )
            .collect();

        // 在 JavaScript 中过滤今日创建的锦标赛
        let tournament = existingTournaments.find((t: any) => {
            const createdAt = t.createdAt;
            if (!createdAt) return false;
            const createdAtStr = typeof createdAt === 'string' ? createdAt : createdAt.toISOString();
            return createdAtStr.startsWith(today);
        });

        if (!tournament) {
            // 创建新的每日锦标赛
            const tournamentId = await ctx.db.insert("tournaments", {
                seasonId: season._id,
                gameType,
                segmentName: player.segmentName,
                status: "open",
                tournamentType,
                isSubscribedRequired: config.isSubscribedRequired || false,
                isSingleMatch: config.rules?.isSingleMatch || false,
                prizePool: config.entryFee?.coins ? config.entryFee.coins * 0.8 : 0,
                config: {
                    ...config,
                    dailyChallenge: {
                        date: today,
                        attemptNumber: 1
                    }
                },
                createdAt: now.iso,
                updatedAt: now.iso,
                endTime: new Date(now.localDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
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
        return now.localDate.toISOString().split("T")[0];
    },

    /**
     * 获取时间范围
     */
    getTimeRangeForTournament(tournamentType: string): "daily" | "weekly" | "seasonal" | "total" {
        return "daily";
    }
}; 