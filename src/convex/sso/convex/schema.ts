import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    auth_channel: defineTable({
        cid: v.string(),
        scope: v.number(),
        provider: v.string(),
        data: v.optional(v.any())
    }).index("by_channel", ["cid"]),

    partner: defineTable({
        pid: v.number(),
        name: v.string(),
        auth_channels: v.array(v.string()),
        data: v.optional(v.any())
    }).index("by_name", ["name"]),

    platform: defineTable({
        pid: v.number(),
        type: v.number(),
        partner: v.number(),
        host: v.string(),
        data: v.optional(v.any())
    }).index("by_host", ["host"]).index("by_pid", ["pid"]),

    counter: defineTable({
        platform: v.number(),
        partner: v.number(),
    }),

    cuser: defineTable({
        cid: v.string(),
        cuid: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        data: v.optional(v.any())
    }).index("by_cuid", ["cid", "cuid"]),

    user: defineTable({
        uid: v.optional(v.string()),
        cuid: v.string(),
        token: v.optional(v.string()),
        expire: v.optional(v.number()),
        platform: v.optional(v.number()),
        partner: v.number(),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        data: v.optional(v.any()),
        game: v.optional(v.object({ name: v.string(), id: v.string(), status: v.number() })),
    }).index("by_partner", ['partner', "cuid"]).index("by_platform", ['platform', 'cuid']).index("by_uid", ['uid']).index("by_cuid", ['cuid']),

    events: defineTable({
        name: v.string(),
        uid: v.optional(v.string()),
        data: v.optional(v.any())
    }).index("by_uid", ["uid"])

});