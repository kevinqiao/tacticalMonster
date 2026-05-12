import { v } from "convex/values";
import { internal } from "../../_generated/api";
import {
  resolveFixedChestTable,
  seasonShelfSkusForSeasonId,
  SEASON_CHALLENGE_MATCHES,
} from "../../data/casualSeasonShelfCatalog";
import { applyScaledCurrencyCost, applyVoucherCost } from "../../data/casualTournamentConfigs";
import { mutation, query, type QueryCtx } from "../../_generated/server";

async function activeSeasonIdForShelf(ctx: Pick<QueryCtx, "db">): Promise<string> {
  const seasons = await ctx.db.query("casual_seasons").collect();
  const active = seasons.find((s) => s.active);
  return active?.seasonId ?? seasons[0]?.seasonId ?? "casual_s1";
}

/** 赛季货架 SKU：按当前激活赛季的 `casual_s{n}` 映射 skuId / chestId（奖池未单独配季时回退 S1 表） */
export const listSeasonShelf = query({
  args: {},
  handler: async (ctx) => {
    const seasonId = await activeSeasonIdForShelf(ctx);
    return seasonShelfSkusForSeasonId(seasonId);
  },
});

/** `season_challenge` 锦标行摘要（与 `casual_tournaments` / 静态 defs 对齐） */
export const listSeasonChallengeMatches = query({
  args: {},
  handler: async () => SEASON_CHALLENGE_MATCHES,
});

export const redeemSeasonShelfSku = mutation({
  args: { uid: v.string(), skuId: v.string() },
  handler: async (ctx, { uid, skuId }) => {
    const seasonId = await activeSeasonIdForShelf(ctx);
    const shelfRows = seasonShelfSkusForSeasonId(seasonId);
    const sku = shelfRows.find((s) => s.skuId === skuId);
    if (!sku) return { ok: false as const, error: "unknown_sku" };

    const player = await ctx.runQuery(internal.dao.casualPlayerDao.findByUid, { uid });
    if (!player) return { ok: false as const, error: "no_player" };

    const passRow = await ctx.db
      .query("casual_pass_progress")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", seasonId))
      .unique();

    const dup = await ctx.db
      .query("casual_season_shelf_redemptions")
      .withIndex("by_uid_sku", (q) => q.eq("uid", uid).eq("skuId", skuId))
      .unique();
    if (dup) {
      return { ok: false as const, error: "already_redeemed" };
    }

    let activityIds: string[] | undefined;
    let vouchersCharged: number | undefined;
    let challengePointsCharged: number | undefined;
    let gemsCharged: number | undefined;

    if (sku.paymentMode === "voucher_only") {
      const modifiers = await ctx.runQuery(
        internal.service.activity.casualActivityService.resolveSeasonActivityModifiers,
        { skuId }
      );
      activityIds = modifiers.activityIds;
      const effectiveCost = applyVoucherCost(
        sku.voucherCost,
        modifiers.voucherCostMultiplier,
        modifiers.voucherCostDelta
      );
      const vouchers = passRow?.seasonVouchers ?? 0;
      if (vouchers < effectiveCost) {
        return { ok: false as const, error: "insufficient_vouchers" };
      }
      vouchersCharged = effectiveCost;
      const paid = await ctx.runMutation(
        internal.service.season.casualSeasonService.applySeasonWalletBalanceDelta,
        { uid, deltaVouchers: -effectiveCost }
      );
      if (!paid.ok) {
        return {
          ok: false as const,
          error:
            paid.error === "insufficient_vouchers"
              ? "insufficient_vouchers"
              : paid.error === "no_season"
                ? "no_active_season"
                : "redeem_failed",
        };
      }
    } else if (sku.paymentMode === "challenge_points_only") {
      const cost = sku.challengePointsCost;
      const pts = passRow?.seasonChallengePoints ?? 0;
      if (pts < cost) {
        return { ok: false as const, error: "insufficient_challenge_points" };
      }
      challengePointsCharged = cost;
      const paid = await ctx.runMutation(
        internal.service.season.casualSeasonService.applySeasonWalletBalanceDelta,
        { uid, deltaChallengePoints: -cost }
      );
      if (!paid.ok) {
        return {
          ok: false as const,
          error:
            paid.error === "insufficient_challenge_points"
              ? "insufficient_challenge_points"
              : paid.error === "no_season"
                ? "no_active_season"
                : "redeem_failed",
        };
      }
    } else {
      const modifiers = await ctx.runQuery(
        internal.service.activity.casualActivityService.resolveSeasonActivityModifiers,
        { skuId }
      );
      activityIds = modifiers.activityIds;
      const effectiveGems = applyScaledCurrencyCost(
        sku.priceGems,
        modifiers.gemsCostMultiplier,
        modifiers.gemsCostDelta
      );
      const pts = passRow?.seasonChallengePoints ?? 0;
      if (pts < sku.unlockPointsRequired) {
        return { ok: false as const, error: "insufficient_unlock_points" };
      }
      const gems = player.gems ?? 0;
      if (gems < effectiveGems) {
        return { ok: false as const, error: "insufficient_gems" };
      }
      gemsCharged = effectiveGems;
      const unlockPaid = await ctx.runMutation(
        internal.service.season.casualSeasonService.applySeasonWalletBalanceDelta,
        { uid, deltaChallengePoints: -sku.unlockPointsRequired }
      );
      if (!unlockPaid.ok) {
        return {
          ok: false as const,
          error:
            unlockPaid.error === "insufficient_challenge_points"
              ? "insufficient_unlock_points"
              : unlockPaid.error === "no_season"
                ? "no_active_season"
                : "redeem_failed",
        };
      }
      await ctx.runMutation(internal.dao.casualPlayerDao.patchByUid, {
        uid,
        gems: gems - effectiveGems,
      });
    }

    await ctx.db.insert("casual_season_shelf_redemptions", {
      uid,
      skuId,
      redeemedAt: Date.now(),
    });

    if (sku.chestId) {
      const table = resolveFixedChestTable(sku.chestId);
      if (table) {
        for (const g of table) {
          await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
            uid,
            kind: g.kind === "seasonVoucher" ? "seasonVoucher" : g.kind,
            amount: g.amount,
          });
        }
      }
    }

    return {
      ok: true as const,
      chestId: sku.chestId,
      activityIds,
      vouchersCharged,
      challengePointsCharged,
      gemsCharged,
    };
  },
});
