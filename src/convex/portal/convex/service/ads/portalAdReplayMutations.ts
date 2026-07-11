import { v } from "convex/values";

import { authedMutation } from "../../custom/session";
import { PORTAL_AD_REPLAY_CHANNELS } from "../../data/portalAdReplayConfig";
import {
  beginPortalAdReplaySessionCore,
  completePortalAdReplaySessionCore,
} from "./portalAdReplayService";

export const beginAdReplaySession = authedMutation({
  args: {
    matchGameId: v.string(),
    channel: v.union(...PORTAL_AD_REPLAY_CHANNELS.map((c) => v.literal(c))),
  },
  handler: async (ctx, args) => beginPortalAdReplaySessionCore(ctx, { uid: ctx.uid, ...args }),
});

export const completeAdReplaySession = authedMutation({
  args: {
    sessionId: v.string(),
    clientProof: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    completePortalAdReplaySessionCore(ctx, { uid: ctx.uid, ...args }),
});
