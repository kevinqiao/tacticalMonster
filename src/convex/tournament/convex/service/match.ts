"use node";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
const gameAPI = "https://limitless-platypus-124.convex.site/game/create";
const eventAPI = "https://cool-salamander-393.convex.site/event/sync"; // 替换为目标 API 的 URL
const apiToken = "1234567890";
export const match = internalAction({
    args: {},
    handler: async (ctx, args) => {
        const matchQueue = await ctx.runQuery(internal.dao.matchQueueDao.findAll);

        const events = [];
        for (const match of matchQueue) {
            await ctx.runMutation(internal.dao.matchQueueDao.remove, { uid: match.uid });
            const players = [{ uid: match.uid, score: 0, rank: 0 }];
            const mid = await ctx.runMutation(internal.dao.matchDao.create, { tournamentId: "1", players: players });
            const res = await fetch(gameAPI, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ uids: [match.uid], matchId: mid })
            });
            console.log("create game result", res);
            const event = { name: "GameMatched", data: { uids: [match.uid, "2-22222"], game: "solitaire", matchId: mid } }
            events.push(event);
            // await ctx.db.insert("event", event);
        }
        if (events.length > 0) {
            const response = await fetch(eventAPI, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiToken}`, // 添加认证头
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(events)
            });
            const result = await response.json();
            console.log("result", result);
        }

    }
})






