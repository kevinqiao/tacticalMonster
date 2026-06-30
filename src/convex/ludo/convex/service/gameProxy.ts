import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalMutation, mutation } from "../_generated/server";
import { authedMutation } from "../custom/session";
import GameManager from "./gameManager";

// "use node";
const apiEndpoint = "https://cool-salamander-393.convex.site/event/sync"; // 替换为目标 API 的 URL
const apiToken = "1234567890";

export const createGame = internalMutation({
            args: {},
            handler: async (ctx, args) => {
                const gameService = new GameManager(ctx);
                await gameService.createGame();
                return gameService.getGame();
            }
})
export const create = action({
    args: {},
    handler: async (ctx, args) => {
            // const gameService = new GameManager(ctx);
            //  await gameService.createGame();
            //  const game = gameService.getGame();      
             const game = await ctx.runMutation(internal.service.gameProxy.createGame);
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
export const start = authedMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId}) => {
        const uid = ctx.uid;
        try {
            const gameService=new GameManager(ctx);
            await gameService.initGame(gameId);
            await gameService.start();

        } catch (error) {
            console.log("roll error",error);
        }

        return true;

    }
})
export const roll = authedMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId}) => {
        const uid = ctx.uid;
        try {
            const gameService=new GameManager(ctx);
            await gameService.initGame(gameId);
            const seat=gameService.getGame()?.seats.find(seat=>seat.uid===uid);        
            if(!seat) return false;
            await gameService.roll();
        } catch (error) {
            console.log("roll error",error);
        }

        return true;

    }
})
export const selectToken = authedMutation({
    args: { gameId: v.string(), tokenId: v.number()},
    handler: async (ctx, { gameId, tokenId}) => {
        const uid = ctx.uid;
        try {
            const gameService=new GameManager(ctx);
            await gameService.initGame(gameId);
            const seat=gameService.getGame()?.seats.find(seat=>seat.uid===uid);        
            if(!seat) return false;
            await gameService.selectToken(uid,tokenId);
        } catch (error) {
            console.log("select token error",error);
        }

        return true;
    }
})
export const turnOffBot = authedMutation({
    args: { gameId: v.string()},
    handler: async (ctx, { gameId}) => {
        const uid = ctx.uid;
        try {
            const gameService=new GameManager(ctx);
            await gameService.initGame(gameId);
            const seat=gameService.getGame()?.seats.find(seat=>seat.uid===uid);   
            if(seat){
                await gameService.turnOffBot(seat);
            }
        } catch (error) {
            console.log("turn off bot error",error);
        }
    }
})
export const timeout = mutation({
    args: { gameId: v.string()},
    handler: async (ctx, { gameId}) => {
  
         try{
            const gameService=new GameManager(ctx);
            await gameService.initGame(gameId);
            await gameService.timeout();
         }catch(error){
            console.log("timeout error",error);
         }
         return true;
    }
})

export const gameOver = authedMutation({
    args: { gameId: v.string()},
    handler: async (ctx, {gameId}) => {
        const gameService=new GameManager(ctx);
        await gameService.initGame(gameId);
        return true;
    }
})



