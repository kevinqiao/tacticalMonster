import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const find = internalQuery({
  args: { seed: v.string() },
  handler: async (ctx, { seed }) => {
    const gameseed = await ctx.db.query("gameseeds")
      .filter((q) => q.eq(q.field("seed"), seed)).first()
    return gameseed;
  },
});

// export const create = internalMutation({
//   args: { seed: v.string(), score: v.number() },
//   handler: async (ctx, { seed, score }) => {
//     // const cells = initGame();
//     const boardId = await ctx.db.insert("gameseeds", { seed, top: score, bottom: score, average: score, counts: 1 });
//     return boardId;
//   },
// });
export const update = internalMutation({
  args: { seed: v.string(), score: v.number() },
  handler: async (ctx, { seed, score }) => {
    const gameseed = await ctx.db.query("gameseeds").filter((q) => q.eq(q.field("seed"), seed)).first();
    if (gameseed) {
      const counts = gameseed.counts + 1;
      const average = Math.round((gameseed.average + score) / counts)
      await ctx.db.patch(gameseed._id, { average, counts });
    }
  },
});

