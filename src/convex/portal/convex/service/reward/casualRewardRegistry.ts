import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";

type GrantPortalRewardResult =
  | { ok: true }
  | { ok: false; error: "no_player" | "invalid_amount" };

/** Portal 金币/钻/门票发放（写入 `portal_players` + `portal_coin_ledger`）。 */
export const grantCasualReward = internalMutation({
  args: {
    uid: v.string(),
    kind: v.union(
      v.literal("coins"),
      v.literal("gems"),
      v.literal("tickets"),
      v.literal("seasonVoucher")
    ),
    amount: v.number(),
    reason: v.optional(v.string()),
    gameType: v.optional(v.string()),
    sourceWeekKey: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { uid, kind, amount, reason, gameType, sourceWeekKey }
  ): Promise<GrantPortalRewardResult> => {
    if (kind === "seasonVoucher") {
      return { ok: true as const };
    }
    const row = await ctx.runQuery(internal.dao.portalPlayerDao.findByUid, { uid });
    if (!row) return { ok: false as const, error: "no_player" };
    const delta = Math.max(0, Math.floor(amount));
    if (delta === 0) return { ok: true as const };

    const now = Date.now();
    let balanceAfter = 0;
    const patch: { coins?: number; gems?: number; tickets?: number; updatedAt: number } = {
      updatedAt: now,
    };
    if (kind === "coins") {
      balanceAfter = (row.coins ?? 0) + delta;
      patch.coins = balanceAfter;
    } else if (kind === "gems") {
      balanceAfter = (row.gems ?? 0) + delta;
      patch.gems = balanceAfter;
    } else {
      balanceAfter = (row.tickets ?? 0) + delta;
      patch.tickets = balanceAfter;
    }
    await ctx.db.patch(row._id, patch);
    await ctx.db.insert("portal_coin_ledger", {
      uid,
      kind,
      delta,
      balanceAfter,
      reason: reason ?? kind,
      gameType,
      sourceWeekKey,
      createdAt: now,
    });
    return { ok: true as const };
  },
});

/** Named ticket grant entry point for Portal shop and operational tooling. */
export const grantPortalTickets = internalMutation({
  args: {
    uid: v.string(),
    amount: v.number(),
    reason: v.optional(v.string()),
    gameType: v.optional(v.string()),
  },
  handler: async (ctx, { uid, amount, reason, gameType }): Promise<GrantPortalRewardResult> => {
    const row = await ctx.runQuery(internal.dao.portalPlayerDao.findByUid, { uid });
    if (!row) return { ok: false as const, error: "no_player" };
    const delta = Math.max(0, Math.floor(amount));
    if (delta === 0) return { ok: true as const };

    const now = Date.now();
    const balanceAfter = Math.max(0, Math.floor(row.tickets ?? 0)) + delta;
    await ctx.db.patch(row._id, { tickets: balanceAfter, updatedAt: now });
    await ctx.db.insert("portal_coin_ledger", {
      uid,
      kind: "tickets",
      delta,
      balanceAfter,
      reason: reason ?? "tickets",
      gameType,
      createdAt: now,
    });
    return { ok: true as const };
  },
});

type SpendPortalCoinsResult =
  | { ok: true; balanceAfter: number }
  | { ok: false; error: "no_player" | "insufficient_coins" };

export const spendPortalCoins = internalMutation({
  args: {
    uid: v.string(),
    amount: v.number(),
    reason: v.optional(v.string()),
    gameType: v.optional(v.string()),
  },
  handler: async (ctx, { uid, amount, reason, gameType }): Promise<SpendPortalCoinsResult> => {
    const row = await ctx.runQuery(internal.dao.portalPlayerDao.findByUid, { uid });
    if (!row) return { ok: false as const, error: "no_player" };
    const cost = Math.max(0, Math.floor(amount));
    const cur = row.coins ?? 0;
    if (cost > cur) return { ok: false as const, error: "insufficient_coins" };
    if (cost === 0) return { ok: true as const, balanceAfter: cur };

    const now = Date.now();
    const balanceAfter = cur - cost;
    await ctx.db.patch(row._id, { coins: balanceAfter, updatedAt: now });
    await ctx.db.insert("portal_coin_ledger", {
      uid,
      kind: "coins",
      delta: -cost,
      balanceAfter,
      reason: reason ?? "spend",
      gameType,
      createdAt: now,
    });
    return { ok: true as const, balanceAfter };
  },
});

type RefundPortalCoinsResult =
  | { ok: true; balanceAfter: number }
  | { ok: false; error: "no_player" | "invalid_amount" };

export const refundPortalCoins = internalMutation({
  args: {
    uid: v.string(),
    amount: v.number(),
    reason: v.optional(v.string()),
    gameType: v.optional(v.string()),
  },
  handler: async (ctx, { uid, amount, reason, gameType }): Promise<RefundPortalCoinsResult> => {
    const row = await ctx.runQuery(internal.dao.portalPlayerDao.findByUid, { uid });
    if (!row) return { ok: false as const, error: "no_player" };
    const refund = Math.max(0, Math.floor(amount));
    if (refund === 0) return { ok: true as const, balanceAfter: row.coins ?? 0 };

    const now = Date.now();
    const balanceAfter = (row.coins ?? 0) + refund;
    await ctx.db.patch(row._id, { coins: balanceAfter, updatedAt: now });
    await ctx.db.insert("portal_coin_ledger", {
      uid,
      kind: "coins",
      delta: refund,
      balanceAfter,
      reason: reason ?? "refund",
      gameType,
      createdAt: now,
    });
    return { ok: true as const, balanceAfter };
  },
});

type SpendPortalTicketsResult =
  | { ok: true; balanceAfter: number }
  | { ok: false; error: "no_player" | "insufficient_tickets" };

/** Deduct replay tickets atomically and record the currency ledger entry. */
export const spendPortalTickets = internalMutation({
  args: {
    uid: v.string(),
    amount: v.number(),
    reason: v.optional(v.string()),
    gameType: v.optional(v.string()),
  },
  handler: async (ctx, { uid, amount, reason, gameType }): Promise<SpendPortalTicketsResult> => {
    const row = await ctx.runQuery(internal.dao.portalPlayerDao.findByUid, { uid });
    if (!row) return { ok: false as const, error: "no_player" };
    const cost = Math.max(0, Math.floor(amount));
    const balance = Math.max(0, Math.floor(row.tickets ?? 0));
    if (cost > balance) return { ok: false as const, error: "insufficient_tickets" };
    if (cost === 0) return { ok: true as const, balanceAfter: balance };

    const now = Date.now();
    const balanceAfter = balance - cost;
    await ctx.db.patch(row._id, { tickets: balanceAfter, updatedAt: now });
    await ctx.db.insert("portal_coin_ledger", {
      uid,
      kind: "tickets",
      delta: -cost,
      balanceAfter,
      reason: reason ?? "ticket_replay",
      gameType,
      createdAt: now,
    });
    return { ok: true as const, balanceAfter };
  },
});
