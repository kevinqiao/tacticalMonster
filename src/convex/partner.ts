import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";

export const find = query({
  //app:consumer/merchant
  args: { pid: v.optional(v.number()), host: v.optional(v.string()), app: v.string() },
  handler: async (ctx, { pid, host, app }) => {
    console.log(pid + ":" + host + ":" + app)
    const res: { ok: boolean; message?: any; errorCode?: number } = { ok: false };
    let partner;
    if (pid) {
      partner = await ctx.db.query("partner").withIndex("by_pid", (q) => q.eq("pid", pid)).unique();
    } else if (host) {
      const domain = ".fungift.org";
      const hostname = host.indexOf(domain) < 0 ? host : host.substring(0, host.length - domain.length);
      partner = await ctx.db.query("partner").withIndex("by_host", (q) => q.eq("host", hostname)).unique();
    }
    if (partner) {
      const channelIds: Set<number> = new Set([...partner.auth.consumer.channels, ...partner.auth.merchant.channels, ...partner.auth.playPlace.channels]);
      const channels = [];
      const authNames: Set<string> = new Set();
      for (const cid of channelIds) {
        const channel = await ctx.db.query("authchannel").withIndex("by_channelId", (q) => q.eq("id", cid)).unique();
        if (channel) {
          channels.push({ ...channel, _id: undefined, _creationTime: undefined });
          authNames.add(channel.provider);
        }
      }
      const authProviders = [];
      for (const a of authNames) {
        const authenticator = await ctx.db.query("authprovider").withIndex("by_name", (q) => q.eq("name", a)).unique();
        authProviders.push({ ...authenticator, _id: undefined, _creationTime: undefined });
      }

      res.message = { ...partner, channels, authProviders }
      res.ok = true;

      // if (channelId < 0) {
      //   res.message = { ...partner, authenticators, channels, auth: undefined, _id: undefined, _creationTime: undefined }
      //   res.ok = true;
      // } else {
      //   const auths: AuthModel = partner.auth;
      //   const auth = auths[app];
      //   // const auths: { channels: number[]; role: number } | null = partner.auth["consumer"];
      //   if (auth && (channelId === 0 || auth.channels.includes(channelId))) {

      //     const cid = channelId > 0 ? channelId : auth.channels[0]
      //     const channel = await ctx.db.query("authchannel").withIndex("by_channelId", (q) => q.eq("id", cid)).unique();
      //     if (channel) {
      //       const authenticator = await ctx.db.query("authenticator").withIndex("by_name", (q) => q.eq("name", channel.authenticator)).unique();
      //       res.message = { ...partner, _id: undefined, _creationTime: undefined, authenticators, channels, auth: { ...authenticator, channel: channel.id, data: channel['data']['public'], _id: undefined, _creationTime: undefined } }
      //       res.ok = true;
      //     }
      //   } else
      //     res.errorCode = 2
      // }
    } else {
      res.errorCode = 1;
    }
    return res;
  },
});



export const create = mutation({
  args: { name: v.string(), email: v.optional(v.string()), host: v.string(), auth: v.any() },
  handler: async (ctx, { name, email, host, auth }) => {
    const p = await ctx.db.query("partner").order("desc").first();
    const pid = p ? p.pid + 1 : 1000;
    await ctx.db.insert("partner", { name, email, host, pid, auth });
    return pid;
  },
});
export const update = mutation({
  args: { id: v.number(), data: v.any() },
  handler: async (ctx, { id, data }) => {
    const partner = await ctx.db.query("partner").withIndex("by_pid", (q) => q.eq("pid", id)).unique();
    if (partner)
      await ctx.db.patch(partner._id, { ...data });
  },
});
export const findById = internalQuery({
  args: { pid: v.number() },
  handler: async (ctx, { pid }) => {
    const p = await ctx.db.query("partner").withIndex("by_pid", (q) => q.eq("pid", pid)).unique();
    return { ...p, _id: undefined, _creationTime: undefined };
  },
});