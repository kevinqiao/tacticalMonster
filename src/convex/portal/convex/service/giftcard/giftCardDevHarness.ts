import { v } from "convex/values";

import { api, internal } from "../../_generated/api";
import { internalAction, internalMutation, internalQuery, mutation } from "../../_generated/server";
import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const getGiftCardSkuForDev = internalQuery({
  args: { skuId: v.string() },
  handler: async (ctx, { skuId }) => {
    return await ctx.db
      .query("portal_shop_skus")
      .withIndex("by_skuId", (q) => q.eq("skuId", skuId))
      .unique();
  },
});

/** Dev/integration smoke: coin spend → refund on failed giftcard order. */
export const runGiftCardRefundSmokeTest = internalMutation({
  args: {},
  handler: async (ctx) => {
    const uid = `smoke_gc_refund_${Date.now()}`;
    const now = Date.now();
    const orderId = `gc_${uid}_${now}_gc_amazon_5_us`;

    const playerId = await ctx.db.insert("portal_players", {
      uid,
      coins: 1000,
      createdAt: now - 10 * MS_PER_DAY,
      updatedAt: now,
      verifiedEmail: "smoke@test.local",
      redemptionRegion: "US",
      redemptionRegionLockedAt: now - MS_PER_DAY,
    });

    const spend = await ctx.runMutation(internal.service.reward.casualRewardRegistry.spendPortalCoins, {
      uid,
      amount: 750,
      reason: "smoke_test",
    });
    if (!spend.ok) {
      return { ok: false as const, step: "spend", error: spend.error };
    }

    await ctx.db.insert("portal_giftcard_orders", {
      orderId,
      uid,
      skuId: "gc_amazon_5_us",
      region: "US",
      priceCoins: 750,
      faceValueUsd: 5,
      faceValueLocal: 5,
      faceValueCurrency: "USD",
      tangoUtid: "U163059",
      status: "pending",
      deliveryEmail: "smoke@test.local",
      attemptCount: 0,
      createdAt: now,
    });

    const refundResult = await ctx.runMutation(
      internal.service.giftcard.giftCardOrderDao.failOrderAndRefund,
      { orderId, reason: "smoke_test_refund" }
    );
    if (!refundResult.ok) {
      return { ok: false as const, step: "refund", error: refundResult.error };
    }

    const order = await ctx.db
      .query("portal_giftcard_orders")
      .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
      .unique();
    const player = await ctx.db.get(playerId);
    const ledger = await ctx.db
      .query("portal_coin_ledger")
      .withIndex("by_uid_created", (q) => q.eq("uid", uid))
      .order("desc")
      .take(3);

    const ok =
      order?.status === "refunded" &&
      player?.coins === 1000 &&
      ledger.some((l) => l.reason === `giftcard_refund:${orderId}` && l.delta === 750);

    return {
      ok: ok as boolean,
      uid,
      orderId,
      finalCoins: player?.coins,
      orderStatus: order?.status,
      ledgerReasons: ledger.map((l) => l.reason),
    };
  },
});

/** Dev/integration smoke: mock Tango fulfillment end-to-end. */
export const runGiftCardFulfillmentSmokeTest = internalAction({
  args: {},
  handler: async (ctx) => {
    const setup = await ctx.runMutation(
      internal.service.giftcard.giftCardDevHarness.setupGiftCardFulfillmentSmoke,
      {}
    );
    if (!setup.ok) return setup;

    const fulfill = await ctx.runAction(
      internal.service.giftcard.giftCardFulfillmentAction.fulfillTangoGiftCardOrder,
      { orderId: setup.orderId }
    );

    const order = await ctx.runQuery(internal.service.giftcard.giftCardOrderDao.getOrderByOrderId, {
      orderId: setup.orderId,
    });

    const ok =
      fulfill.ok === true &&
      order?.status === "fulfilled" &&
      Boolean(order.rewardLink) &&
      order.rewardLink!.includes(setup.orderId);

    return {
      ok,
      orderId: setup.orderId,
      fulfill,
      orderStatus: order?.status,
      hasRewardLink: Boolean(order?.rewardLink),
    };
  },
});

export const setupGiftCardFulfillmentSmoke = internalMutation({
  args: {},
  handler: async (ctx) => {
    const uid = `smoke_gc_fulfill_${Date.now()}`;
    const now = Date.now();
    const orderId = `gc_${uid}_${now}_gc_amazon_5_us`;

    await ctx.db.insert("portal_players", {
      uid,
      coins: 250,
      createdAt: now - 10 * MS_PER_DAY,
      updatedAt: now,
      verifiedEmail: "smoke-fulfill@test.local",
      redemptionRegion: "US",
      redemptionRegionLockedAt: now - MS_PER_DAY,
    });

    await ctx.db.insert("portal_giftcard_orders", {
      orderId,
      uid,
      skuId: "gc_amazon_5_us",
      region: "US",
      priceCoins: 750,
      faceValueUsd: 5,
      faceValueLocal: 5,
      faceValueCurrency: "USD",
      tangoUtid: "U163059",
      status: "pending",
      deliveryEmail: "smoke-fulfill@test.local",
      attemptCount: 0,
      createdAt: now,
    });

    return { ok: true as const, orderId, uid };
  },
});

