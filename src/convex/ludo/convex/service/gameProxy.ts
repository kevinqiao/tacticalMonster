import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalMutation } from "../_generated/server";
import { sessionMutation } from "../custom/session";
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
export const start = sessionMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId}) => {
        const user = ctx.user;
        if (!user||!user.uid) return false; 
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
export const roll = sessionMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId}) => {
        const user = ctx.user;
        if (!user||!user.uid) return false; 
        try {
            const gameService=new GameManager(ctx);
            await gameService.initGame(gameId);
            const seat=gameService.getGame()?.seats.find(seat=>seat.uid===user.uid);        
            if(!seat) return false;
            await gameService.roll();
        } catch (error) {
            console.log("roll error",error);
        }

        return true;

    }
})
export const selectToken = sessionMutation({
    args: { gameId: v.string(), tokenId: v.number()},
    handler: async (ctx, { gameId, tokenId}) => {
        const user = ctx.user;
        if (!user||!user.uid) return false; 
        try {
            const gameService=new GameManager(ctx);
            await gameService.initGame(gameId);
            const seat=gameService.getGame()?.seats.find(seat=>seat.uid===user.uid);        
            if(!seat) return false;
            await gameService.selectToken(user.uid,tokenId);
        } catch (error) {
            console.log("select token error",error);
        }

        return true;
    }
})
export const timeout = sessionMutation({
    args: { gameId: v.string()},
    handler: async (ctx, { gameId}) => {
        console.log("TM timeout",gameId,ctx.user);
         if (!ctx.user) return false;
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

export const gameOver = sessionMutation({
    args: { gameId: v.string()},
    handler: async (ctx, {gameId}) => {
        if (!ctx.user) return false;
        const gameService=new GameManager(ctx);
        await gameService.initGame(gameId);
        // await gameService.gameOver();
        return true;
    }
})



