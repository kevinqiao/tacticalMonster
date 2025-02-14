import { v } from "convex/values";
import { action } from "../_generated/server";
import { sessionAction } from "../custom/session";

// "use node";
const apiEndpoint = "https://cool-salamander-393.convex.site/event/sync"; // 替换为目标 API 的 URL
const apiToken = "1234567890";
export const start = action({
    args: {},
    handler: async (ctx, args) => {
        console.log("start action");
    }
})

export const roll = sessionAction({
    args: { gameId: v.string(), character_id: v.string(), to: v.object({ q: v.number(), r: v.number() }) },
    handler: async (ctx, { gameId, character_id, to }) => {
        if (!ctx.user) return false;       

    }
})
export const selectToken = sessionAction({
    args: { act: v.number(), gameId: v.string(), actionId: v.optional(v.number()), data: v.any() },
    handler: async (ctx, { act, gameId, actionId, data }) => {
        console.log("TM game service")
    }
})
export const selectSkill = sessionAction({
    args: {  gameId: v.string(), data: v.any() },
    handler: async (ctx, { gameId, data }) => {

         if (!ctx.user) return false;

    }
})

export const gameOver = sessionAction({
    args: { gameId: v.string()},
    handler: async (ctx, {gameId}) => {
        
        return true;
    }
})
