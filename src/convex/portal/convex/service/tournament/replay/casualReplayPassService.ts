import { v } from "convex/values";
import { authedMutation, authedQuery } from "../../../custom/session";
import { readPortalTicketBalance } from "./casualReplayTokens";
import {
  startCasualRunReplayWithTicket,
  type StartCasualRunReplayResult,
} from "./casualRunReplay";

export const countUnusedReplayTokensForUid = authedQuery({
  args: {},
  handler: async (ctx) => {
    const n = await readPortalTicketBalance(ctx, ctx.uid);
    return { count: n };
  },
});

/** Authorize a Portal replay by spending one ticket. */
export const startCasualRunReplay = authedMutation({
  args: { matchGameId: v.string() },
  handler: async (ctx, args): Promise<StartCasualRunReplayResult> => {
    return await startCasualRunReplayWithTicket(ctx, { uid: ctx.uid, ...args });
  },
});
