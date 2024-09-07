import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalMutation, internalQuery, query } from "../_generated/server";
export const create = internalMutation({
  args: { partner: v.number(), phone: v.string(), code: v.string(), expire: v.number() },
  handler: async (ctx, { partner, phone, code, expire }) => {
    await ctx.db.insert("phonecode", { partner, phone, code, expire })
    return
  }
})
export const findPhoneCode = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const doc = await ctx.db.query("phonecode").withIndex("by_phone_expire", (q) => q.eq("phone", phone).gt("expire", Date.now())).unique();
    return doc?.code
  }
})

export const requestCode = action({
  args: { phone: v.string(), partner: v.number() },
  handler: async (ctx, { phone, partner }) => {
    const code = await ctx.runQuery(internal.auth.twilio.findPhoneCode, { phone })
    if (!code) {
      const expire = Date.now() + 60000
      await ctx.runMutation(internal.auth.twilio.create, { partner, phone, code: "1111", expire })
      return { ok: true, expire }
    }
    return { ok: false }
  }
})
export const verifyCode = query({
  args: { phone: v.string(), partner: v.number(), code: v.string() },
  handler: async (ctx, { phone, partner, code }) => {
    const doc = await ctx.db.query("phonecode").withIndex("by_phone_expire", (q) => q.eq("phone", phone).lte("expire", Date.now())).unique();
    if (doc?.partner === partner && doc.code === code)
      return true;
    else
      return false;
  }
})


