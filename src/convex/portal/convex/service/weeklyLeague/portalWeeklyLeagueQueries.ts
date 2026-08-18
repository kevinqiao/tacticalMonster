import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { resolvePortalShopSessionPartnerId } from "../../data/portalShopPartner";
import { authedMutation, authedQuery } from "../../custom/session";
import { weeklyPeriodKey, weeklyWindowMsShanghai } from "../../utils/casualTaskPeriod";
import {
  applyWalletDelta,
  getPlayerWalletBalances,
} from "../economy/portalWalletDao";
import { resolveEconomyScope } from "../economy/resolveEconomyScope";
import {
  ensurePortalWeeklyLeagueMemberForScope,
  findUnclaimedPortalWeeklyLeagueRewards,
  getPortalWeeklyLeagueTierViewForUidScoped,
  getWeeklyLeagueMemberByScope,
  listPortalWeeklyLeagueCohortBoardScoped,
  listWeeklyLeagueMembersForScope,
} from "./portalWeeklyLeagueService";
import {
  isLobbyLeagueScope,
  isTownLeagueScopeKey,
  leagueScopeDisplaySlug,
  resolveLeagueScope,
  type LeagueScope,
} from "../../data/portalLeagueScope";
import {
  ensureSeasonHonorProgress,
  finalizePreviousSeasonsIfNeeded,
} from "../season/portalSeasonHonorService";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";


async function resolveWeeklyLeagueGrantWallet(
  ctx: MutationCtx,
  args: {
    uid: string;
    leagueScope: LeagueScope;
    memberLobbyId?: Id<"portal_lobbies"> | null;
  }
): Promise<{ scopeKey: string; lobbyId: Id<"portal_lobbies"> | null }> {
  const partnerId = resolvePortalShopSessionPartnerId(args.uid) ?? 0;
  if (isTownLeagueScopeKey(args.leagueScope.leagueScopeKey)) {
    return { scopeKey: args.leagueScope.leagueScopeKey, lobbyId: null };
  }
  const lobbyIdForEconomy = args.leagueScope.lobbyId ?? args.memberLobbyId ?? null;
  try {
    const econ = await resolveEconomyScope(ctx, {
      partnerId,
      lobbyId: lobbyIdForEconomy,
    });
    return { scopeKey: econ.scopeKey, lobbyId: econ.lobbyId };
  } catch {
    return { scopeKey: "shared", lobbyId: null };
  }
}

/**
 * Coins granted before scope wiring landed on "shared" while the lobby UI reads
 * isolated `lobby:{id}`. Move matching weekly_league ledger credits once.
 */
async function repairMisScopedWeeklyLeagueGrant(
  ctx: MutationCtx,
  args: {
    uid: string;
    weekKey: string;
    coins: number;
    gameType: string;
    targetScopeKey: string;
    targetLobbyId: Id<"portal_lobbies"> | null;
  }
): Promise<boolean> {
  if (args.targetScopeKey === "shared" || args.coins <= 0) return false;

  const alreadyOnTarget = await ctx.db
    .query("portal_coin_ledger")
    .withIndex("by_uid_scopeKey_created", (q) =>
      q.eq("uid", args.uid).eq("scopeKey", args.targetScopeKey)
    )
    .collect();
  if (
    alreadyOnTarget.some(
      (row) =>
        row.reason === "weekly_league" &&
        row.sourceWeekKey === args.weekKey &&
        row.kind === "coins" &&
        row.delta > 0
    ) ||
    alreadyOnTarget.some(
      (row) =>
        row.reason === "weekly_league_scope_repair" &&
        row.sourceWeekKey === args.weekKey &&
        row.kind === "coins" &&
        row.delta > 0
    )
  ) {
    return false;
  }

  const sharedRows = await ctx.db
    .query("portal_coin_ledger")
    .withIndex("by_uid_created", (q) => q.eq("uid", args.uid))
    .collect();
  const misScoped = sharedRows.filter(
    (row) =>
      row.kind === "coins" &&
      row.reason === "weekly_league" &&
      row.sourceWeekKey === args.weekKey &&
      row.delta > 0 &&
      (row.scopeKey == null || row.scopeKey === "shared")
  );
  const misScopedTotal = misScoped.reduce((sum, row) => sum + row.delta, 0);
  const sharedBal = await getPlayerWalletBalances(ctx, args.uid, "shared");
  const amount = Math.min(args.coins, misScopedTotal, sharedBal.coins);
  if (amount <= 0) return false;

  const debit = await applyWalletDelta(ctx, {
    uid: args.uid,
    scopeKey: "shared",
    lobbyId: null,
    kind: "coins",
    delta: -amount,
    reason: "weekly_league_scope_repair",
    gameType: args.gameType,
    sourceWeekKey: args.weekKey,
  });
  if (!debit.ok) return false;

  const credit = await applyWalletDelta(ctx, {
    uid: args.uid,
    scopeKey: args.targetScopeKey,
    lobbyId: args.targetLobbyId,
    kind: "coins",
    delta: amount,
    reason: "weekly_league_scope_repair",
    gameType: args.gameType,
    sourceWeekKey: args.weekKey,
  });
  if (!credit.ok) {
    // Best-effort rollback so shared wallet is not left short.
    await applyWalletDelta(ctx, {
      uid: args.uid,
      scopeKey: "shared",
      lobbyId: null,
      kind: "coins",
      delta: amount,
      reason: "weekly_league_scope_repair_rollback",
      gameType: args.gameType,
      sourceWeekKey: args.weekKey,
    });
    return false;
  }
  return true;
}

