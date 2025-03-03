import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

    cuser: defineTable({
        cid: v.string(),
        cuid: v.string(),
        channel: v.number(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        data: v.optional(v.any())
    }).index("by_cuid", ["channel", "cuid"]).index("by_cid", ["cid", "cuid"]),
    user: defineTable({
        uid: v.optional(v.string()),
        cid: v.string(),
        token: v.optional(v.string()),
        expire: v.optional(v.number()), 
        partner: v.number(),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        data: v.optional(v.any()),
        game: v.optional(v.object({name:v.string(),id:v.string(),status:v.number()})),
    }).index("by_channelId", ['cid']).index("by_uid", ['uid']).index("by_partner", ['partner','cid']),

    events: defineTable({      
        name: v.string(),
        uid: v.optional(v.string()),
        data: v.optional(v.any())
    }).index("by_uid", ["uid"])
    
});