import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
export const takeAction = internalAction({
    args:{gameId:v.string()},
    handler:async(ctx,args)=>{
      const game = await ctx.runQuery(internal.dao.gameDao.get,{gameId:args.gameId});
      if(game){
        await ctx.runMutation(internal.service.localProxy.selectToken,{gameId:args.gameId,tokenId:game.selectedToken});
      }
    }
})

