import { v } from "convex/values";

import { sessionAction } from "../custom/session";


export const walk = sessionAction({
    args: { act: v.number(), gameId: v.string(), actionId: v.optional(v.number()), data: v.any() },
    handler: async (ctx, { act, gameId, actionId, data }) => {        
        console.log("TM game service")
    }
})
export const defend = sessionAction({
    args: { act: v.number(), gameId: v.string(), actionId: v.optional(v.number()), data: v.any() },
    handler: async (ctx, { act, gameId, actionId, data }) => {
        console.log("TM game service")
    }
})
export const attack = sessionAction({
    args: { act: v.number(), gameId: v.string(), actionId: v.optional(v.number()), data: v.any() },
    handler: async (ctx, { act, gameId, actionId, data }) => {
        console.log("TM game service")
    }
})
export const standBy = sessionAction({
    args: { act: v.number(), gameId: v.string(), actionId: v.optional(v.number()), data: v.any() },
    handler: async (ctx, { act, gameId, actionId, data }) => {
        console.log("TM game service")
    }
})


