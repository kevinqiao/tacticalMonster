import { defineSchema, defineTable } from "convex/server";

import { v } from "convex/values";



export default defineSchema({

    partner: defineTable({

        pid: v.number(),

        name: v.optional(v.string()),

        host: v.optional(v.string()),

        /**
         * Player login SoT.
         * mode: clerk | embed | embed_then_clerk; embed.method when mode uses embed.
         */
        playerAuth: v.optional(
          v.object({
            mode: v.union(
              v.literal("clerk"),
              v.literal("embed"),
              v.literal("embed_then_clerk")
            ),
            embed: v.optional(
              v.object({
                method: v.union(
                  v.literal("jwt_local"),
                  v.literal("crazygames_jwt"),
                  v.literal("code_exchange"),
                  v.literal("session_introspect")
                ),
              })
            ),
          })
        ),

        /** Staff console login SoT. */
        staffAuth: v.optional(
          v.object({
            mode: v.literal("web"),
          })
        ),

        /**
         * Bag for runtime config: embed JWT secret, branding, allowedOrigins, defaultLandingPath.
         * Player login mode lives on `playerAuth` (not here).
         * Product gates (portal/campaign) live only on `capabilities`.
         */
        data: v.optional(v.any()),

        /** URL segment for /gc/{portal_key}/{gameType} (e.g. crazygames). */
        portal_key: v.optional(v.string()),

        /**
         * Enabled game types from partnerGameRegistry (allowlist; unset/empty → full registry).
         * Also caps merchant campaign gameType for merchants bound to this partner.
         */
        games: v.optional(v.array(v.string())),

        /**
         * Product capability flags — sole source of truth for Portal vs Campaign Ops.
         * Unset → both false.
         */
        capabilities: v.optional(
          v.object({
            portalGames: v.boolean(),
            campaignOps: v.boolean(),
          })
        ),

        /** Public URL segment for /cc/{slug}/... when campaignOps. */
        slug: v.optional(v.string()),

    })
        .index("by_pid", ["pid"])
        .index("by_name", ["name"])
        .index("by_portal_key", ["portal_key"])
        .index("by_slug", ["slug"]),



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

    /** Redeem location (门店). Owned by a campaignOps partner. */
    store: defineTable({
        storeId: v.string(),
        partnerId: v.number(),
        slug: v.string(),
        name: v.string(),
        status: v.union(v.literal("active"), v.literal("suspended")),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_storeId", ["storeId"])
        .index("by_slug", ["slug"])
        .index("by_partnerId", ["partnerId"]),

    store_staff: defineTable({
        storeId: v.string(),
        uid: v.string(),
        role: v.union(v.literal("owner"), v.literal("staff")),
        createdAt: v.number(),
    })
        .index("by_store", ["storeId"])
        .index("by_store_uid", ["storeId", "uid"])
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



    /** Canonical platform identity: uid = `${cid}_${partnerId}_${hash(subject)}`. JWT subject = uid.
     * Staff Web (cid=0): partnerId is always 0 (one person platform-wide).
     * Consumers (Clerk/embed/…): partnerId is the real Partner (per-tenant isolation).
     */

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


