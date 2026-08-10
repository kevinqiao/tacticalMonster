/**
 * Resolve + apply solo daily rewarded-success cap at settle / join.
 */

import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  isSoloSuccessDailyCapped,
  type PortalSoloSuccessDailyConfig,
} from "../../data/portalSoloSuccessConfig";
import { dailyPeriodKey } from "../../utils/casualTaskPeriod";
import { partnerIdFromUid } from "./partnerAdReplayConfig";
import {
  bumpSoloSuccessUsedToday,
  readSoloSuccessUsedToday,
} from "./portalEntryDailyUsage";
import type { PlayEntryContext } from "./portalEntryUsageScope";
import {
  quotaScopeFromSettings,
  resolvePlayEntrySettings,
  soloSuccessConfigFromSettings,
} from "./resolvePlayEntrySettings";

export type SoloSuccessDailyState = {
  config: PortalSoloSuccessDailyConfig;
  usedToday: number;
  remainingToday: number;
  capped: boolean;
  dayKey: string;
  quotaScope: ReturnType<typeof quotaScopeFromSettings>;
};

export async function loadSoloSuccessDailyState(
  ctx: QueryCtx | MutationCtx,
  args: {
    uid: string;
    lobbyId?: Id<"portal_lobbies"> | null;
    tournamentId?: string | null;
    nowMs?: number;
  }
): Promise<SoloSuccessDailyState> {
  const nowMs = args.nowMs ?? Date.now();
  const dayKey = dailyPeriodKey(nowMs);
  const entryCtx: PlayEntryContext = {
    lobbyId: args.lobbyId ?? null,
    tournamentId: args.tournamentId ?? null,
  };
  const { settings } = await resolvePlayEntrySettings(ctx, {
    partnerId: partnerIdFromUid(args.uid),
    lobbyId: entryCtx.lobbyId,
    tournamentId: entryCtx.tournamentId,
  });
  const quotaScope = quotaScopeFromSettings(settings);
  const config = soloSuccessConfigFromSettings(settings);
  const usedToday = await readSoloSuccessUsedToday(
    ctx,
    args.uid,
    dayKey,
    entryCtx,
    quotaScope
  );
  const capped = isSoloSuccessDailyCapped(usedToday, config);
  const remainingToday = config.enabled
    ? Math.max(0, config.dailyCap - usedToday)
    : Number.POSITIVE_INFINITY;
  return { config, usedToday, remainingToday, capped, dayKey, quotaScope };
}

/**
 * When capped + afterCapMode=zero_all: mute success/fail rewards and penalties.
 * Call before applying points/coins. Bump usage only for a non-muted success.
 */
export async function applySoloSuccessDailyCapAtSettle(
  ctx: MutationCtx,
  args: {
    uid: string;
    lobbyId?: Id<"portal_lobbies"> | null;
    tournamentId?: string | null;
    p75Success: boolean;
    nowMs?: number;
  }
): Promise<{ muted: boolean; state: SoloSuccessDailyState }> {
  const state = await loadSoloSuccessDailyState(ctx, args);
  if (state.capped && state.config.afterCapMode === "zero_all") {
    return { muted: true, state };
  }
  if (args.p75Success) {
    const entryCtx: PlayEntryContext = {
      lobbyId: args.lobbyId ?? null,
      tournamentId: args.tournamentId ?? null,
    };
    await bumpSoloSuccessUsedToday(ctx, {
      uid: args.uid,
      dayKey: state.dayKey,
      now: args.nowMs ?? Date.now(),
      entryCtx,
      quotaScope: state.quotaScope,
    });
  }
  return { muted: false, state };
}
