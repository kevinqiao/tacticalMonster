import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export type WalletBalances = {
  coins: number;
  gems: number;
  tickets: number;
};

type WalletKind = "coins" | "gems" | "tickets";

/**
 * Ensure scoped wallet exists. For scopeKey "shared", seed once from legacy
 * portal_players.coins/gems/tickets (then clear those fields to avoid double-count).
 */
export async function ensurePlayerWallet(
  ctx: MutationCtx,
  uid: string,
  scopeKey: string,
  opts?: { seedCoins?: number }
): Promise<Doc<"portal_player_wallets">> {
  const existing = await ctx.db
    .query("portal_player_wallets")
    .withIndex("by_uid_scopeKey", (q) => q.eq("uid", uid).eq("scopeKey", scopeKey))
    .unique();
  if (existing) return existing;

  const now = Date.now();
  let coins = 0;
  let gems = 0;
  let tickets = 0;

  if (scopeKey === "shared") {
    const player = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
    if (player) {
      coins = Math.max(0, Math.floor(player.coins ?? 0));
      gems = Math.max(0, Math.floor(player.gems ?? 0));
      tickets = Math.max(0, Math.floor(player.tickets ?? 0));
      if (coins > 0 || gems > 0 || tickets > 0) {
        await ctx.db.patch(player._id, {
          coins: 0,
          gems: 0,
          tickets: 0,
          updatedAt: now,
        });
      }
    }
  } else if (scopeKey.startsWith("town:")) {
    if (typeof opts?.seedCoins === "number" && Number.isFinite(opts.seedCoins)) {
      coins = Math.max(0, Math.floor(opts.seedCoins));
    } else {
      const { ZONE_GLOBAL } = await import("../town/zoneEconomyConfig");
      coins = ZONE_GLOBAL.startingCoins;
    }
  }

  const id = await ctx.db.insert("portal_player_wallets", {
    uid,
    scopeKey,
    coins,
    gems,
    tickets,
    createdAt: now,
    updatedAt: now,
  });
  const row = await ctx.db.get(id);
  if (!row) throw new Error("wallet_insert_failed");
  return row;
}

export async function getPlayerWalletBalances(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  scopeKey: string
): Promise<WalletBalances> {
  const wallet = await ctx.db
    .query("portal_player_wallets")
    .withIndex("by_uid_scopeKey", (q) => q.eq("uid", uid).eq("scopeKey", scopeKey))
    .unique();
  if (wallet) {
    return {
      coins: Math.max(0, Math.floor(wallet.coins ?? 0)),
      gems: Math.max(0, Math.floor(wallet.gems ?? 0)),
      tickets: Math.max(0, Math.floor(wallet.tickets ?? 0)),
    };
  }
  // Pre-migration read: shared falls back to portal_players.
  if (scopeKey === "shared") {
    const player = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
    return {
      coins: Math.max(0, Math.floor(player?.coins ?? 0)),
      gems: Math.max(0, Math.floor(player?.gems ?? 0)),
      tickets: Math.max(0, Math.floor(player?.tickets ?? 0)),
    };
  }
  return { coins: 0, gems: 0, tickets: 0 };
}

export async function applyWalletDelta(
  ctx: MutationCtx,
  args: {
    uid: string;
    scopeKey: string;
    lobbyId?: Id<"portal_lobbies"> | null;
    kind: WalletKind;
    delta: number;
    reason: string;
    gameType?: string;
    sourceWeekKey?: string;
  }
): Promise<{ ok: true; balanceAfter: number } | { ok: false; error: "no_player" | "insufficient" }> {
  const player = await ctx.db
    .query("portal_players")
    .withIndex("by_uid", (q) => q.eq("uid", args.uid))
    .unique();
  if (!player) return { ok: false, error: "no_player" };

  const wallet = await ensurePlayerWallet(ctx, args.uid, args.scopeKey);
  const now = Date.now();
  const cur =
    args.kind === "coins"
      ? Math.max(0, Math.floor(wallet.coins ?? 0))
      : args.kind === "gems"
        ? Math.max(0, Math.floor(wallet.gems ?? 0))
        : Math.max(0, Math.floor(wallet.tickets ?? 0));
  const next = cur + args.delta;
  if (next < 0) return { ok: false, error: "insufficient" };

  const patch: {
    coins?: number;
    gems?: number;
    tickets?: number;
    updatedAt: number;
  } = { updatedAt: now };
  if (args.kind === "coins") patch.coins = next;
  else if (args.kind === "gems") patch.gems = next;
  else patch.tickets = next;

  await ctx.db.patch(wallet._id, patch);
  await ctx.db.insert("portal_coin_ledger", {
    uid: args.uid,
    kind: args.kind,
    delta: args.delta,
    balanceAfter: next,
    reason: args.reason,
    gameType: args.gameType,
    sourceWeekKey: args.sourceWeekKey,
    scopeKey: args.scopeKey,
    ...(args.lobbyId ? { lobbyId: args.lobbyId } : {}),
    createdAt: now,
  });

  if (
    args.kind === "coins" &&
    args.delta > 0 &&
    (args.scopeKey === "shared" || args.scopeKey.startsWith("town:"))
  ) {
    const { recordTownCoinIncome, townIdFromScopeKey } = await import("../town/townPassiveRollup");
    const townId = townIdFromScopeKey(args.scopeKey);
    if (townId) {
      await recordTownCoinIncome(ctx, args.uid, townId, args.delta, args.reason === "town_passive_collect" ? "passive" : "other", now);
    }
  }

  return { ok: true, balanceAfter: next };
}
