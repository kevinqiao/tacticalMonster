import { v } from "convex/values";
import { action } from "../_generated/server";
import { sessionAction } from "../custom/session";
import GameManager from "./gameManager";

// "use node";
const apiEndpoint = "https://cool-salamander-393.convex.site/event/sync"; // 替换为目标 API 的 URL
const apiToken = "1234567890";
export const start = action({
    args: {},
    handler: async (ctx, args) => {
            const gameService = new GameManager(ctx);
             await gameService.createGame();
             const game = gameService.getGame();
            //  console.log("game",game);
             if(game){
                const events=[];
                for(const seat of game.seats){
                    if(seat.uid){
                        events.push({name:"GameCreated", uid:seat.uid,data:{name:"ludo",id:game.gameId,status:0}})
                    }
                }
                 const response = await fetch(apiEndpoint, {
                       method: "POST",
                        headers: {
                            "Authorization": `Bearer ${apiToken}`, // 添加认证头
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(events)
                });
                // console.log("response",response);
            }
        
    }
})

export const roll = sessionAction({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId}) => {
        if (!ctx.user) return false; 
        try {
        const gameService=new GameManager(ctx);
        await gameService.initGame(gameId);
        await gameService.roll(ctx.user.uid);
        } catch (error) {
            console.log("roll error",error);
        }

        return true;

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
