import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  checkinAmountsForKind,
  checkinCycleRewardCoins,
  checkinCycleRewardTickets,
  checkinDayInCycle,
  checkinOptsFromRewards,
  PORTAL_DAILY_CHECKIN_BASE_COINS,
  PORTAL_DAILY_CHECKIN_BASE_TICKETS,
  PORTAL_DAILY_CHECKIN_ENABLED,
  PORTAL_DAILY_CHECKIN_STREAK_BONUS_COINS,
  PORTAL_DAILY_CHECKIN_STREAK_BONUS_TICKETS,
  PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS,
  type CheckinAmountOpts,
  type PortalCheckinRewardKind,
} from "../../data/portalDailyCheckinConfig";
import {
  isPartnerShopCheckinEnabled,
  normalizeCheckinRewardKind,
  type PortalCheckinRewardsOverride,
  type PortalPartnerShopSettings,
} from "../../data/portalPartnerShopSettings";
import { resolvePortalShopSessionPartnerId } from "../../data/portalShopPartner";
import { dailyPeriodKey } from "../../utils/casualTaskPeriod";
import { resolveEconomyScope } from "../economy/resolveEconomyScope";
import { loadPartnerShopSettings } from "../shop/partnerShopSettings";

const MS_PER_DAY = 24 * 3600 * 1000;

type CheckinEconomy =
  | {
      partnerId: number;
      scopeKey: string;
      lobbyId: Id<"portal_lobbies"> | null;
    }
  | { error: "lobby_required_for_isolated_economy" };

type ResolvedCheckinConfig = {
  rewardKind: PortalCheckinRewardKind;
  amountOpts: CheckinAmountOpts;
  settings: PortalPartnerShopSettings | null;
};

async function resolveCheckinEconomy(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  lobbyId?: Id<"portal_lobbies"> | null,
  scopeKey?: string | null
): Promise<CheckinEconomy> {
  const partnerId = resolvePortalShopSessionPartnerId(uid) ?? 0;
  try {
    const scope = await resolveEconomyScope(ctx, {
      partnerId,
      lobbyId: lobbyId ?? null,
      scopeKey,
    });
    return {
      partnerId,
      scopeKey: scope.scopeKey,
      lobbyId: scope.lobbyId,
    };
  } catch {
    return { error: "lobby_required_for_isolated_economy" };
  }
}

async function findCheckinStreakRow(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  scopeKey: string
) {
  return ctx.db
    .query("portal_checkin_streaks")
    .withIndex("by_uid_scopeKey", (q) =>
      q.eq("uid", uid).eq("scopeKey", scopeKey)
    )
    .unique();
}

/** Pure streak advance: consecutive days only; miss resets to 1. */
export function nextCheckinStreakCount(args: {
  previousStreakCount: number;
  lastClaimPeriodKey: string | null;
  dayKey: string;
  yesterdayKey: string;
}): number {
  if (args.lastClaimPeriodKey === args.dayKey) {
    return Math.max(0, Math.floor(args.previousStreakCount));
  }
  if (
    args.lastClaimPeriodKey != null &&
    args.lastClaimPeriodKey === args.yesterdayKey
  ) {
    return Math.max(0, Math.floor(args.previousStreakCount)) + 1;
  }
  return 1;
}

async function resolveCheckinConfig(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  lobbyId?: Id<"portal_lobbies"> | null
): Promise<ResolvedCheckinConfig> {
  const partnerId = resolvePortalShopSessionPartnerId(uid);
  const settings = await loadPartnerShopSettings(
    ctx,
    partnerId,
    lobbyId ?? null
  );
  return {
    rewardKind: normalizeCheckinRewardKind(settings?.checkinRewardKind),
    amountOpts: checkinOptsFromRewards(
      settings?.checkinRewards as PortalCheckinRewardsOverride | undefined
    ),
    settings,
  };
}

export type PortalDailyCheckinStatus = {
  enabled: boolean;
  claimedToday: boolean;
  canClaim: boolean;
  dayKey: string;
  streakCount: number;
  dayInCycle: number;
  streakCycleDays: number;
  rewardKind: PortalCheckinRewardKind;
  rewardTickets: number;
  rewardCoins: number;
  /** Sum for single-number UIs; prefer rewardTickets/rewardCoins. */
  rewardAmount: number;
  cycleRewardTickets: number[];
  cycleRewardCoins: number[];
  /** Compat: primary cycle array (tickets / coins / coins when both). */
  cycleRewards: number[];
  baseTickets: number;
  baseCoins: number;
  streakBonusTickets: number[];
  streakBonusCoins: number[];
};

