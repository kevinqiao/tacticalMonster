import { v } from "convex/values";

import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import { internalQuery } from "../../../_generated/server";
import { isRegisteredCasualGameType } from "../../../data/casualGameRegistry";
import { findPlayerGameByGameId } from "../shared/casualPlayerGameTypes";
import { isCasualAsyncVirtualOpponentUid } from "./async/casualAsyncTypes";

/** 真人 open run 创建后 5 分钟核查是否仍未结算 */
export const CASUAL_OPEN_RUN_SETTLE_CHECK_MS = 5 * 60 * 1000;

export async function scheduleOpenRunSettleCheckForPlayerGame(
  ctx: MutationCtx,
  args: {
    playerGameId: Id<"casual_run_player_games">;
    gameId: string;
    uid: string;
    gameType: string;
    createdAt: number;
  }
): Promise<void> {
  if (isCasualAsyncVirtualOpponentUid(args.uid)) return;
  if (!isRegisteredCasualGameType(args.gameType)) return;

  const dueAt = args.createdAt + CASUAL_OPEN_RUN_SETTLE_CHECK_MS;
  const delayMs = Math.max(0, dueAt - Date.now());
  try {
    const jobId = await ctx.scheduler.runAfter(
      delayMs,
      internal.service.tournament.settle.casualOpenRunSettleCheckAction.runOpenRunSettleCheck,
      {
        playerGameId: args.playerGameId,
        gameId: args.gameId,
        uid: args.uid,
        gameType: args.gameType,
        dueAt,
      }
    );
    await ctx.db.patch(args.playerGameId, {
      openSettleCheckScheduledId: jobId,
      openSettleCheckDueAt: dueAt,
    });
  } catch (e) {
    console.warn("[casual] scheduleOpenRunSettleCheck failed", args.gameId, e);
  }
}

export async function cancelOpenRunSettleCheckForGameId(
  ctx: MutationCtx,
  gameId: string
): Promise<void> {
  const pg = await findPlayerGameByGameId(ctx, gameId);
  if (!pg?.openSettleCheckScheduledId) return;
  try {
    await ctx.scheduler.cancel(pg.openSettleCheckScheduledId);
  } catch (e) {
    console.warn("[casual] cancelOpenRunSettleCheck failed", gameId, e);
  }
  await ctx.db.patch(pg._id, {
    openSettleCheckScheduledId: undefined,
  });
}

export const getOpenRunSettleCheckState = internalQuery({
  args: {
    playerGameId: v.id("casual_run_player_games"),
    dueAt: v.number(),
  },
  handler: async (ctx, { playerGameId, dueAt }) => {
    const pg = await ctx.db.get(playerGameId);
    if (!pg) {
      return { needsSettle: false as const, reason: "gone" as const };
    }
    if (isCasualAsyncVirtualOpponentUid(pg.uid)) {
      return { needsSettle: false as const, reason: "bot" as const };
    }
    if (pg.status !== "open" && pg.status !== "replaying") {
      return { needsSettle: false as const, reason: "already_closed" as const };
    }
    const pm = await ctx.db.get(pg.playerMatchId);
    if (!pm || (pm.status !== "open" && pm.status !== "replaying")) {
      return { needsSettle: false as const, reason: "pm_closed" as const };
    }
    const now = Date.now();
    if (now < dueAt) {
      return {
        needsSettle: false as const,
        reason: "not_due" as const,
        rescheduleMs: dueAt - now,
      };
    }
    return {
      needsSettle: true as const,
      gameId: pg.gameId,
      uid: pg.uid,
      gameType: pg.gameType,
    };
  },
});
