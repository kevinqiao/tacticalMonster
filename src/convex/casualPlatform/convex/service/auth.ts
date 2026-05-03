"use node";
import { v } from "convex/values";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";

function generateRandomString(length: number): string {
  return crypto.randomBytes(length).toString("hex").substring(0, length);
}

/** 与 TM / tournament 签发一致；须在 Convex Dashboard 配置 `JWT_ACCESS_SECRET`，禁止硬编码 */
function getJwtSecret(): string | null {
  const s = process.env.JWT_ACCESS_SECRET;
  return s && s.length > 0 ? s : null;
}

export const authenticate = action({
  args: { uid: v.string(), token: v.string() },
  handler: async (ctx, { uid, token }) => {
    const secret = getJwtSecret();
    if (!secret) {
      console.error("[casualPlatform] JWT_ACCESS_SECRET is not set");
      return null;
    }
    try {
      const payload = jwt.verify(token, secret);
      if (
        payload &&
        typeof payload === "object" &&
        "uid" in payload &&
        String((payload as { uid: unknown }).uid) === uid
      ) {
        const sessionToken = generateRandomString(36);
        await ctx.runMutation(internal.service.casualTournamentService.seedDemoTournaments, {});
        const player: unknown = await ctx.runMutation(
          internal.service.playerManager.authenticate,
          { uid, token: sessionToken }
        );
        if (player && typeof player === "object") {
          const p = player as Record<string, unknown>;
          return {
            uid: p.uid,
            coins: p.coins,
            gems: p.gems,
            stamina: p.stamina,
            seasonXp: p.seasonXp,
          };
        }
      }
    } catch (e) {
      console.error("[casualPlatform] authenticate", e);
    }
    return null;
  },
});
