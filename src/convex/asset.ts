import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";


export const findUserAssets = internalQuery({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const assets = await ctx.db.query("asset").withIndex("by_user", (q) => q.eq("uid", uid)).collect();
    return assets.map((a) => ({ ...a, _id: undefined, _creationTime: undefined }))
  },
});

export const create = internalMutation({
  args: { uid: v.string(), asset: v.number(), amount: v.number() },
  handler: async (ctx, { uid, asset, amount }) => {
    const assetId = await ctx.db.insert("asset", { uid, asset, amount, lastUpdate: Date.now() });
    return assetId;
  },
});
export const update = internalMutation({
  args: { uid: v.string(), asset: v.number(), amount: v.number() },
  handler: async (ctx, { uid, asset, amount }) => {
    const doc = await ctx.db.query("asset").withIndex("by_user_asset", (q) => q.eq("uid", uid).eq("asset", asset)).unique();
    if (!doc)
      await ctx.db.insert("asset", { uid, asset, amount });
    else {
      const _amount = doc.amount + amount;
      await ctx.db.patch(doc._id, { amount: _amount, lastUpdate: Date.now() });
    }
  },
});
export const charge = internalMutation({
  args: { uid: v.string(), cost: v.array(v.object({ asset: v.number(), amount: v.number() })) },
  handler: async (ctx, { uid, cost }) => {

    for (const c of cost) {
      console.log("uid:" + uid + " asset:" + c.asset)
      const as = await ctx.db.query("asset").withIndex("by_user_asset", (q) => q.eq("uid", uid).eq("asset", c.asset)).unique();
      console.log(as)
      if (as && as.amount >= c.amount) {
        c.amount = as.amount - c.amount;
        await ctx.db.patch(as._id, { amount: c.amount, lastUpdate: Date.now() });
      } else {
        throw new ConvexError("asset balance is not enough(" + c.amount + "-" + as?.amount + ")");
      }
    }
    console.log(cost)
    await ctx.db.insert("events", { name: "assetUpdated", uid, time: Date.now(), data: cost });
    return 1;
  },
});
export const chargeBack = internalMutation({
  args: { uid: v.string(), cost: v.array(v.object({ asset: v.number(), amount: v.number() })) },
  handler: async (ctx, { uid, cost }) => {
    for (const c of cost) {
      const as = await ctx.db.query("asset").withIndex("by_user_asset", (q) => q.eq("uid", uid).eq("asset", c.asset)).unique();
      if (as) {
        c.amount = as.amount + c.amount;
        await ctx.db.patch(as._id, { amount: c.amount, lastUpdate: Date.now() })
      }
    }
    await ctx.db.insert("events", { name: "assetUpdated", uid, time: Date.now(), data: cost });
    return 1;
  },
});

