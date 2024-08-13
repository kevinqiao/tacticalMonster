import { v } from "convex/values";
import { action, query } from "../_generated/server";
export const findOrder = query({
  args: { uid: v.optional(v.string()), orderId: v.string() },
  handler: async (ctx, { uid, orderId }) => {
    if (orderId === "111")
      return { id: "1111", status: 0 }
    else
      return { id: "222", status: 1 }
  }
})
export const collectOrderReward = action({
  args: { partnerId: v.string(), orderId: v.string() },
  handler: async (ctx, { partnerId, orderId }) => {
    return { ok: true }
  }
})
export const collectReviewReward = action({
  args: { partnerId: v.string(), orderId: v.string() },
  handler: async (ctx, { partnerId, orderId }) => {
    return { ok: true }
  }
})
export const redeemOrder = query({
  args: { partnerId: v.string(), orderId: v.string() },
  handler: async (ctx, { partnerId, orderId }) => {
    return { ok: true }
  }
})

