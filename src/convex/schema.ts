import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

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
        channel: v.number(),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        data: v.optional(v.any())
    }).index("by_channel_cid", ["channel", "cid"]),
    user: defineTable({
        name: v.string(),
        uid: v.string(),
        avatar: v.optional(v.number()),
        cid: v.string(),
        token: v.optional(v.string()),
        partner: v.optional(v.number()),
        lastUpdate: v.optional(v.number()),
        lastEventTime: v.optional(v.number()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        role: v.optional(v.number()),//0-consumer 1-employee 2-owner
        status: v.optional(v.number())//0-inactive 1-active
    }).index("by_channel_partner", ['cid', 'partner']).index("by_uid", ['uid']),
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
    tm_player: defineTable({
        uid: v.string(),
        level: v.number(),
        exp: v.number(),
        name: v.optional(v.string()),
        avatar: v.optional(v.string())
    }).index("by_uid", ["uid"]),
    tm_skill_data: defineTable({
        character_id: v.string(),
        character_name: v.string(),
        skills: v.array(v.any())
    }).index("by_character", ["character_id"]),
    tm_character_level: defineTable({
        character_id: v.string(),
        levels: v.array(v.object({ level: v.number(), required_exp: v.number(), attributes: v.any() }))
    }).index("by_character_id", ["character_id"]),
    tm_character_data: defineTable({
        character_id: v.string(),
        name: v.string(),
        class: v.optional(v.string()),
        race: v.optional(v.string()),
        asset: v.object({ type: v.number(), resource: v.object({ atlas: v.optional(v.string()), spineData: v.optional(v.string()), fbx: v.optional(v.string()) }) }),
        move_range: v.number(),
        attack_range: v.object({ min: v.number(), max: v.number() }),
        skills: v.optional(v.array(v.string())) 
    }).index("by_character_id", ["character_id"]),
    tm_player_character: defineTable({
        character_id: v.string(),
        uid: v.string(),
        level: v.number(),
        unlockSkills: v.optional(v.array(v.string())),
        status: v.optional(v.number()),
    }).index("by_player", ["uid", "character_id"]),
    tm_game_character: defineTable({
        name: v.optional(v.string()),   
        character_id: v.string(),
        uid: v.string(),
        gameId: v.string(),
        level: v.number(),
        class: v.optional(v.string()),
        race: v.optional(v.string()),   
        asset: v.object({ type: v.number(), resource: v.object({ atlas: v.optional(v.string()), spineData: v.optional(v.string()), fbx: v.optional(v.string()) }) }),
        stats: v.optional(v.any()),
        q: v.number(),
        r: v.number(),
        statusEffects: v.optional(v.array(v.any())),
        cooldowns: v.optional(v.any()),
        move_range: v.optional(v.number()),
        attack_range: v.object({ min: v.number(), max: v.number() }),
        skills: v.optional(v.array(v.string())),
    }).index("by_game", ['gameId']).index("by_game_character", ['gameId','uid', 'character_id']),
    tm_game: defineTable({
        challenger: v.string(),
        challengee: v.string(),
        players: v.array(v.object({ uid: v.string(), name: v.optional(v.string()), avatar: v.optional(v.string()) })),
        round: v.number(),
        lastUpdate: v.number(),
        map:v.string(),
        status:v.optional(v.number())
    }).index("by_challenger", ["challenger"]).index("by_challengee", ["challengee"]),
    tm_game_round: defineTable({
        gameId: v.id("tm_game"),
        no: v.number(),
        status: v.number(),
        endTime: v.optional(v.number()),    
        turns: v.array(v.object({ uid: v.string(), character_id: v.string(), status: v.number(), startTime: v.optional(v.number()), endTime: v.optional(v.number()),skills:v.optional(v.array(v.string())), skillSelect:v.optional(v.string()) }))
    }).index("by_game_round", ["gameId", "no"]),
    tm_game_turn: defineTable({
        gameId: v.id("tm_game"),
        round: v.number(),
        uid: v.string(),
        character_id: v.string(),
        status: v.number(),
    }).index("by_game_round", ["gameId", "round"]),

    // tm_action: defineTable({
    //     gameId: v.id("tm_game"),
    //     round: v.number(),
    //     uid: v.string(),
    //     character: v.string(),
    //     act: v.number(),
    //     data: v.any()
    // }).index("by_game_round_uid_character", ["gameId", "round", "uid", "character"]),
    tm_map_data: defineTable({
        map_id: v.string(),
        rows: v.number(),
        cols: v.number(),
        obstacles: v.array(v.object({ q: v.number(), r: v.number(), type: v.number(), asset: v.string() })),
        disables: v.array(v.object({ q: v.number(), r: v.number() })),
    }).index("by_map_id", ["map_id"]),
    tm_event: defineTable({
        uid: v.optional(v.string()),
        gameId: v.optional(v.string()),
        type: v.optional(v.number()),//0-phase 1-action 2-skill 
        name:v.string(),
        data: v.optional(v.any())
    }).index("by_game", ["gameId"]).index("by_player", ["uid"])
});