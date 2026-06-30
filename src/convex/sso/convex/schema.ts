import { defineSchema, defineTable } from "convex/server";

import { v } from "convex/values";



export default defineSchema({

    partner: defineTable({

        pid: v.number(),

        name: v.optional(v.string()),

        host: v.optional(v.string()),

        auth_channels: v.array(v.number()),

        /** Platform / Partner admin Web password (cid=0). Consumer uses `auth_channels`. */
        staff_auth_channels: v.optional(v.array(v.number())),

        data: v.optional(v.any()),

        /** URL segment for /portal/{portal_key}/{gameType} (e.g. crazygames). */
        portal_key: v.optional(v.string()),

    })
        .index("by_pid", ["pid"])
        .index("by_name", ["name"])
        .index("by_portal_key", ["portal_key"]),



    partner_staff: defineTable({

        partnerId: v.number(),

        uid: v.string(),

        role: v.union(

            v.literal("owner"),

            v.literal("admin"),

            v.literal("developer"),

            v.literal("viewer")

        ),

        createdAt: v.number(),

    })

        .index("by_partner_uid", ["partnerId", "uid"])

        .index("by_partner", ["partnerId"])

        .index("by_uid", ["uid"]),



    platform_staff: defineTable({

        uid: v.string(),

        role: v.union(v.literal("owner"), v.literal("admin"), v.literal("viewer")),

        createdAt: v.number(),

    }).index("by_uid", ["uid"]),



    /**
     * Web SignIn account (auth_channel cid=0).
     * `accountId` = login id = `auth_identities.subject` (e.g. admin).
     * `email` optional contact address when login id is an email.
     */

    user: defineTable({

        accountId: v.string(),

        email: v.optional(v.string()),

        passwordHash: v.string(),

        name: v.optional(v.string()),

        phone: v.optional(v.string()),

        createdAt: v.number(),

        updatedAt: v.number(),

    })

        .index("by_accountId", ["accountId"])

        .index("by_email", ["email"]),



    /** Canonical platform identity: uid = `${cid}_${partnerId}_${hash(subject)}`. JWT subject = uid. */

    auth_identities: defineTable({

        uid: v.string(),

        provider: v.string(),

        subject: v.string(),

        partnerId: v.optional(v.number()),

        cid: v.optional(v.number()),

        email: v.optional(v.string()),

        name: v.optional(v.string()),

        phone: v.optional(v.string()),

        data: v.optional(v.any()),

        expire: v.optional(v.number()),

        lastUpdate: v.optional(v.number()),

        createdAt: v.number(),

        updatedAt: v.number(),

    })

        .index("by_uid", ["uid"])

        .index("by_provider_subject", ["provider", "subject"])

        .index("by_partner_subject", ["partnerId", "subject"]),

});


