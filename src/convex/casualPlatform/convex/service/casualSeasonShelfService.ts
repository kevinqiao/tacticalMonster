import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  FIXED_CHEST_TABLES,
  SEASON_CHALLENGE_MATCHES,
  SEASON_SHELF_SKUS,
} from "../data/casualSeasonShelfCatalog";
import { applyScaledCurrencyCost, applyVoucherCost } from "../data/casualTournamentConfigs";
import { mutation, query } from "../_generated/server";

/** 赛季货架 SKU 列表（静态配表） */
export const listSeasonShelf = query({
  args: {},
  handler: async () => SEASON_SHELF_SKUS,
});

/** `season_challenge` 锦标行摘要（与 `casual_tournaments` / 静态 defs 对齐） */
export const listSeasonChallengeMatches = query({
  args: {},
  handler: async () => SEASON_CHALLENGE_MATCHES,
});

export const redeemSeasonShelfSku = mutation({
  args: { uid: v.string(), skuId: v.string() },
  handler: async (ctx, { uid, skuId }) => {
    const sku = SEASON_SHELF_SKUS.find((s) => s.skuId === skuId);
    if (!sku) return { ok: false as const, error: "unknown_sku" };

    const player = await ctx.runQuery(internal.dao.casualPlayerDao.findByUid, { uid });
    if (!player) return { ok: false as const, error: "no_player" };

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
        internal.service.casualActivityService.resolveSeasonActivityModifiers,
        { skuId }
      );
      activityIds = modifiers.activityIds;
      const effectiveCost = applyVoucherCost(
        sku.voucherCost,
        modifiers.voucherCostMultiplier,
        modifiers.voucherCostDelta
      );
      const vouchers = player.seasonVouchers ?? 0;
      if (vouchers < effectiveCost) {
        return { ok: false as const, error: "insufficient_vouchers" };
      }
      vouchersCharged = effectiveCost;
      await ctx.runMutation(internal.dao.casualPlayerDao.patchByUid, {
        uid,
        seasonVouchers: vouchers - effectiveCost,
      });
    } else if (sku.paymentMode === "challenge_points_only") {
      const cost = sku.challengePointsCost;
      const pts = player.seasonChallengePoints ?? 0;
      if (pts < cost) {
        return { ok: false as const, error: "insufficient_challenge_points" };
      }
      challengePointsCharged = cost;
      await ctx.runMutation(internal.dao.casualPlayerDao.patchByUid, {
        uid,
        seasonChallengePoints: pts - cost,
      });
    } else {
      const modifiers = await ctx.runQuery(
        internal.service.casualActivityService.resolveSeasonActivityModifiers,
        { skuId }
      );
      activityIds = modifiers.activityIds;
      const effectiveGems = applyScaledCurrencyCost(
        sku.priceGems,
        modifiers.gemsCostMultiplier,
        modifiers.gemsCostDelta
      );
      const pts = player.seasonChallengePoints ?? 0;
      if (pts < sku.unlockPointsRequired) {
        return { ok: false as const, error: "insufficient_unlock_points" };
      }
      const gems = player.gems ?? 0;
      if (gems < effectiveGems) {
        return { ok: false as const, error: "insufficient_gems" };
      }
      gemsCharged = effectiveGems;
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
      const table = FIXED_CHEST_TABLES[sku.chestId];
      if (table) {
        for (const g of table) {
          await ctx.runMutation(internal.service.casualRewardRegistry.grantCasualReward, {
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
