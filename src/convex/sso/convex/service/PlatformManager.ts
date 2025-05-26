
import { v } from "convex/values";
import { query } from "../_generated/server";

export const findPlatform = query({
  args: { partner: v.optional(v.string()), platform: v.optional(v.string()) },
  handler: async (ctx, { partner, platform }) => {

    return { name: "TELEGRAM", support: 1, paramters: { url: "https://www.baidu.com" } }
  }
})