/** 本周首次登录 Portal（已鉴权）时入 cohort。 Prefer lobbyId when provided. */
export const ensurePortalWeeklyLeagueMemberMutation = authedMutation({
  args: {
    gameType: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
    lobbySlug: v.optional(v.string()),
    leagueScopeKey: v.optional(v.string()),
  },
  handler: async (ctx, { gameType, lobbyId, lobbySlug, leagueScopeKey }) => {
    console.log("[portal] ensurePortalWeeklyLeagueMemberMutation", {
      uid: ctx.uid,
      gameType,
      lobbyId,
      leagueScopeKey,
    });
    const leagueScope = resolveLeagueScope({ lobbyId, gameType, leagueScopeKey });
    let memberId: Id<"portal_weekly_league_members"> | null = null;
    if (leagueScope) {
      memberId = await ensurePortalWeeklyLeagueMemberForScope(
        ctx,
        ctx.uid,
        leagueScope.leagueScopeKey,
        lobbySlug ?? leagueScopeDisplaySlug(leagueScope)
      );
      if (isLobbyLeagueScope(leagueScope)) {
        await finalizePreviousSeasonsIfNeeded(ctx, ctx.uid, leagueScope.lobbyId);
        await ensureSeasonHonorProgress(ctx, ctx.uid, leagueScope.lobbyId);
      }
      const claimedMembers = await listWeeklyLeagueMembersForScope(ctx, ctx.uid, leagueScope);
      for (const m of claimedMembers) {
        const coins = m.pendingRewards?.coins ?? 0;
        if (!m.rewardsClaimedAt || coins <= 0) continue;
        const wallet = await resolveWeeklyLeagueGrantWallet(ctx, {
          uid: ctx.uid,
          leagueScope,
          memberLobbyId: m.lobbyId ?? leagueScope.lobbyId ?? null,
        });
        await repairMisScopedWeeklyLeagueGrant(ctx, {
          uid: ctx.uid,
          weekKey: m.weekKey,
          coins,
          gameType: leagueScope.gameType ?? m.gameType ?? leagueScopeDisplaySlug(leagueScope),
          targetScopeKey: wallet.scopeKey,
          targetLobbyId: wallet.lobbyId,
        });
      }
    }

    console.log("[portal] ensurePortalWeeklyLeagueMemberMutation done", {
      uid: ctx.uid,
      gameType,
      lobbyId,
      ok: memberId != null,
      memberId,
    });
    return { ok: memberId != null, memberId };
  },
});

export const getPortalWeeklyLeagueTierView = authedQuery({
  args: {
    gameType: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
    leagueScopeKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scope = resolveLeagueScope(args);
    if (!scope) throw new Error("league_scope_required");
    return await getPortalWeeklyLeagueTierViewForUidScoped(ctx, ctx.uid, scope);
  },
});

export const getPortalWeeklyLeagueCohortLeaderboard = authedQuery({
  args: {
    gameType: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
    leagueScopeKey: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const scope = resolveLeagueScope(args);
    if (!scope) throw new Error("league_scope_required");
    const now = Date.now();
    const n = Math.min(Math.max(args.limit ?? 50, 1), 100);
    const board = await listPortalWeeklyLeagueCohortBoardScoped(
      ctx,
      ctx.uid,
      scope,
      n,
      now
    );
    const window = weeklyWindowMsShanghai(now);
    if (!board) {
      return { weekEndsAt: window.endsAt, cohortNo: null, rows: [] as const };
    }
    return { weekEndsAt: window.endsAt, cohortNo: board.cohortNo, rows: board.rows };
  },
});

