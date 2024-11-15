import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    tmgame: defineTable({
        id: v.string(),
        players: v.array(v.object({ uid: v.string(), characters: v.array(v.object({ id: v.number(), move_arrange: v.number(), position: v.object({ x: v.number(), y: v.number() }) })) })),
        obstacles: v.array(v.object({ x: v.number(), y: v.number(), asset: v.number(), type: v.optional(v.number()) })),
        disables: v.array(v.object({ x: v.number(), y: v.number() })),
        status: v.number(),
    }),
    combatEvent: defineTable({
        type: v.number(),
        gameId: v.string(),
        time: v.optional(v.number()),
        data: v.any(),
    }).index("by_game", ["gameId"]),
    games: defineTable({
        uid: v.string(),
        tid: v.string(),//tournament type(config) id
        battleId: v.string(),
        ref: v.optional(v.string()),
        seed: v.string(),
        diffcult: v.string(),
        laststep: v.optional(v.number()),
        startTime: v.optional(v.number()),
        dueTime: v.optional(v.number()),
        result: v.optional(v.object({ base: v.number(), time: v.number(), goal: v.number() })),//{base:number;time:number;goal:number}
        score: v.optional(v.number()),//final score used by index
        status: v.optional(v.number()),//0-open 1-settled 2-rewarded
        type: v.number(),//0-one time battle tournament 1-leaderboard with pvp 2-leaderboard with best score;
        data: v.object({ cells: v.array(v.any()), matched: v.optional(v.array(v.any())), skillBuff: v.array(v.object({ skill: v.number(), progress: v.number() })), move: v.optional(v.number()), lastCellId: v.number(), goalCompleteTime: v.optional(v.number()) })
    }).index("by_seed", ["seed"]).index("by_user_type", ["uid", "type"]).index("by_score", ["score"]).index("by_battle", ['battleId']).index("by_tournament_user", ["tid", "uid"]),
    phonecode: defineTable({
        partner: v.number(),
        phone: v.string(),
        code: v.string(),
        expire: v.number()
    }).index("by_phone_expire", ['phone', 'expire']),
    authprovider: defineTable({
        name: v.string(),
        path: v.string(),
    }).index("by_name", ['name']),

    authchannel: defineTable({
        id: v.number(),
        provider: v.string(),
        desc: v.optional(v.string()),
        data: v.optional(v.any())
    }).index("by_channelId", ["id"]),

    gameseeds: defineTable({
        seed: v.string(),
        top: v.number(),
        bottom: v.number(),
        average: v.number(),
        counts: v.number()
    }),
    events: defineTable({
        name: v.string(),
        battleId: v.optional(v.string()),
        gameId: v.optional(v.string()),
        uid: v.optional(v.string()),
        steptime: v.optional(v.number()),
        time: v.optional(v.number()),
        actionId: v.optional(v.number()),
        data: v.any(),
    }).index("by_game", ["gameId"]).index("by_uid", ["uid"]).index("by_battle", ["battleId"]),

    diffcult: defineTable({
        id: v.string(),
        level: v.number(),
        hard: v.number(),
        data: v.any(),
    }).index("by_level", ["level"]).index("by_hard", ["hard"]).index("by_did", ["id"]),

    battle: defineTable({
        type: v.number(),//0-one battle for all  1-scoring rank by pvp point 2-scoring rank by  best score
        participants: v.number(),
        tournamentId: v.string(),
        term: v.optional(v.number()),//schedule tournament term
        // uid: r.uid, gameId: r._id, rank: index, score: r.score, assets: [] 
        rewards: v.optional(v.array(v.object({ uid: v.string(), gameId: v.string(), rank: v.number(), score: v.number(), collected: v.optional(v.number()), assets: v.array(v.object({ asset: v.number(), amount: v.number() })) }))),
        leaderboards: v.optional(v.array(v.object({ type: v.number(), uid: v.string(), score: v.number(), points: v.optional(v.number()), rank: v.number() }))),
        startTime: v.number(),
        dueTime: v.optional(v.number()),
        duration: v.number(),
        status: v.number(),//0-going 1-settled 2-cancelled
        diffcult: v.string(),
    }).index("by_type_status_duetime", ["type", "status", "dueTime"]),


    resource: defineTable({
        app: v.string(),
        locale: v.string(),
        resource: v.any(),
    }).index("by_app_locale", ['app', 'locale']),

    tournament: defineTable({
        id: v.string(),
        context: v.optional(v.string()),
        creator: v.optional(v.string()),
        type: v.number(),//0-one battle for all  1-scoring rank by pvp point 2-scoring rank by  best score
        participants: v.number(),
        settled: v.optional(v.number()),
        currentTerm: v.optional(v.number()),
        battle: v.object({ type: v.number(), duration: v.number(), sessions: v.number(), players: v.number(), reward: v.optional(v.object({ win: v.number(), draw: v.number(), fail: v.number() })) }),
        openTime: v.optional(v.number()),
        closeTime: v.optional(v.number()),
        scheduler: v.optional(v.object({ timeZone: v.string(), slots: v.array(v.object({ day: v.number(), weekday: v.number(), hour: v.number(), minute: v.number(), duration: v.number() })) })),
        entry: v.optional(v.object({ level: v.number(), cost: v.array(v.object({ asset: v.number(), amount: v.number() })) })),
        rewards: v.array(v.object({ rank: v.number(), assets: v.array(v.object({ asset: v.number(), amount: v.number() })) })),
        status: v.number()//0-open 1-disable
    }).index("by_status", ["status"]),
    asset: defineTable({
        asset: v.number(),
        uid: v.string(),
        amount: v.number(),
        lastUpdate: v.optional(v.number())
    }).index("by_user", ['uid']).index("by_user_asset", ['uid', 'asset']),
    cuser: defineTable({
        cid: v.string(),
        cuid: v.string(),
        channel: v.number(),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        data: v.optional(v.any())
    }).index("by_channel_cid", ["channel", "cid"]),
    user: defineTable({
        name: v.string(),
        uid: v.optional(v.string()),
        avatar: v.optional(v.number()),
        cuid: v.string(),
        token: v.optional(v.string()),
        partner: v.optional(v.number()),
        lastUpdate: v.optional(v.number()),
        lastEventTime: v.optional(v.number()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        role: v.optional(v.number()),//0-consumer 1-employee 2-owner
        status: v.optional(v.number())//0-inactive 1-active
    }).index("by_channel_partner", ['cuid', 'partner']).index("by_uid", ['uid']),
    partner: defineTable({
        name: v.string(),
        pid: v.number(),
        host: v.string(),
        domain: v.optional(v.string()),
        auth: v.object({
            consumer: v.object({ channels: v.array(v.number()), role: v.number() }),
            merchant: v.object({ channels: v.array(v.number()), role: v.number() }),
            playPlace: v.object({ channels: v.array(v.number()), role: v.number() }),
        }),
        pos: v.optional(v.any()),
        desc: v.optional(v.string()),
        email: v.optional(v.string())
    }).index("by_host", ["host"]).index("by_domain", ['domain']).index("by_name", ['name']).index("by_pid", ['pid']),
    employee: defineTable({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        employeeId: v.string(),
        password: v.string(),
        partner: v.number(),
    }).index("by_partner_employee", ['partner', 'employeeId']).index("by_partner", ["partner"]),
    transaction: defineTable({
        tid: v.string(),
        type: v.number(),//0-credit 1-debit
        asset: v.number(),
        amount: v.number(),
        uid: v.string()
    }),
    matchqueue: defineTable({
        uid: v.string(),
        type: v.optional(v.number()),
        tournamentId: v.string(),
    }),
    leaderboard: defineTable({
        tournamentId: v.string(),
        term: v.optional(v.number()),
        uid: v.string(),
        score: v.number(),
        rank: v.optional(v.number()),
        lastUpdate: v.number(),
        reward: v.optional(v.array(v.object({ asset: v.number(), amount: v.number() }))),
        collected: v.optional(v.number())
    }).index("by_user", ['uid']).index("by_tournament_term_score", ["tournamentId", "term", "score"]).index("by_tournament_term_uid", ["tournamentId", "term", "uid"]),

    // review: defineTable({
    //     email: v.optional(v.string()),
    //     phone: v.optional(v.string()),
    //     partnerId: v.number(),
    //     app: v.number(),//1-google 2-facebook 3-twitter
    //     aid: v.string(),//reviewId from app;
    //     star: v.number(),
    //     comment: v.string(),
    //     status: v.number(),//0-created 1-deleted
    // }).index("by_partner", ['partnerId']).index("by_email", ['partnerId', 'email']).index("by_phone", ['partnerId', 'phone']),

    // order: defineTable({
    //     email: v.optional(v.string()),
    //     phone: v.optional(v.string()),
    //     uid: v.optional(v.string()),
    //     locationId: v.optional(v.string()),
    //     tableNo: v.optional(v.number()),
    //     partnerId: v.number(),//partner id
    //     oid: v.string(),//original order id created by pos
    //     status: v.number(),//0-open 1-paid 2-collected 3-cancelled
    //     amount: v.number(),
    //     data: v.optional(v.any()),
    // }).index("by_location", ["partnerId", "locationId"]).index("by_partner_oid", ['partnerId', 'oid']).index("by_partner_customer", ['partnerId', 'uid']),

    tm_skill: defineTable({
        character_id: v.string(),
        skills: v.array(v.any())
    }),
    tm_level: defineTable({
        character_id: v.string(),
        levels: v.array(v.any())
    }),
    tm_character: defineTable({
        character_id: v.string(),
        name: v.string(),
        level: v.number()
    })
});