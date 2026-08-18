import { v } from "convex/values";

import { authedMutation } from "../../custom/session";
import { PORTAL_AD_COIN_CHANNELS } from "../../data/portalAdCoinConfig";
import {
  beginPortalAdCoinSessionCore,
  completePortalAdCoinSessionCore,
} from "./portalAdCoinService";

export const beginAdCoinSession = authedMutation({
  args: {
    channel: v.union(...PORTAL_AD_COIN_CHANNELS.map((c) => v.literal(c))),
    lobbyId: v.optional(v.id("portal_lobbies")),
    scopeKey: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    beginPortalAdCoinSessionCore(ctx, {
      uid: ctx.uid,
      channel: args.channel,
      lobbyId: args.lobbyId ?? null,
      scopeKey: args.scopeKey ?? null,
    }),
});

export const completeAdCoinSession = authedMutation({
  args: {
    sessionId: v.string(),
    clientProof: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
    scopeKey: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    completePortalAdCoinSessionCore(ctx, {
      uid: ctx.uid,
      sessionId: args.sessionId,
      clientProof: args.clientProof,
      lobbyId: args.lobbyId ?? null,
      scopeKey: args.scopeKey ?? null,
    }),
});
