import { v } from "convex/values";
import { sessionAction } from "./custom/session";
export const doAct = sessionAction({
    args: { txt: v.string() },
    handler: async (ctx) => {
        console.log("hook acting...")
    }
})