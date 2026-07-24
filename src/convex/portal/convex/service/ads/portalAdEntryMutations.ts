import { v } from "convex/values";

import { authedMutation } from "../../custom/session";
import { PORTAL_AD_ENTRY_CHANNELS } from "../../data/portalAdEntryConfig";
import {
  beginPortalAdEntrySessionCore,
  completePortalAdEntrySessionCore,
} from "./portalAdEntryService";

export const beginAdEntrySession = authedMutation({
  args: {
    mode: v.union(v.literal("solo"), v.literal("multi")),
    templateId: v.string(),
    channel: v.union(...PORTAL_AD_ENTRY_CHANNELS.map((c) => v.literal(c))),
  },
  handler: async (ctx, args) =>
    beginPortalAdEntrySessionCore(ctx, { uid: ctx.uid, ...args }),
});

export const completeAdEntrySession = authedMutation({
  args: {
    sessionId: v.string(),
    clientProof: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    completePortalAdEntrySessionCore(ctx, { uid: ctx.uid, ...args }),
});
