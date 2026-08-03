"use node";
import { v } from "convex/values";
import crypto from "crypto";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { authedAction } from "../custom/session";
import { verifyPlatformAccessToken } from "../../../shared/platformAuth/platformJwtVerify";

function generateRandomString(length: number): string {
  return crypto.randomBytes(length).toString("hex").substring(0, length);
}

export const verifyPlatformToken = internalAction({
  args: { token: v.string() },
  handler: async (_ctx, { token }) => {
    return verifyPlatformAccessToken(token);
  },
});

/** Legacy Telegram / payment bridge — verifies platform JWT from SSO. */
export const signin = internalAction({
  args: { access_token: v.string(), expire: v.number() },
  handler: async (ctx, { access_token, expire }) => {
    const uid = verifyPlatformAccessToken(access_token);
    if (!uid) return null;
    try {
      const player: unknown = await ctx.runMutation(internal.service.playerManager.ensurePlayer, {
        uid,
      });
      if (player && typeof player === "object") {
        const p = player as Record<string, unknown>;
        return { ...p, expire: Date.now() + expire, _id: undefined, _creationTime: undefined };
      }
    } catch (error) {
      console.error("signin error", error);
    }
    return null;
  },
});

export const authenticate = authedAction({
  args: {},
  handler: async (ctx) => {
    const player: unknown = await ctx.runMutation(internal.service.playerManager.ensurePlayer, {
      uid: ctx.uid,
    });
    if (player && typeof player === "object") {
      const p = player as Record<string, unknown>;
      return { ...p, _id: undefined, _creationTime: undefined };
    }
    return null;
  },
});
