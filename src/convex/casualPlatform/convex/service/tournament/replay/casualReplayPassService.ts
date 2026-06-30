import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import { authedMutation, authedQuery } from "../../../custom/session";
import { countUnusedReplayTokens } from "./casualReplayTokens";
import {
  startCasualRunReplayWithToken,
  type StartCasualRunReplayResult,
} from "./casualRunReplay";

export const countUnusedReplayTokensForUid = authedQuery({
  args: {},
  handler: async (ctx) => {
    const n = await countUnusedReplayTokens(ctx, ctx.uid);
    return { count: n };
  },
});

export async function findOldestUnusedReplayTokenId(
  ctx: MutationCtx,
  uid: string
): Promise<Id<"casual_replay_tokens"> | null> {
  const rows = await ctx.db
    .query("casual_replay_tokens")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .collect();
  const unused = rows.filter((r) => r.usedAt == null).sort((a, b) => a.createdAt - b.createdAt);
  return unused[0]?._id ?? null;
}

/**
 * 再战：不新建 match/gameId，不再次 join/扣入场费。
 * 平台将 `casual_run_player_matches` 恢复为 `open`；客户端用同一 `gameId` 调游戏 `loadGame({ resetCasualRun: true })` 后重传分数。
 */
export const startCasualRunReplay = authedMutation({
  args: {
    matchGameId: v.string(),
    replayTokenId: v.id("casual_replay_tokens"),
  },
  handler: async (ctx, args): Promise<StartCasualRunReplayResult> => {
    return await startCasualRunReplayWithToken(ctx, { uid: ctx.uid, ...args });
  },
});
