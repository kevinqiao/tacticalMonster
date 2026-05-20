import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { query } from "../../_generated/server";
import {
  consumeReplayToken,
  countUnusedReplayTokens,
} from "./casualBotDifficultyService";

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

export async function consumeReplayTokenForJoin(
  ctx: MutationCtx,
  args: { uid: string; tokenId: Id<"casual_replay_tokens">; tournamentId: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  return consumeReplayToken(ctx, args);
}