export const claimPortalWeeklyLeagueRewards = authedMutation({
  args: {
    gameType: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
    leagueScopeKey: v.optional(v.string()),
    weekKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scope = resolveLeagueScope(args);
    if (!scope) return { ok: false as const, error: "lobbyId_or_gameType_required" as const };
    const uid = ctx.uid;
    let weekKey = args.weekKey ?? weeklyPeriodKey(Date.now());
    let member = await getWeeklyLeagueMemberByScope(ctx, {
      uid,
      leagueScopeKey: scope.leagueScopeKey,
      weekKey,
    });

    if (!member?.pendingRewards || member.rewardsClaimedAt) {
      const unclaimed = await findUnclaimedPortalWeeklyLeagueRewards(ctx, uid, scope);
      if (unclaimed) {
        member = await getWeeklyLeagueMemberByScope(ctx, {
          uid,
          leagueScopeKey: scope.leagueScopeKey,
          weekKey: unclaimed.weekKey,
        });
        weekKey = unclaimed.weekKey;
      }
    }

    const gameTypeForGrant = scope.gameType ?? member?.gameType ?? leagueScopeDisplaySlug(scope);

    // Already claimed but coins may sit on shared wallet under isolated ops.
    if (member?.pendingRewards && member.rewardsClaimedAt) {
      const wallet = await resolveWeeklyLeagueGrantWallet(ctx, {
        uid,
        leagueScope: scope,
        memberLobbyId: member.lobbyId ?? null,
      });
      const repaired = await repairMisScopedWeeklyLeagueGrant(ctx, {
        uid,
        weekKey,
        coins: member.pendingRewards.coins ?? 0,
        gameType: gameTypeForGrant,
        targetScopeKey: wallet.scopeKey,
        targetLobbyId: wallet.lobbyId,
      });
      if (repaired) {
        return {
          ok: true as const,
          granted: member.pendingRewards,
          weekKey,
          repaired: true as const,
        };
      }
      return { ok: false as const, error: "nothing_to_claim" as const };
    }

    if (!member?.pendingRewards || member.rewardsClaimedAt) {
      return { ok: false as const, error: "nothing_to_claim" as const };
    }
    const pr = member.pendingRewards;
    const now = Date.now();
    if ((pr.coins ?? 0) > 0) {
      const wallet = await resolveWeeklyLeagueGrantWallet(ctx, {
        uid,
        leagueScope: scope,
        memberLobbyId: member.lobbyId ?? null,
      });
      const gr = await ctx.runMutation(
        internal.service.reward.casualRewardRegistry.grantCasualReward,
        {
          uid,
          kind: "coins",
          amount: pr.coins!,
          reason: "weekly_league",
          gameType: gameTypeForGrant,
          sourceWeekKey: weekKey,
          scopeKey: wallet.scopeKey,
          ...(wallet.lobbyId ? { lobbyId: wallet.lobbyId } : {}),
        }
      );
      if (!gr.ok) {
        return { ok: false as const, error: "grant_failed" as const };
      }
    }
    await ctx.db.patch(member._id, {
      rewardsClaimedAt: now,
      unreadClose: false,
      updatedAt: now,
    });
    return { ok: true as const, granted: pr, weekKey };
  },
});

export const dismissPortalWeeklyLeagueClose = authedMutation({
  args: {
    gameType: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
    leagueScopeKey: v.optional(v.string()),
    weekKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scope = resolveLeagueScope(args);
    if (!scope) return { ok: false as const };
    const uid = ctx.uid;
    let member = args.weekKey
      ? await getWeeklyLeagueMemberByScope(ctx, {
          uid,
          leagueScopeKey: scope.leagueScopeKey,
          weekKey: args.weekKey,
        })
      : null;

    if (!member) {
      const unreadRows = await listWeeklyLeagueMembersForScope(ctx, uid, scope);
      const unread = unreadRows
        .filter((m) => !m.isBot && m.unreadClose)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];
      if (unread) {
        member = unread;
      } else {
        const unclaimed = await findUnclaimedPortalWeeklyLeagueRewards(ctx, uid, scope);
        if (unclaimed) {
          member = await getWeeklyLeagueMemberByScope(ctx, {
            uid,
            leagueScopeKey: scope.leagueScopeKey,
            weekKey: unclaimed.weekKey,
          });
        }
      }
    }

    if (!member) return { ok: false as const };
    await ctx.db.patch(member._id, { unreadClose: false, updatedAt: Date.now() });
    return { ok: true as const };
  },
});
