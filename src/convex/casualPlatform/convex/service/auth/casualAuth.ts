"use node";
import { v } from "convex/values";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { internal } from "../../_generated/api";
import { action } from "../../_generated/server";
import { jwtAccessSecret } from "./jwtAccessSecret";

function generateRandomString(length: number): string {
  return crypto.randomBytes(length).toString("hex").substring(0, length);
}

export const authenticate = action({
  args: { uid: v.string(), token: v.string() },
  handler: async (ctx, { uid, token }) => {
    const secret = jwtAccessSecret();
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
        const player: unknown = await ctx.runMutation(
          internal.service.player.playerManager.authenticate,
          { uid, token: sessionToken }
        );
        if (player && typeof player === "object") {
          const p = player as Record<string, unknown>;
          await ctx.runMutation(internal.service.task.casualTaskService.recordDailyLogin, {
            uid,
          });
          const snap: {
            seasonXp: number;
            seasonVouchers: number;
          } = await ctx.runQuery(internal.service.season.casualSeasonService.seasonEconomySnapshotForAuth, {
            uid,
          });
          const activeSeason: { seasonId: string } | null = await ctx.runQuery(
            internal.service.season.casualSeasonService.activeSeasonIdForAuth,
            {}
          );
          if (activeSeason?.seasonId) {
            await ctx.runMutation(internal.service.skin.casualSkinService.ensureDefaultSkinsForPlayer, {
              uid,
              seasonId: activeSeason.seasonId,
            });
          }
          return {
            uid: p.uid,
            coins: p.coins,
            gems: p.gems,
            seasonXp: snap.seasonXp,
            seasonVouchers: snap.seasonVouchers,
          };
        }
      }
    } catch (e) {
      console.error("[casualPlatform] authenticate", e);
    }
    return null;
  },
});
