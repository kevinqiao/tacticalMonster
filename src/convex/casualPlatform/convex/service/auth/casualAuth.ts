import { internal } from "../../_generated/api";
import { authedAction } from "../../custom/session";

export const authenticate = authedAction({
  args: {},
  handler: async (ctx) => {
    const player = await ctx.runMutation(internal.service.player.playerManager.ensurePlayer, {
      uid: ctx.uid,
    });
    if (!player || typeof player !== "object") return null;

    await ctx.runMutation(internal.service.task.casualTaskService.recordDailyLogin, {
      uid: ctx.uid,
    });
    const snap: { seasonXp: number; seasonVouchers: number } = await ctx.runQuery(
      internal.service.season.casualSeasonService.seasonEconomySnapshotForAuth,
      { uid: ctx.uid }
    );
    const activeSeason: { seasonId: string } | null = await ctx.runQuery(
      internal.service.season.casualSeasonService.activeSeasonIdForAuth,
      {}
    );
    if (activeSeason?.seasonId) {
      await ctx.runMutation(internal.service.skin.casualSkinService.ensureDefaultSkinsForPlayer, {
        uid: ctx.uid,
        seasonId: activeSeason.seasonId,
      });
    }
    const p = player as Record<string, unknown>;
    return {
      uid: ctx.uid,
      coins: p.coins,
      gems: p.gems,
      seasonXp: snap.seasonXp,
      seasonVouchers: snap.seasonVouchers,
    };
  },
});
