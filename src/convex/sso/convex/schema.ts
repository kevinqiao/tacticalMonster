import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    auth_channel: defineTable({
        cid: v.number(),
        scope: v.optional(v.number()),
        provider: v.string(),
        data: v.optional(v.any())
    }).index("by_channel", ["cid"]),

    partner: defineTable({
        pid: v.number(),
        name: v.optional(v.string()),
        host: v.optional(v.string()),
        auth_channels: v.array(v.number()),
    }).index("by_pid", ["pid"]).index("by_name", ["name"]),


    user: defineTable({
        uid: v.optional(v.string()),
        cuid: v.string(),
        cid: v.number(),
        token: v.optional(v.string()),
        expire: v.optional(v.number()),
        lastUpdate: v.optional(v.number()),
        partner: v.optional(v.number()),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        verfied: v.optional(v.boolean()),
        data: v.optional(v.any()),
    }).index("by_partner", ['partner', "cuid"]).index("by_uid", ['uid']).index("by_cuid", ['cuid']).index("by_cid", ['cid']),
    user_authorize: defineTable({
        uid: v.string(),
        code: v.string(),
        type: v.number(),//0-verify,1-reset password
        expire: v.optional(v.number()),
        completed: v.optional(v.boolean()),
    }).index("by_uid", ['uid', "completed"]).index("by_code", ["uid", 'code', "completed"]),

});