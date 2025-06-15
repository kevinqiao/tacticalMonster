import { internalMutation, internalQuery } from "../_generated/server";

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

export const createNextSeason = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = getTorontoDate();
        const currentSeason = await ctx.db
            .query("seasons")
            .filter((q) =>
                q.and(
                    q.lte(q.field("startDate"), now.iso),
                    q.gte(q.field("endDate"), now.iso)
                )
            )
            .first();

        if (!currentSeason) throw new Error("当前赛季不存在");

        // 检查 endDate 是否接近24小时
        const endDate = getTorontoDate(new Date(currentSeason.endDate)).localDate;
        const hoursUntilEnd = (endDate.getTime() - now.localDate.getTime()) / (1000 * 60 * 60);
        if (hoursUntilEnd > 24) {
            return { created: false, message: "当前赛季未接近结束" };
        }

        // 计算下一赛季：endDate + 1毫秒开始，4周后结束
        const nextStartDate = new Date(endDate.getTime() + 1);
        const nextStartToronto = getTorontoDate(nextStartDate).localDate;
        nextStartToronto.setHours(0, 0, 0, 0); // 00:00:00
        const nextEndDate = new Date(nextStartToronto.getTime() + 4 * 7 * 24 * 60 * 60 * 1000 - 1); // 4周 - 1毫秒
        const seasonName = `Season ${nextStartToronto.getFullYear()}-${(nextStartToronto.getMonth() + 1).toString().padStart(2, "0")}`;

        // 检查重复
        const existingNextSeason = await ctx.db
            .query("seasons")
            .filter((q) => q.eq(q.field("startDate"), nextStartToronto.toISOString()))
            .first();
        if (existingNextSeason) {
            return { created: false, message: "下一赛季已存在" };
        }

        // 创建新赛季
        const seasonId = await ctx.db.insert("seasons", {
            startDate: nextStartToronto.toISOString(),
            endDate: nextEndDate.toISOString(),
            name: seasonName,
            createdAt: now.iso,
        });

        // 初始化 player_seasons（分批处理）
        const players = await ctx.db.query("player").collect();
        const batchSize = 100000;
        for (let i = 0; i < players.length; i += batchSize) {
            const batch = players.slice(i, i + batchSize);
            for (const player of batch) {
                const prevSeason = await ctx.db
                    .query("player_seasons")
                    .withIndex("by_player_season", (q) =>
                        q.eq("uid", player.uid).eq("seasonId", currentSeason._id)
                    )
                    .first();

                const newSegmentName = resetSegment(prevSeason?.segmentName || player.segmentName || "Bronze");

                await ctx.db.insert("player_seasons", {
                    uid: player.uid,
                    seasonId,
                    segmentName: newSegmentName,
                    seasonPoints: 0,
                    createdAt: now.iso,
                    updatedAt: now.iso,
                });
            }
        }

        // 分配奖励
        await distributeSeasonRewards(ctx, currentSeason._id, now.iso);

        return { created: true, seasonId, startDate: nextStartToronto.toISOString() };
    },
});

// 重置段位
function resetSegment(currentSegment: string): string {
    const segments = ["Bronze", "Silver", "Gold"];
    const index = segments.indexOf(currentSegment);
    return index > 0 ? segments[index - 1] : "Bronze";
}

// 分配奖励
async function distributeSeasonRewards(ctx: any, seasonId: string, nowIso: string) {
    const playerSeasons = await ctx.db
        .query("player_seasons")
        .filter((q: any) => q.eq(q.field("seasonId"), seasonId))
        .collect();

    for (const ps of playerSeasons) {
        const player = await ctx.db.get(ps.playerId);
        if (!player) continue;

        let rewards = {
            coins: ps.segmentName === "Gold" ? 1000 : ps.segmentName === "Silver" ? 500 : 200,
            props: [{ propType: "hint", quantity: 1 }],
        };
        if (player.isSubscribed) {
            rewards.coins *= 2;
            rewards.props.push({ propType: "undo", quantity: 1 });
        }

        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", ps.uid))
            .first();

        if (inventory) {
            await ctx.db.patch(inventory._id, {
                coins: inventory.coins + rewards.coins,
                props: mergeProps(inventory.props, rewards.props),
                updatedAt: nowIso,
            });
        } else {
            await ctx.db.insert("player_inventory", {
                playerId: ps.playerId,
                coins: rewards.coins,
                points: 0,
                props: rewards.props,
                updatedAt: nowIso,
            });
        }
    }
}

// 合并道具
function mergeProps(existing: any[], newProps: any[]): any[] {
    const propsMap = new Map(existing.map((p) => [p.propType, p.quantity]));
    for (const prop of newProps) {
        propsMap.set(prop.propType, (propsMap.get(prop.propType) || 0) + prop.quantity);
    }
    return Array.from(propsMap.entries()).map(([propType, quantity]) => ({
        propType,
        quantity,
    }));
}

// 查询当前赛季
export const getCurrentSeason = internalQuery({
    args: {},
    handler: async (ctx) => {
        const now = getTorontoDate().iso;
        return await ctx.db
            .query("seasons")
            .filter((q) =>
                q.and(
                    q.lte(q.field("startDate"), now),
                    q.gte(q.field("endDate"), now)
                )
            )
            .first();
    },
});