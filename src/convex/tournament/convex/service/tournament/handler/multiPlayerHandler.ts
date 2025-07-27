import { getTorontoMidnight } from "../../simpleTimezoneUtils";
import {
    TournamentHandler
} from "../common";
import { baseHandler } from "./base";

/**
 * 多人共享锦标赛处理器
 * 特点：
 * 1. 多个玩家共享同一个锦标赛实例 *
 * 2. 基于比赛结果进行排名
 */
export const multiPlayerHandler: TournamentHandler = {
    ...baseHandler,

    findAndJoinTournament: async (ctx: any, params: {
        uid: string;
        gameType: string;
        tournamentType: any;

    }) => {
        const { uid, gameType, tournamentType } = params;
        const now = getTorontoMidnight();
        let startTime: string;
        // 根据时间范围确定开始时间
        switch (tournamentType.timeRange) {
            case "daily":
                startTime = now.localDate.toISOString().split("T")[0] + "T00:00:00.000Z";
                break;
            case "weekly":
                const weekStart = new Date(now.localDate);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                weekStart.setHours(0, 0, 0, 0);
                startTime = weekStart.toISOString();
                break;
            case "seasonal":
                // 获取当前赛季开始时间
                const season = await ctx.db
                    .query("seasons")
                    .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
                    .first();
                startTime = season?.startDate || now.localDate.toISOString();
                break;
            case "total":
                startTime = "1970-01-01T00:00:00.000Z";
                break;
            default:
                startTime = "1970-01-01T00:00:00.000Z"; // 从1970年开始
                break;
        }

        // 查找现有的开放锦标赛
        const existingTournament = await ctx.db
            .query("tournaments")
            .withIndex("by_type_status_createdAt", (q: any) =>
                q.eq("tournamentType", tournamentType.typeId)
                    .eq("status", "open")
                    .eq("createdAt", startTime)
            )
            .first();
        if (!existingTournament || existingTournament.status !== "open") {
            throw new Error("锦标赛不存在");
        }

        // 检查玩家是否已参与
        const playerTournament = await ctx.db
            .query("player_tournaments")
            .withIndex("by_uid_tournament", (q: any) =>
                q.eq("uid", uid).eq("tournamentId", existingTournament._id)
            )
            .first();
        if (!playerTournament) {
            // 创建玩家参与关系
            await ctx.db.insert("player_tournaments", {
                uid,
                tournamentId: existingTournament._id,
                tournamentType: tournamentType.typeId,
                gameType,
                status: "active",
                joinedAt: now.iso,
                createdAt: now.iso,
                updatedAt: now.iso,
            });
        }
        return existingTournament;
    }
}