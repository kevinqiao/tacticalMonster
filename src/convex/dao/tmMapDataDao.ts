import { v } from "convex/values";
import { internalQuery } from "../_generated/server";


export const find = internalQuery({
    args: { mapId: v.string() },
    handler: async (ctx, { mapId }) => {
        const map = await ctx.db.query("tm_map_data").withIndex("by_map_id", (q) => q.eq("map_id", mapId)).unique();
        if (map)
            return { ...map, _id: undefined, _creationTime: undefined }
    },
})
