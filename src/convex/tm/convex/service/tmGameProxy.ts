import { v } from "convex/values";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { sessionAction, sessionQuery } from "../custom/session";
import GameManager from "./tmGameManager";
// "use node";
const apiEndpoint = "https://cool-salamander-393.convex.site/event/sync"; // 替换为目标 API 的 URL
const apiToken = "1234567890";
export const start = action({
    args: {},
    handler: async (ctx, args) => {
             const gameService = new GameManager(ctx);
             await gameService.createGame();
             const game = gameService.getGame();
             if(game){
                const events=[{name:"GameCreated", uid:game.challenger,data:{gameId:game.gameId}},
                    {name:"GameCreated",uid:game.challengee,data:{gameId:game.gameId}}]
        
                const response = await fetch(apiEndpoint, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiToken}`, // 添加认证头
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(events), // 将数据序列化为 JSON 格式
                });
                console.log("response",response);
            }
    }
})
export const find = sessionQuery({
    args: { gameId: v.id("tm_game") },
    handler: async (ctx, { gameId }) => {
        return await ctx.db.get(gameId);
    }
})
export const walk = sessionAction({
    args: { gameId: v.string(), character_id: v.string(), to: v.object({ q: v.number(), r: v.number() }) },
    handler: async (ctx, { gameId, character_id, to }) => {
        if (!ctx.user) return false;
        const gameService = new GameManager(ctx);
        // console.log("walk action:", character_id, ctx.user.uid);
        return await gameService.walk(gameId, ctx.user.uid, character_id, to);

    }
})
export const defend = sessionAction({
    args: { act: v.number(), gameId: v.string(), actionId: v.optional(v.number()), data: v.any() },
    handler: async (ctx, { act, gameId, actionId, data }) => {
        console.log("TM game service")
    }
})
export const attack = sessionAction({
    args: {  gameId: v.string(), data: v.any() },
    handler: async (ctx, { gameId, data }) => {

         if (!ctx.user) return false;

        const gameService = new GameManager(ctx);
        return await gameService.attack(gameId, data);
    }
})
export const standBy = sessionAction({
    args: { act: v.number(), gameId: v.string(), actionId: v.optional(v.number()), data: v.any() },
    handler: async (ctx, { act, gameId, actionId, data }) => {
        console.log("TM game service")
    }
})
export const selectSkill = sessionAction({
    args: {gameId: v.string(), data: v.any() },
    handler: async (ctx, { gameId, data }) => {
        if (!ctx.user) return false;
        const gameService = new GameManager(ctx);
        return await gameService.selectSkill(gameId, data);
    }
})
export const gameOver = sessionAction({
    args: { gameId: v.string()},
    handler: async (ctx, {gameId}) => {
        await ctx.runMutation(internal.dao.tmGameDao.update, {id:gameId as Id<"tm_game">, data:{status:1}})  
        return true;
    }
})
