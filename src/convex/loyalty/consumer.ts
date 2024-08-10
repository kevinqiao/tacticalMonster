import { v } from "convex/values";
import { action, query } from "../_generated/server";
export const findOrder = query({
  args: { uid: v.optional(v.string()), orderId: v.string() },
  handler: async (ctx, { uid, orderId }) => {
    return { ok: true }
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