/** 开发用：为指定 uid 购买礼品卡 SKU（绕过 authed purchase）。 */
export const devPurchaseGiftCardForUid = mutation({
  args: {
    uid: v.string(),
    skuId: v.string(),
  },
  handler: async (ctx, { uid, skuId }) => {
    await ctx.runMutation(internal.service.shop.portalShopService.syncPortalShopCatalog, {});

    const row = await ctx.db
      .query("portal_shop_skus")
      .withIndex("by_skuId", (q) => q.eq("skuId", skuId))
      .unique();
    if (!row?.active || row.skuKind !== "giftcard") {
      return { ok: false as const, error: "sku_not_found" as const };
    }
    if (!row.tangoUtid || row.faceValueLocal == null || !row.faceValueCurrency || !row.region) {
      return { ok: false as const, error: "sku_not_configured" as const };
    }

    const spend = await ctx.runMutation(internal.service.reward.casualRewardRegistry.spendPortalCoins, {
      uid,
      amount: row.priceCoins,
      reason: `giftcard:${skuId}`,
    });
    if (!spend.ok) {
      return { ok: false as const, error: spend.error };
    }

    const player = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();

    const now = Date.now();
    const orderId = `gc_${uid}_${now}_${skuId}`;
    await ctx.db.insert("portal_giftcard_orders", {
      orderId,
      uid,
      skuId,
      region: row.region,
      priceCoins: row.priceCoins,
      faceValueUsd: row.faceValueUsd ?? row.faceValueLocal,
      faceValueLocal: row.faceValueLocal,
      faceValueCurrency: row.faceValueCurrency,
      tangoUtid: row.tangoUtid,
      status: "pending",
      deliveryEmail: player?.verifiedEmail,
      attemptCount: 0,
      createdAt: now,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.service.giftcard.giftCardFulfillmentAction.fulfillTangoGiftCardOrder,
      { orderId }
    );

    return {
      ok: true as const,
      orderId,
      spentCoins: row.priceCoins,
      balanceAfter: spend.balanceAfter,
    };
  },
});

/**
 * 联赛结算 → 领奖 → 礼品卡兑换 全链路 E2E（dev 部署 + TANGO_MOCK_FULFILL=true）。
 * 从 ensure 玩家、快进周尾、领奖、购买到履约一气呵成。
 */
export const runLeagueToGiftCardE2eTest = internalAction({
  args: {
    gameType: v.optional(v.string()),
    weeklyPoints: v.optional(v.number()),
    skuId: v.optional(v.string()),
    uid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const gameType = args.gameType ?? "solitaire";
    const skuId = args.skuId ?? "gc_amazon_5_us";
    const weeklyPoints = args.weeklyPoints ?? 5000;

    const setup = await ctx.runMutation(
      api.service.weeklyLeague.portalWeeklyLeagueDev.devSetupLeagueGiftCardPlayer,
      {
        ...(args.uid ? { uid: args.uid } : {}),
        gameType,
      }
    );
    if (!setup.ok) return { ok: false as const, step: "setup", setup };

    await ctx.runMutation(internal.service.shop.portalShopService.syncPortalShopCatalog, {});

    const close = await ctx.runMutation(
      api.service.weeklyLeague.portalWeeklyLeagueDev.devSimulatePortalWeekCloseForUid,
      { uid: setup.uid, gameType, weeklyPoints }
    );
    if (!close.ok) {
      return { ok: false as const, step: "week_close", setup, close };
    }

    const claim = await ctx.runMutation(
      api.service.weeklyLeague.portalWeeklyLeagueDev.devClaimPortalWeeklyLeagueRewardsForUid,
      { uid: setup.uid, gameType, weekKey: close.weekKey }
    );
    if (!claim.ok) {
      return { ok: false as const, step: "claim", setup, close, claim };
    }

    const skuRow = await ctx.runQuery(internal.service.giftcard.giftCardDevHarness.getGiftCardSkuForDev, {
      skuId,
    });
    let topUpCoins = 0;
    const priceCoins = skuRow?.priceCoins ?? 750;
    if ((claim.coinsAfter ?? 0) < priceCoins) {
      topUpCoins = priceCoins - (claim.coinsAfter ?? 0);
      await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid: setup.uid,
        kind: "coins",
        amount: topUpCoins,
        reason: "e2e_league_giftcard_topup",
        gameType,
      });
    }

    const purchase = await ctx.runMutation(
      api.service.giftcard.giftCardDevHarness.devPurchaseGiftCardForUid,
      { uid: setup.uid, skuId }
    );
    if (!purchase.ok) {
      return {
        ok: false as const,
        step: "purchase",
        setup,
        close,
        claim,
        purchase,
      };
    }

    const fulfill = await ctx.runAction(
      internal.service.giftcard.giftCardFulfillmentAction.fulfillTangoGiftCardOrder,
      { orderId: purchase.orderId }
    );

    const order = await ctx.runQuery(internal.service.giftcard.giftCardOrderDao.getOrderByOrderId, {
      orderId: purchase.orderId,
    });
    const player = await ctx.runQuery(internal.dao.portalPlayerDao.findByUid, { uid: setup.uid });

    const ok =
      fulfill.ok === true &&
      order?.status === "fulfilled" &&
      Boolean(order.rewardLink) &&
      (claim.granted?.coins ?? 0) > 0;

    return {
      ok,
      uid: setup.uid,
      gameType,
      topUpCoins,
      steps: {
        setup,
        close: {
          weekKey: close.weekKey,
          finalRank: close.finalRank,
          outcome: close.outcome,
          pendingRewards: close.pendingRewards,
        },
        claim,
        purchase,
        fulfill,
      },
      order: order
        ? {
            orderId: order.orderId,
            status: order.status,
            hasRewardLink: Boolean(order.rewardLink),
          }
        : null,
      wallet: { coins: player?.coins ?? 0 },
    };
  },
});
