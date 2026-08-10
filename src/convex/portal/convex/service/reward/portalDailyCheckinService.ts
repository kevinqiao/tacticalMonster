import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  checkinCycleRewardTickets,
  checkinDayInCycle,
  checkinTicketsForStreak,
  PORTAL_DAILY_CHECKIN_BASE_TICKETS,
  PORTAL_DAILY_CHECKIN_ENABLED,
  PORTAL_DAILY_CHECKIN_STREAK_BONUS_TICKETS,
  PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS,
} from "../../data/portalDailyCheckinConfig";
import { isPartnerShopCheckinEnabled } from "../../data/portalPartnerShopSettings";
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

async function resolveCheckinEconomy(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  lobbyId?: Id<"portal_lobbies"> | null
): Promise<CheckinEconomy> {
  const partnerId = resolvePortalShopSessionPartnerId(uid) ?? 0;
  try {
    const scope = await resolveEconomyScope(ctx, {
      partnerId,
      lobbyId: lobbyId ?? null,
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

export type PortalDailyCheckinStatus = {
  enabled: boolean;
  claimedToday: boolean;
  canClaim: boolean;
  dayKey: string;
  streakCount: number;
  dayInCycle: number;
  streakCycleDays: number;
  /** Tickets granted if claiming now (or last claim if already claimed). */
  rewardTickets: number;
  cycleRewards: number[];
  baseTickets: number;
  streakBonusTickets: number[];
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

export async function getPortalDailyCheckinStatusCore(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  nowMs: number = Date.now(),
  lobbyId?: Id<"portal_lobbies"> | null
): Promise<PortalDailyCheckinStatus> {
  const cycleRewards = checkinCycleRewardTickets();
  const checkinAllowed = await partnerAllowsCheckin(ctx, uid, lobbyId);
  const base = {
    enabled: checkinAllowed,
    claimedToday: false,
    canClaim: false,
    dayKey: dailyPeriodKey(nowMs),
    streakCount: 0,
    dayInCycle: 1,
    streakCycleDays: PORTAL_DAILY_CHECKIN_STREAK_CYCLE_DAYS,
    rewardTickets: checkinTicketsForStreak(1),
    cycleRewards,
    baseTickets: PORTAL_DAILY_CHECKIN_BASE_TICKETS,
    streakBonusTickets: [...PORTAL_DAILY_CHECKIN_STREAK_BONUS_TICKETS],
  };

  if (!checkinAllowed) {
    return base;
  }

  const econ = await resolveCheckinEconomy(ctx, uid, lobbyId);
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
  const rewardTickets = claimedToday
    ? Math.max(
        0,
        Math.floor(
          row?.lastClaimTickets ?? checkinTicketsForStreak(storedStreak)
        )
      )
    : checkinTicketsForStreak(nextStreak);
  const dayInCycle = checkinDayInCycle(
    claimedToday ? storedStreak : nextStreak
  );

  return {
    ...base,
    claimedToday,
    canClaim: !claimedToday,
    dayKey,
    streakCount,
    dayInCycle,
    rewardTickets,
  };
}

export type ClaimPortalDailyCheckinResult =
  | {
      ok: true;
      ticketsGranted: number;
      streakCount: number;
      dayInCycle: number;
      dayKey: string;
      alreadyClaimed?: false;
    }
  | {
      ok: true;
      alreadyClaimed: true;
      ticketsGranted: number;
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

export async function claimPortalDailyCheckinCore(
  ctx: MutationCtx,
  args: {
    uid: string;
    lobbyId?: Id<"portal_lobbies"> | null;
    nowMs?: number;
  }
): Promise<ClaimPortalDailyCheckinResult> {
  if (!(await partnerAllowsCheckin(ctx, args.uid, args.lobbyId))) {
    return { ok: false, error: "disabled" };
  }

  const nowMs = args.nowMs ?? Date.now();
  const econ = await resolveCheckinEconomy(ctx, args.uid, args.lobbyId);
  if ("error" in econ) {
    return { ok: false, error: econ.error };
  }

  const dayKey = dailyPeriodKey(nowMs);
  const yesterdayKey = dailyPeriodKey(nowMs - MS_PER_DAY);
  const row = await findCheckinStreakRow(ctx, args.uid, econ.scopeKey);

  if (row?.lastClaimPeriodKey === dayKey) {
    const streakCount = Math.max(0, Math.floor(row.streakCount));
    const ticketsGranted = Math.max(
      0,
      Math.floor(row.lastClaimTickets ?? checkinTicketsForStreak(streakCount))
    );
    return {
      ok: true,
      alreadyClaimed: true,
      ticketsGranted,
      streakCount,
      dayInCycle: checkinDayInCycle(streakCount),
      dayKey,
    };
  }

  const streakCount = nextCheckinStreakCount({
    previousStreakCount: row?.streakCount ?? 0,
    lastClaimPeriodKey: row?.lastClaimPeriodKey ?? null,
    dayKey,
    yesterdayKey,
  });
  const ticketsGranted = checkinTicketsForStreak(streakCount);
  const dayInCycle = checkinDayInCycle(streakCount);

  if (ticketsGranted > 0) {
    const grant = await ctx.runMutation(
      internal.service.reward.casualRewardRegistry.grantPortalTickets,
      {
        uid: args.uid,
        amount: ticketsGranted,
        reason: `daily_checkin_streak_d${dayInCycle}`,
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
      updatedAt,
      ...(econ.lobbyId ? { lobbyId: econ.lobbyId } : {}),
    });
  } else {
    await ctx.db.patch(row._id, {
      streakCount,
      lastClaimPeriodKey: dayKey,
      lastClaimTickets: ticketsGranted,
      updatedAt,
      ...(econ.lobbyId ? { lobbyId: econ.lobbyId } : {}),
    });
  }

  return {
    ok: true,
    ticketsGranted,
    streakCount,
    dayInCycle,
    dayKey,
  };
}
