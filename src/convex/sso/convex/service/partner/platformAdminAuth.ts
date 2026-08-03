"use node";

import { v } from "convex/values";

import { action } from "../../_generated/server";
import { signInWebAccountHandler } from "../auth/webConsoleAuth";

/** @deprecated Use signInWebAccount with staffGate=platform */
export const signInPlatformAdmin = action({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { username, password }) =>
    signInWebAccountHandler(ctx, {
      accountId: username,
      password,
      staffGate: "platform",
    }),
});
