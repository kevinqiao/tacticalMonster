/** 按 ingest 写入的 revealAt 注册 scheduler（不在平台计算 reveal 时间）。 */
import { v } from "convex/values";
import type { MutationCtx } from "../../../../_generated/server";
import { internal } from "../../../../_generated/api";
import { internalMutation } from "../../../../_generated/server";
import { isCasualAsyncVirtualOpponentUid } from "./casualAsyncTypes";

/** 为 match 内全部虚拟对手行注册 reveal scheduler */
export async function installBotRevealSchedulersForMatch(
  ctx: MutationCtx,
  args: {
    matchId: string;
    updatedAt: number;
  }
): Promise<void> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", args.matchId))
    .collect();
  const virtualRows = rows.filter(
    (r) => isCasualAsyncVirtualOpponentUid(r.uid) && r.revealAt != null
  );

  for (const row of virtualRows) {
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
      { playerMatchId: row._id }
    );
  }
}

export const fireAsyncBotReveal = internalMutation({
  args: { playerMatchId: v.id("casual_run_player_matches") },
  handler: async (ctx, { playerMatchId }) => {
    const row = await ctx.db.get(playerMatchId);
    if (!row || !isCasualAsyncVirtualOpponentUid(row.uid)) return;
    if (row.botRevealed === true) return;
    await ctx.db.patch(playerMatchId, {
      botRevealed: true,
      updatedAt: Date.now(),
    });
  },
});
