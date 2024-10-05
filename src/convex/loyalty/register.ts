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
    const serviceChargeDocs = await ctx.db.query("inventory_service_charge").withIndex("by_partner", (q) => q.eq("partnerId", partnerId)).collect();
    const serviceCharges = serviceChargeDocs.map((c, index) => ({ ...c, _id: undefined, _creationTime: undefined, name: c.name[loc] }));
    const comboDocs = await ctx.db.query("inventory_combo").withIndex("by_partner", (q) => q.eq("partnerId", partnerId)).collect();
    const combos = comboDocs.map((c, index) => ({ ...c, _id: undefined, _creationTime: undefined, name: c.name[loc] }))
    const comboGrpDocs = await ctx.db.query("inventory_combo_group").withIndex("by_partner", (q) => q.eq("partnerId", partnerId)).collect();
    const comboGroups = comboGrpDocs.map((c, index) => ({ ...c, _id: undefined, _creationTime: undefined, name: c.name[loc] }));

    return {
      categories, items, comboGroups: comboGroups ?? [], combos: combos ?? [], modifierGroups: modifierGroups ?? [], modifiers: modifiers ?? [], discounts: discounts ?? [], serviceCharges: serviceCharges ?? []
    }
  }
})
export const findOrder = action({
  args: { partnerId: v.string(), orderId: v.string() },
  handler: async (ctx, { partnerId, orderId }) => {
    return { ok: true }
  }
})

