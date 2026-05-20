import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import { resolveSeasonPassSkinId } from "../../data/casualSkinCatalog.js";

/**
 * 休闲奖励分发：`coins`/`gems` 写入 `casual_players`；
 * `seasonXp`/赛季券写入当前激活赛季的 `casual_pass_progress`；
 * `skin` 写入 `casual_player_skins`。
 */
type GrantCasualRewardResult =
  | { ok: true }
  | { ok: false; error: "no_player" | "no_active_season" | "claim_failed" | "unknown_skin" };

type SeasonWalletDeltaMutationResult =
  | { ok: true }
  | { ok: false; error: "no_season" | "insufficient_vouchers" };

export const grantCasualReward = internalMutation({
  args: {
    uid: v.string(),
    kind: v.union(
      v.literal("coins"),
      v.literal("gems"),
      v.literal("seasonXp"),
      v.literal("seasonVoucher"),
      v.literal("skin")
    ),
    amount: v.number(),
    skinId: v.optional(v.string()),
    skinToken: v.optional(v.string()),
    seasonId: v.optional(v.string()),
    source: v.optional(
      v.union(
        v.literal("pass"),
        v.literal("shop"),
        v.literal("achievement"),
        v.literal("season_auto")
      )
    ),
  },
  handler: async (
    ctx,
    { uid, kind, amount, skinId, skinToken, seasonId, source }
  ): Promise<GrantCasualRewardResult> => {
    if (kind === "skin") {
      let resolvedId = skinId?.trim();
      if (!resolvedId && skinToken && seasonId) {
        resolvedId =
          resolveSeasonPassSkinId(
            seasonId,
            skinToken as Parameters<typeof resolveSeasonPassSkinId>[1]
          ) ?? undefined;
      }
      if (!resolvedId) return { ok: false as const, error: "unknown_skin" };
      const gr = await ctx.runMutation(internal.service.skin.casualSkinService.grantSkin, {
        uid,
        skinId: resolvedId,
        source: source ?? "pass",
        seasonId,
      });
      return gr.ok ? { ok: true as const } : { ok: false as const, error: "unknown_skin" };
    }

    const row = await ctx.runQuery(internal.dao.casualPlayerDao.findByUid, { uid });
    if (!row) return { ok: false as const, error: "no_player" };
    const delta = Math.max(0, Math.floor(amount));
    if (delta === 0) return { ok: true as const };

    if (kind === "seasonXp") {
      await ctx.runMutation(internal.service.season.casualSeasonService.addPassXpFromRun, {
        uid,
        deltaXp: delta,
      });
      return { ok: true as const };
    }
    if (kind === "seasonVoucher") {
      const r = (await ctx.runMutation(
        internal.service.season.casualSeasonService.applySeasonWalletBalanceDelta,
        { uid, deltaVouchers: delta }
      )) as SeasonWalletDeltaMutationResult;
      return r.ok
        ? { ok: true as const }
        : {
            ok: false as const,
            error: r.error === "no_season" ? ("no_active_season" as const) : ("claim_failed" as const),
          };
    }
    const patch: Record<string, number> = {};
    if (kind === "coins") patch.coins = (row.coins ?? 0) + delta;
    if (kind === "gems") patch.gems = (row.gems ?? 0) + delta;
    await ctx.db.patch(row._id, { ...patch, updatedAt: Date.now() });
    return { ok: true as const };
  },
});
