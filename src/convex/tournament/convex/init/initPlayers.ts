import { mutation } from "../_generated/server";
import playersData from "./json/players.json";

export const initPlayers = mutation({
  args: {},
  handler: async (ctx, args) => {
    for (const record of playersData.objects) {
      await ctx.db.insert("players", {
        uid: record.uid,
        segmentName: record.segmentName,
        isSubscribed: record.isSubscribed,
        createdAt: record.createdAt,
        lastActive: record.lastActive,
      });
    }
  },
});