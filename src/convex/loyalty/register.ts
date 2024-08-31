import { v } from "convex/values";
import { action, query } from "../_generated/server";
export const findInventory = query({
  args: { partnerId: v.number(), locale: v.optional(v.string()) },
  handler: async (ctx, { partnerId, locale }) => {
    const loc = locale ?? "en-US";
    const categoryDocs = await ctx.db.query("inventory_category").withIndex("by_partner", (q) => q.eq("partnerId", partnerId)).collect();
    const categories = categoryDocs.map((c, index) => ({ ...c, _id: undefined, _creationTime: undefined, name: c.name[loc] }))
    const itemDocs = await ctx.db.query("inventory_item").withIndex("by_partner", (q) => q.eq("partnerId", partnerId)).collect();
    const items = itemDocs.map((c, index) => ({ ...c, _id: undefined, _creationTime: undefined, name: c.name[loc] }));
    const modifierDocs = await ctx.db.query("inventory_modifier").withIndex("by_partner", (q) => q.eq("partnerId", partnerId)).collect();
    const modifiers = modifierDocs.map((c, index) => ({ ...c, _id: undefined, _creationTime: undefined, name: c.name[loc] }))
    const modifierGrpDocs = await ctx.db.query("inventory_modifier_group").withIndex("by_partner", (q) => q.eq("partnerId", partnerId)).collect();
    const modifierGroups = modifierGrpDocs.map((c, index) => ({ ...c, _id: undefined, _creationTime: undefined, name: c.name[loc] }));
    const discountDocs = await ctx.db.query("inventory_discount").withIndex("by_partner", (q) => q.eq("partnerId", partnerId)).collect();
    const discounts = discountDocs.map((c, index) => ({ ...c, _id: undefined, _creationTime: undefined, name: c.name[loc] }))
    return { categories, items, modifierGroups: modifierGroups ?? [], modifiers: modifiers ?? [], discounts: discounts ?? [] }
  }
})
export const findOrder = action({
  args: { partnerId: v.string(), orderId: v.string() },
  handler: async (ctx, { partnerId, orderId }) => {
    return { ok: true }
  }
})

