import { internal } from "../../_generated/api";
import { authedAction } from "../../custom/session";

/** Bootstrap portal player from platform JWT (setAuth only — no token args). */
export const authenticate = authedAction({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.service.player.playerManager.ensurePlayer, {
      uid: ctx.uid,
    });
    return { uid: ctx.uid };
  },
});
