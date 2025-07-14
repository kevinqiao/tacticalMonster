import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
export const findTypeById = internalQuery({
    args: {
        typeId: v.string(),
    },
    handler: async (ctx, { typeId }) => {
        const config = await ctx.db
            .query("tournament_types")
            .withIndex("by_typeId", (q: any) => q.eq("typeId", typeId))
            .unique();
        return config
    },
})




