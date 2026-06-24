import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import { mutation, query } from "../../../_generated/server";
import { countUnusedReplayTokens } from "./casualReplayTokens";
import {
  startCasualRunReplayWithToken,
  type StartCasualRunReplayResult,
} from "./casualRunReplay";

export const countUnusedReplayTokensForUid = query({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const n = await countUnusedReplayTokens(ctx, uid);
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
 * ??:??? match/gameId,??? join/?????
 * ??? `portal_run_player_matches` ??? `open`;?????? `gameId` ??? `loadGame({ resetCasualRun: true })` ??????
 */
export const startCasualRunReplay = mutation({
  args: {
    uid: v.string(),
    matchGameId: v.string(),
    replayTokenId: v.id("casual_replay_tokens"),
  },
  handler: async (ctx, args): Promise<StartCasualRunReplayResult> => {
    return await startCasualRunReplayWithToken(ctx, args);
  },
});