async function partnerAllowsCheckin(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  lobbyId?: Id<"portal_lobbies"> | null
): Promise<boolean> {
  if (!PORTAL_DAILY_CHECKIN_ENABLED) return false;
  const partnerId = resolvePortalShopSessionPartnerId(uid);
  const settings = await loadPartnerShopSettings(
    ctx,
    partnerId,
    lobbyId ?? null
  );
  return isPartnerShopCheckinEnabled(settings);
}

function effectiveBaseTickets(opts: CheckinAmountOpts): number {
  return opts.baseTickets ?? PORTAL_DAILY_CHECKIN_BASE_TICKETS;
}

function effectiveBaseCoins(opts: CheckinAmountOpts): number {
  return opts.baseCoins ?? PORTAL_DAILY_CHECKIN_BASE_COINS;
}

function effectiveBonusTickets(opts: CheckinAmountOpts): number[] {
  return [
    ...(opts.streakBonusTickets ?? PORTAL_DAILY_CHECKIN_STREAK_BONUS_TICKETS),
  ];
}

function effectiveBonusCoins(opts: CheckinAmountOpts): number[] {
  return [
    ...(opts.streakBonusCoins ?? PORTAL_DAILY_CHECKIN_STREAK_BONUS_COINS),
  ];
}

export async function getPortalDailyCheckinStatusCore(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  nowMs: number = Date.now(),
  lobbyId?: Id<"portal_lobbies"> | null,
  scopeKey?: string | null
): Promise<PortalDailyCheckinStatus> {
  const { rewardKind, amountOpts } = await resolveCheckinConfig(
    ctx,
    uid,
    lobbyId
  );
  const cycleRewardTickets = checkinCycleRewardTickets(amountOpts);
  const cycleRewardCoins = checkinCycleRewardCoins(amountOpts);
  const checkinAllowed = await partnerAllowsCheckin(ctx, uid, lobbyId);
  const day1 = checkinAmountsForKind(rewardKind, 1, amountOpts);
  const base = {
    enabled: checkinAllowed,
    claimedToday: false,
    canClaim: false,
    dayKey: dailyPeriodKey(nowMs),
    streakCount: 0,
    dayInCycle: 1,
    streakCycleDays: PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS,
    rewardKind,
    rewardTickets: day1.tickets,
    rewardCoins: day1.coins,
    rewardAmount: day1.tickets + day1.coins,
    cycleRewardTickets,
    cycleRewardCoins,
    cycleRewards:
      rewardKind === "tickets" ? cycleRewardTickets : cycleRewardCoins,
    baseTickets: effectiveBaseTickets(amountOpts),
    baseCoins: effectiveBaseCoins(amountOpts),
    streakBonusTickets: effectiveBonusTickets(amountOpts),
    streakBonusCoins: effectiveBonusCoins(amountOpts),
  };

  if (!checkinAllowed) {
    return base;
  }

  const econ = await resolveCheckinEconomy(ctx, uid, lobbyId, scopeKey);
  if ("error" in econ) {
    return base;
  }

  const dayKey = dailyPeriodKey(nowMs);
  const yesterdayKey = dailyPeriodKey(nowMs - MS_PER_DAY);
  const row = await findCheckinStreakRow(ctx, uid, econ.scopeKey);
  const claimedToday = row?.lastClaimPeriodKey === dayKey;
  const storedStreak = Math.max(0, Math.floor(row?.streakCount ?? 0));
  const nextStreak = nextCheckinStreakCount({
    previousStreakCount: storedStreak,
    lastClaimPeriodKey: row?.lastClaimPeriodKey ?? null,
    dayKey,
    yesterdayKey,
  });
  /** 连续未断签时用于点亮已领档位；断签则归零。 */
  const streakAlive =
    claimedToday ||
    (row?.lastClaimPeriodKey != null &&
      row.lastClaimPeriodKey === yesterdayKey);
  const streakCount = streakAlive ? storedStreak : 0;
  const computed = claimedToday
    ? checkinAmountsForKind(rewardKind, storedStreak, amountOpts)
    : checkinAmountsForKind(rewardKind, nextStreak, amountOpts);
  const prevTickets = claimedToday
    ? Math.max(0, Math.floor(row?.lastClaimTickets ?? 0))
    : 0;
  const prevCoins = claimedToday
    ? Math.max(0, Math.floor(row?.lastClaimCoins ?? 0))
    : 0;
  const ticketTopUp = claimedToday
    ? Math.max(0, computed.tickets - prevTickets)
    : 0;
  const coinTopUp = claimedToday
    ? Math.max(0, computed.coins - prevCoins)
    : 0;
  const needsTopUp = ticketTopUp > 0 || coinTopUp > 0;
  const rewardTickets = claimedToday
    ? needsTopUp
      ? ticketTopUp
      : Math.max(0, Math.floor(row?.lastClaimTickets ?? computed.tickets))
    : computed.tickets;
  const rewardCoins = claimedToday
    ? needsTopUp
      ? coinTopUp
      : Math.max(0, Math.floor(row?.lastClaimCoins ?? computed.coins))
    : computed.coins;
  const dayInCycle = checkinDayInCycle(
    claimedToday ? storedStreak : nextStreak
  );

  return {
    ...base,
    claimedToday,
    canClaim: !claimedToday || needsTopUp,
    dayKey,
    streakCount,
    dayInCycle,
    rewardTickets,
    rewardCoins,
    rewardAmount: rewardTickets + rewardCoins,
  };
}

