import { v } from "convex/values";
import { ACTION_TYPE, GameModel } from "../../../../component/ludo/battle/types/CombatTypes";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
export const takeSelect = internalAction({
    args:{gameId:v.string()},
    handler:async(ctx,args)=>{
      const game:GameModel|null = await ctx.runQuery(internal.dao.gameDao.get,{gameId:args.gameId});
      if(game?.currentAction?.type===ACTION_TYPE.SELECT&&game.currentAction.tokens){
        console.log("takeSelect",game.currentAction);
        const tokenId = game.currentAction.tokens[0];
        await ctx.runMutation(internal.service.localProxy.selectToken,{gameId:args.gameId,tokenId:tokenId});
      }
    }
})

