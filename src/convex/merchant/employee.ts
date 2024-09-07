import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";
export const create = internalMutation({
  args: { employeeId: v.string(), password: v.string(), phone: v.optional(v.string()), email: v.optional(v.string()), partner: v.number() },
  handler: async (ctx, { employeeId, password, phone, email, partner }) => {
    await ctx.db.insert("employee", { employeeId, password, email, phone, partner })
    return
  }
})
export const findByPartner = query({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const employees = await ctx.db.query("employee").withIndex("by_partner", (q) => q.eq("partner", partnerId)).collect();
    return employees
  }
})
export const authenticate = internalQuery({
  args: { partnerId: v.number(), employeeId: v.string(), password: v.string() },
  handler: async (ctx, { partnerId, employeeId, password }) => {
    const employee = await ctx.db.query("employee").withIndex("by_partner_employee", (q) => q.eq("partner", partnerId).eq("employeeId", employeeId)).unique()
    if (employee?.password === password)
      return { ok: true }
    else
      return { ok: false }
  }
})

