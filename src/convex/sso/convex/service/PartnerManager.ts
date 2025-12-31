
import { v } from "convex/values";
import { query } from "../_generated/server";


export const find = query({
  args: { pid: v.number() },
  handler: async (ctx, { pid = 0 }) => {
    const partner = await ctx.db.query("partner").withIndex("by_pid", (q) => q.eq("pid", pid)).unique();
    if (!partner) {
      const p = { pid: 0, name: "Default Partner", host: "https://default.com", auth_channels: [{ cid: 0, provider: "web" }] };
      return p
    }
    if (partner?.auth_channels) {
      const auth_channels: { cid: number; provider: string; }[] = [];
      for (const cid of partner.auth_channels) {
        const auth_channel = await ctx.db.query("auth_channel").withIndex("by_channel", (q) => q.eq("cid", cid)).unique();
        if (auth_channel) {
          auth_channels.push({ cid: auth_channel.cid, provider: auth_channel.provider });
        }
      }
      return Object.assign({}, partner, { auth_channels });
    }
    return null;
  }
});
