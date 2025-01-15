import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

 
    authprovider: defineTable({
        name: v.string(),
        path: v.string(),
    }).index("by_name", ['name']),

   
    resource: defineTable({
        app: v.string(),
        locale: v.string(),
        resource: v.any(),
    }).index("by_app_locale", ['app', 'locale']),


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