export type ClaimPortalDailyCheckinResult =
  | {
      ok: true;
      rewardKind: PortalCheckinRewardKind;
      amountGranted: number;
      ticketsGranted: number;
      coinsGranted: number;
      streakCount: number;
      dayInCycle: number;
      dayKey: string;
      alreadyClaimed?: false;
    }
  | {
      ok: true;
      alreadyClaimed: true;
      rewardKind: PortalCheckinRewardKind;
      amountGranted: number;
      ticketsGranted: number;
      coinsGranted: number;
      streakCount: number;
      dayInCycle: number;
      dayKey: string;
    }
  | {
      ok: false;
      error:
        | "disabled"
        | "lobby_required_for_isolated_economy"
        | "no_player"
        | "grant_failed";
    };

function claimOkPayload(args: {
  rewardKind: PortalCheckinRewardKind;
  ticketsGranted: number;
  coinsGranted: number;
  streakCount: number;
  dayInCycle: number;
  dayKey: string;
  alreadyClaimed?: boolean;
}): Extract<ClaimPortalDailyCheckinResult, { ok: true }> {
  const ticketsGranted = Math.max(0, Math.floor(args.ticketsGranted));
  const coinsGranted = Math.max(0, Math.floor(args.coinsGranted));
  const base = {
    ok: true as const,
    rewardKind: args.rewardKind,
    amountGranted: ticketsGranted + coinsGranted,
    ticketsGranted,
    coinsGranted,
    streakCount: args.streakCount,
    dayInCycle: args.dayInCycle,
    dayKey: args.dayKey,
  };
  if (args.alreadyClaimed) {
    return { ...base, alreadyClaimed: true as const };
  }
  return base;
}

