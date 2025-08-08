
/**
 * 从 tournament_types 表中获取时间范围
 */
export async function getTimeRangeFromTournamentType(ctx: any, tournamentTypeId: string): Promise<"daily" | "weekly" | "seasonal" | "total"> {
    const tournamentType = await ctx.db
        .query("tournament_types")
        .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentTypeId))
        .first();

    if (!tournamentType) {
        throw new Error(`锦标赛类型 ${tournamentTypeId} 不存在`);
    }

    return tournamentType.timeRange || "total";
}

/**
 * 从 tournament_types 表中获取独立状态
 */
export async function getIndependentFromTournamentType(ctx: any, tournamentTypeId: string): Promise<boolean> {
    const tournamentType = await ctx.db
        .query("tournament_types")
        .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentTypeId))
        .first();

    if (!tournamentType) {
        throw new Error(`锦标赛类型 ${tournamentTypeId} 不存在`);
    }

    return tournamentType.independent || false;
}

/**
 * 获取时间标识符
 */
export function getTimeIdentifier(now: any, tournamentType: string): string {
    // 使用 common.ts 中的共享实现
    const { getTimeIdentifier } = require("../common.js");
    return getTimeIdentifier(now, tournamentType);
}

/**
 * 根据时间范围获取开始时间
 */
export function getStartTimeByTimeRange(timeRange: string, now: any): string {
    switch (timeRange) {
        case "daily":
            const today = new Date(now.localDate);
            today.setHours(0, 0, 0, 0);
            return today.toISOString();
        case "weekly":
            const weekStart = new Date(now.localDate);
            const dayOfWeek = weekStart.getDay();
            const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            weekStart.setDate(weekStart.getDate() - daysToSubtract);
            weekStart.setHours(0, 0, 0, 0);
            return weekStart.toISOString();
        case "seasonal":
            // 这里需要从数据库获取赛季开始时间，暂时返回当前时间
            return now.localDate.toISOString();
        case "total":
        default:
            return "1970-01-01T00:00:00.000Z";
    }
}
