/** 按 ingest 写入的 revealAt 注册 scheduler（不在平台计算 reveal 时间）。 */
import { v } from "convex/values";
import type { MutationCtx } from "../../../../_generated/server";
import { internal } from "../../../../_generated/api";
import { internalMutation } from "../../../../_generated/server";
import { isCasualAsyncVirtualOpponentUid } from "./casualAsyncTypes";

/** 为 match 内全部虚拟对手 player_games 注册 reveal scheduler */
export async function installBotRevealSchedulersForMatch(
  ctx: MutationCtx,
  args: {
    matchId: string;
    updatedAt: number;
  }
): Promise<void> {
  const games = await ctx.db
    .query("casual_run_player_games")
    .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
    .collect();
  const virtualGames = games.filter(
    (r) => isCasualAsyncVirtualOpponentUid(r.uid) && r.revealAt != null
  );

  for (const row of virtualGames) {
    const revealAt = row.revealAt as number;
    if (revealAt <= args.updatedAt) {
      if (row.botRevealed !== true) {
        await ctx.db.patch(row._id, {
          botRevealed: true,
          updatedAt: args.updatedAt,
        });
      }
      continue;
    }

    await ctx.db.patch(row._id, {
      botRevealed: false,
      updatedAt: args.updatedAt,
    });
    await ctx.scheduler.runAfter(
      revealAt - args.updatedAt,
      internal.service.tournament.settle.async.casualAsyncBotReveal.fireAsyncBotReveal,
      { playerGameId: row._id }
    );
  }
}

export const fireAsyncBotReveal = internalMutation({
  args: { playerGameId: v.id("casual_run_player_games") },
  handler: async (ctx, { playerGameId }) => {
    const row = await ctx.db.get(playerGameId);
    if (!row || !isCasualAsyncVirtualOpponentUid(row.uid)) return;
    if (row.botRevealed === true) return;
    await ctx.db.patch(playerGameId, {
      botRevealed: true,
      updatedAt: Date.now(),
    });
  },
});
