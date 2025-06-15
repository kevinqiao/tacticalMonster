import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

// 获取多伦多时区时间
function getTorontoDate(date: Date = new Date()): { iso: string; localDate: Date } {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Toronto",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const year = parseInt(parts.find((p) => p.type === "year")!.value);
    const month = parseInt(parts.find((p) => p.type === "month")!.value) - 1;
    const day = parseInt(parts.find((p) => p.type === "day")!.value);
    const hour = parseInt(parts.find((p) => p.type === "hour")!.value);
    const minute = parseInt(parts.find((p) => p.type === "minute")!.value);
    const second = parseInt(parts.find((p) => p.type === "second")!.value);
    const localDate = new Date(year, month, day, hour, minute, second);
    return { iso: localDate.toISOString(), localDate };
}

export const createDailyTournaments = internalMutation({
    args: {},
    handler: async (ctx): Promise<{ count: number, startDate: string, message?: string }> => {
        // 获取当前时间和赛季
        const now = getTorontoDate();
        const currentSeason = await ctx.runQuery(internal.service.season.getCurrentSeason, {});
        if (!currentSeason) throw new Error("当前赛季不存在");

        // 计算今日 startDate 和 endDate
        const startDate = new Date(now.localDate);
        startDate.setHours(0, 0, 0, 0); // 00:00:00 EDT
        const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1); // 23:59:59.999 EDT

        // 检查重复
        const existing = await ctx.db
            .query("tournaments")
            .filter((q) => q.eq(q.field("startDate"), startDate.toISOString()))
            .collect();
        if (existing.length > 0) {
            return { count: 0, startDate: startDate.toISOString(), message: "今日锦标赛已存在" };
        }

        // 定义锦标赛
        const tournaments = [
            {
                seasonId: currentSeason._id,
                tournamentType: "free",
                segmentNames: ["Bronze", "Silver", "Gold"],
                isSubscribedRequired: false,
                maxAttempts: 3,
                rules: {
                    propLimit: [
                        { propType: "hint", max: 3 },
                        { propType: "undo", max: 3 },
                    ],
                    gameDuration: 600,
                },
                rewards: [
                    {
                        rank: 1,
                        points: 50,
                        coins: 200,
                        props: [{ propType: "undo", quantity: 1 }],
                    },
                    { rank: 2, points: 10, coins: 50, props: [] },
                ],
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                createdAt: now.iso,
            },
            {
                seasonId: currentSeason._id,
                tournamentType: "challenge",
                segmentNames: ["Silver", "Gold"],
                isSubscribedRequired: false,
                maxAttempts: 3,
                rules: {
                    propLimit: [
                        { propType: "hint", max: 1 },
                        { propType: "undo", max: 1 },
                    ],
                    gameDuration: 600,
                },
                rewards: [
                    {
                        rank: 1,
                        points: 100,
                        coins: 500,
                        props: [{ propType: "hint", quantity: 1 }],
                    },
                    { rank: 2, points: 20, coins: 100, props: [] },
                ],
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                createdAt: now.iso,
            },
        ];

        // 插入锦标赛
        for (const tournament of tournaments) {
            await ctx.db.insert("tournaments", tournament);
        }

        return { count: tournaments.length, startDate: startDate.toISOString() };
    },
});