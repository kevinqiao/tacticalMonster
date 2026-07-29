import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { applyWalletDelta, getPlayerWalletBalances } from "../economy/portalWalletDao";

type GrantPortalRewardResult =
  | { ok: true }
  | { ok: false; error: "no_player" | "invalid_amount" };

const scopeArgs = {
  scopeKey: v.optional(v.string()),
  lobbyId: v.optional(v.id("portal_lobbies")),
};

/** Portal 金币/钻/门票发放（写入 scoped wallet + ledger）。 */
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
    ...scopeArgs,
  },
  handler: async (
    ctx,
    { uid, kind, amount, reason, gameType, sourceWeekKey, scopeKey, lobbyId }
  ): Promise<GrantPortalRewardResult> => {
    if (kind === "seasonVoucher") {
      return { ok: true as const };
    }
    const delta = Math.max(0, Math.floor(amount));
    if (delta === 0) return { ok: true as const };
    const result = await applyWalletDelta(ctx, {
      uid,
      scopeKey: scopeKey ?? "shared",
      lobbyId: lobbyId ?? null,
      kind,
      delta,
      reason: reason ?? kind,
      gameType,
      sourceWeekKey,
    });
    if (!result.ok) {
      return { ok: false as const, error: result.error === "no_player" ? "no_player" : "invalid_amount" };
    }
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
    ...scopeArgs,
  },
  handler: async (ctx, { uid, amount, reason, gameType, scopeKey, lobbyId }): Promise<GrantPortalRewardResult> => {
    const delta = Math.max(0, Math.floor(amount));
    if (delta === 0) return { ok: true as const };
    const result = await applyWalletDelta(ctx, {
      uid,
      scopeKey: scopeKey ?? "shared",
      lobbyId: lobbyId ?? null,
      kind: "tickets",
      delta,
      reason: reason ?? "tickets",
      gameType,
    });
    if (!result.ok) {
      return { ok: false as const, error: result.error === "no_player" ? "no_player" : "invalid_amount" };
    }
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
    ...scopeArgs,
  },
  handler: async (ctx, { uid, amount, reason, gameType, scopeKey, lobbyId }): Promise<SpendPortalCoinsResult> => {
    const cost = Math.max(0, Math.floor(amount));
    const key = scopeKey ?? "shared";
    if (cost === 0) {
      const bal = await getPlayerWalletBalances(ctx, uid, key);
      return { ok: true as const, balanceAfter: bal.coins };
    }
    const result = await applyWalletDelta(ctx, {
      uid,
      scopeKey: key,
      lobbyId: lobbyId ?? null,
      kind: "coins",
      delta: -cost,
      reason: reason ?? "spend",
      gameType,
    });
    if (!result.ok) {
      return {
        ok: false as const,
        error: result.error === "no_player" ? "no_player" : "insufficient_coins",
      };
    }
    return { ok: true as const, balanceAfter: result.balanceAfter };
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
    ...scopeArgs,
  },
  handler: async (ctx, { uid, amount, reason, gameType, scopeKey, lobbyId }): Promise<RefundPortalCoinsResult> => {
    const refund = Math.max(0, Math.floor(amount));
    const key = scopeKey ?? "shared";
    if (refund === 0) {
      const bal = await getPlayerWalletBalances(ctx, uid, key);
      return { ok: true as const, balanceAfter: bal.coins };
    }
    const result = await applyWalletDelta(ctx, {
      uid,
      scopeKey: key,
      lobbyId: lobbyId ?? null,
      kind: "coins",
      delta: refund,
      reason: reason ?? "refund",
      gameType,
    });
    if (!result.ok) {
      return { ok: false as const, error: "no_player" };
    }
    return { ok: true as const, balanceAfter: result.balanceAfter };
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
    ...scopeArgs,
  },
  handler: async (ctx, { uid, amount, reason, gameType, scopeKey, lobbyId }): Promise<SpendPortalTicketsResult> => {
    const cost = Math.max(0, Math.floor(amount));
    const key = scopeKey ?? "shared";
    if (cost === 0) {
      const bal = await getPlayerWalletBalances(ctx, uid, key);
      return { ok: true as const, balanceAfter: bal.tickets };
    }
    const result = await applyWalletDelta(ctx, {
      uid,
      scopeKey: key,
      lobbyId: lobbyId ?? null,
      kind: "tickets",
      delta: -cost,
      reason: reason ?? "ticket_replay",
      gameType,
    });
    if (!result.ok) {
      return {
        ok: false as const,
        error: result.error === "no_player" ? "no_player" : "insufficient_tickets",
      };
    }
    return { ok: true as const, balanceAfter: result.balanceAfter };
  },
});
