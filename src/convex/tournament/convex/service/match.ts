import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
const apiEndpoint = "https://cool-salamander-393.convex.site/event/sync"; // 替换为目标 API 的 URL
const apiToken = "1234567890";
export const match = internalAction({
    args: {},
    handler: async (ctx, args) => {
        const matchQueue = await ctx.runQuery(internal.dao.matchQueueDao.findAll);

        const events = [];
        for (const match of matchQueue) {
            await ctx.runMutation(internal.dao.matchQueueDao.remove, { uid: match.uid });
            const event = { name: "GameMatched", data: { uids: [match.uid], game: "solitaire", gameId: "1234567890" } }
            events.push(event);
            // await ctx.db.insert("event", event);
        }
        if (events.length > 0) {
            const response = await fetch(apiEndpoint, {
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






