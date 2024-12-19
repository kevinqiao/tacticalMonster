"platform: 'node'"
import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
export const findAll = internalQuery({
  handler: async (ctx) => {
    const users = await ctx.db.query("user").order("desc").collect();
    return users
  },
});

export const find = internalQuery({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
    return { ...user, _id: undefined, _creationTime: undefined };
  },
});

export const findByUid = query({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
    return user;
  },
});

export const findByPartner = query({
  args: { cid: v.string(), partner: v.number() },
  handler: async (ctx, { cid, partner }) => {
    const user = await ctx.db.query("user").withIndex("by_channel_partner", (q) => q.eq("cid", cid).eq("partner", partner)).unique();
    return user;
  },
});
// export const findPlayers = query({
//   args: { uids: v.any() },
//   handler: async (ctx, { uids }) => {
//     const players = [];
//     for (const userId of uids) {
//       const player = await ctx.db.get(userId as Id<"user">);
//       if (player) {
//         const { _id: uid, avatar, name } = player;
//         players.push({ uid, avatar, name })
//       }
//     }
//     return players
//   },
// });

export const create = mutation({
  args: { cid: v.string(), name: v.string(), partner: v.optional(v.number()), token: v.optional(v.string()), email: v.optional(v.string()) },
  handler: async (ctx, { cid, name, partner, token, email }) => {
    const uid = await ctx.db.insert("user", { 
      cid, 
      name, 
      email, 
      token, 
      partner,
      uid: ""
    });
    if (uid) {
      await ctx.db.patch(uid, { uid });
    }
    return uid;
  },
});

export const update = internalMutation({
  args: { id: v.id("user"), data: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { ...args.data, lastUpdate: Date.now() });
  },
});
export const updateToken = mutation({
  args: { id: v.id("user"), token: v.string() },
  handler: async (ctx, { id, token }) => {
    await ctx.db.patch(id, { token });
  },
});
export const authorize = internalMutation({
  args: { channel: v.number(), cid: v.string(), token: v.string(), partner: v.number(), username: v.string(), email: v.optional(v.string()), phone: v.optional(v.string()), role: v.optional(v.number()) },
  handler: async (ctx, { cid, channel, token, username, phone, email, partner, role }) => {
    console.log("role:" + role)
    let cuser: any = await ctx.db.query("cuser").withIndex("by_channel_cid", (q) => q.eq('channel', channel).eq("cid", cid)).unique();
    const cuid = cid + "-" + channel;
    if (!cuser) {
      cuser = { cid, cuid, name: username, channel, phone, email }
      const _id = await ctx.db.insert("cuser", cuser);
      cuser['id'] = _id;
    }
    let user: any = await ctx.db.query("user").withIndex("by_channel_partner", (q) => q.eq("cid", cid).eq("partner", partner)).unique();
    if (!user) {
      user = {
        cuid,
        name: username,
        partner,
        token,
        role
      }
      const uid = await ctx.db.insert("user", user);
      if (uid) {
        await ctx.db.patch(uid, { uid });
        user.uid = uid;
      }
    } else {
      await ctx.db.patch(user._id, { token, role });
      user.token = token
      user.role = role
    }

    return user;
  },
});