export async function claimPortalDailyCheckinCore(
  ctx: MutationCtx,
  args: {
    uid: string;
    lobbyId?: Id<"portal_lobbies"> | null;
    scopeKey?: string | null;
    nowMs?: number;
  }
): Promise<ClaimPortalDailyCheckinResult> {
  if (!(await partnerAllowsCheckin(ctx, args.uid, args.lobbyId))) {
    return { ok: false, error: "disabled" };
  }

  const { rewardKind, amountOpts } = await resolveCheckinConfig(
    ctx,
    args.uid,
    args.lobbyId
  );
  const nowMs = args.nowMs ?? Date.now();
  const econ = await resolveCheckinEconomy(
    ctx,
    args.uid,
    args.lobbyId,
    args.scopeKey
  );
  if ("error" in econ) {
    return { ok: false, error: econ.error };
  }

  const dayKey = dailyPeriodKey(nowMs);
  const yesterdayKey = dailyPeriodKey(nowMs - MS_PER_DAY);
  const row = await findCheckinStreakRow(ctx, args.uid, econ.scopeKey);

  if (row?.lastClaimPeriodKey === dayKey) {
    const streakCount = Math.max(0, Math.floor(row.streakCount));
    const computed = checkinAmountsForKind(
      rewardKind,
      streakCount,
      amountOpts
    );
    const prevTickets = Math.max(0, Math.floor(row.lastClaimTickets ?? 0));
    const prevCoins = Math.max(0, Math.floor(row.lastClaimCoins ?? 0));
    const ticketTopUp = Math.max(0, computed.tickets - prevTickets);
    const coinTopUp = Math.max(0, computed.coins - prevCoins);

    // Config bump mid-day (e.g. CrazyGames faucet raise): top up the gap once.
    if (ticketTopUp > 0 || coinTopUp > 0) {
      const dayInCycle = checkinDayInCycle(streakCount);
      const reason = `daily_checkin_topup_d${dayInCycle}`;
      if (ticketTopUp > 0) {
        const grant = await ctx.runMutation(
          internal.service.reward.casualRewardRegistry.grantPortalTickets,
          {
            uid: args.uid,
            amount: ticketTopUp,
            reason,
            scopeKey: econ.scopeKey,
            ...(econ.lobbyId ? { lobbyId: econ.lobbyId } : {}),
          }
        );
        if (!grant.ok) {
          return {
            ok: false,
            error: grant.error === "no_player" ? "no_player" : "grant_failed",
          };
        }
      }
      if (coinTopUp > 0) {
        const grant = await ctx.runMutation(
          internal.service.reward.casualRewardRegistry.grantCasualReward,
          {
            uid: args.uid,
            kind: "coins",
            amount: coinTopUp,
            reason,
            scopeKey: econ.scopeKey,
            ...(econ.lobbyId ? { lobbyId: econ.lobbyId } : {}),
          }
        );
        if (!grant.ok) {
          return {
            ok: false,
            error: grant.error === "no_player" ? "no_player" : "grant_failed",
          };
        }
      }
      await ctx.db.patch(row._id, {
        lastClaimTickets: computed.tickets,
        lastClaimCoins: computed.coins,
        updatedAt: nowMs,
      });
      return claimOkPayload({
        rewardKind,
        ticketsGranted: ticketTopUp,
        coinsGranted: coinTopUp,
        streakCount,
        dayInCycle,
        dayKey,
        alreadyClaimed: true,
      });
    }

    return claimOkPayload({
      rewardKind,
      ticketsGranted: Math.max(0, Math.floor(row.lastClaimTickets ?? computed.tickets)),
      coinsGranted: Math.max(0, Math.floor(row.lastClaimCoins ?? computed.coins)),
      streakCount,
      dayInCycle: checkinDayInCycle(streakCount),
      dayKey,
      alreadyClaimed: true,
    });
  }

  const streakCount = nextCheckinStreakCount({
    previousStreakCount: row?.streakCount ?? 0,
    lastClaimPeriodKey: row?.lastClaimPeriodKey ?? null,
    dayKey,
    yesterdayKey,
  });
  const { tickets: ticketsGranted, coins: coinsGranted } =
    checkinAmountsForKind(rewardKind, streakCount, amountOpts);
  const dayInCycle = checkinDayInCycle(streakCount);
  const reason = `daily_checkin_streak_d${dayInCycle}`;

  if (ticketsGranted > 0) {
    const grant = await ctx.runMutation(
      internal.service.reward.casualRewardRegistry.grantPortalTickets,
      {
        uid: args.uid,
        amount: ticketsGranted,
        reason,
        scopeKey: econ.scopeKey,
        ...(econ.lobbyId ? { lobbyId: econ.lobbyId } : {}),
      }
    );
    if (!grant.ok) {
      return {
        ok: false,
        error: grant.error === "no_player" ? "no_player" : "grant_failed",
      };
    }
  }

  if (coinsGranted > 0) {
    const grant = await ctx.runMutation(
      internal.service.reward.casualRewardRegistry.grantCasualReward,
      {
        uid: args.uid,
        kind: "coins",
        amount: coinsGranted,
        reason,
        scopeKey: econ.scopeKey,
        ...(econ.lobbyId ? { lobbyId: econ.lobbyId } : {}),
      }
    );
    if (!grant.ok) {
      return {
        ok: false,
        error: grant.error === "no_player" ? "no_player" : "grant_failed",
      };
    }
  }

  const updatedAt = nowMs;
  if (!row) {
    await ctx.db.insert("portal_checkin_streaks", {
      uid: args.uid,
      scopeKey: econ.scopeKey,
      streakCount,
      lastClaimPeriodKey: dayKey,
      lastClaimTickets: ticketsGranted,
      lastClaimCoins: coinsGranted,
      updatedAt,
      ...(econ.lobbyId ? { lobbyId: econ.lobbyId } : {}),
    });
  } else {
    await ctx.db.patch(row._id, {
      streakCount,
      lastClaimPeriodKey: dayKey,
      lastClaimTickets: ticketsGranted,
      lastClaimCoins: coinsGranted,
      updatedAt,
      ...(econ.lobbyId ? { lobbyId: econ.lobbyId } : {}),
    });
  }

  return claimOkPayload({
    rewardKind,
    ticketsGranted,
    coinsGranted,
    streakCount,
    dayInCycle,
    dayKey,
  });
}
