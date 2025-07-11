import { TournamentHandler, findTournamentByTimeRange, getWeekStart } from "../common";
import { baseHandler } from "./base";

/**
 * 每周锦标赛处理器
 * 处理 weekly_rummy_masters 等每周锦标赛
 */
export const weeklyHandler: TournamentHandler = {
    ...baseHandler,

    /**
     * 查找或创建每周锦标赛
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
        const weekStart = getWeekStart(now.localDate.toISOString().split("T")[0]);

        // 使用通用函数查找本周的锦标赛
        const tournament = await findTournamentByTimeRange(ctx, {
            tournamentType,
            gameType,
            segmentName: player.segmentName,
            timeFilter: (t: any) => {
                const createdAt = t.createdAt;
                if (!createdAt) return false;
                const createdAtStr = typeof createdAt === 'string' ? createdAt : createdAt.toISOString();
                const tournamentWeekStart = getWeekStart(createdAtStr.split("T")[0]);
                return tournamentWeekStart === weekStart;
            }
        });

        if (tournament) {
            // 检查玩家是否已经参与
            const existingParticipation = await ctx.db
                .query("player_tournaments")
                .withIndex("by_uid_tournament", (q: any) =>
                    q.eq("uid", uid).eq("tournamentId", tournament._id)
                )
                .first();

            if (!existingParticipation) {
                // 玩家加入现有锦标赛
                await ctx.db.insert("player_tournaments", {
                    uid,
                    tournamentId: tournament._id,
                    tournamentType,
                    gameType,
                    status: "active",
                    joinedAt: now.iso,
                    createdAt: now.iso,
                    updatedAt: now.iso,
                });
            }

            return tournament;
        }

        // 创建新的每周锦标赛
        const tournamentId = await ctx.db.insert("tournaments", {
            seasonId: season._id,
            gameType,
            segmentName: player.segmentName,
            status: "open",
            tournamentType,
            isSubscribedRequired: config.entryRequirements?.isSubscribedRequired || false,
            isSingleMatch: config.matchRules?.isSingleMatch || false,
            prizePool: config.entryRequirements?.entryFee?.coins ? config.entryRequirements.entryFee.coins * 0.8 : 0,
            config: {
                entryRequirements: config.entryRequirements,
                matchRules: config.matchRules,
                rewards: config.rewards,
                schedule: config.schedule,
                limits: config.limits,
                advanced: config.advanced
            },
            createdAt: now.iso,
            updatedAt: now.iso,
            endTime: new Date(now.localDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

        // 创建玩家参与关系
        await ctx.db.insert("player_tournaments", {
            uid,
            tournamentId,
            tournamentType,
            gameType,
            status: "active",
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
        return getWeekStart(now.localDate.toISOString().split("T")[0]);
    },
}; 