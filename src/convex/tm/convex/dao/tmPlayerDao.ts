import { internalQuery } from "../_generated/server";


export const findAll = internalQuery({
    handler: async (ctx, { character_id }) => {
        const players = await ctx.db.query("tm_player").collect();
        return players
    },
})
