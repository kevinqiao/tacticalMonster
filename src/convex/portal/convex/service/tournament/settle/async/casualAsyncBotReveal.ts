/** ? ingest ??? revealAt ?? scheduler(?????? reveal ??)? */
import { v } from "convex/values";
import type { MutationCtx } from "../../../../_generated/server";
import { internal } from "../../../../_generated/api";
import { internalMutation } from "../../../../_generated/server";
import { isCasualAsyncVirtualOpponentUid } from "./casualAsyncTypes";

/** ? match ??????? player_games ?? reveal scheduler */
export async function installBotRevealSchedulersForMatch(
  ctx: MutationCtx,
  args: {
    matchId: string;
    updatedAt: number;
  }
): Promise<void> {
  const games = await ctx.db
    .query("portal_run_player_games")
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
  args: { playerGameId: v.id("portal_run_player_games") },
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
