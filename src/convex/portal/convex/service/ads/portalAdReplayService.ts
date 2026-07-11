import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { CASUAL_REPLAY_REQUIRE_NEAR_MISS } from "../../data/portalPlayerStrategyTypes";
import {
  isPortalAdReplayChannel,
  isPortalAdReplayMockEnabled,
  isPortalAdReplayTemplate,
  PORTAL_AD_REPLAY_DAILY_CAP,
  PORTAL_AD_REPLAY_ENABLED,
  PORTAL_AD_REPLAY_SESSION_TTL_MS,
  type PortalAdReplayChannel,
} from "../../data/portalAdReplayConfig";
import { dailyPeriodKey, weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import { findPlayerGameByGameId } from "../tournament/shared/casualPlayerGameTypes";
import {
  canUseReplayForTemplate,
  getReplayWindowEndsAt,
  isReplayableFinished,
} from "../tournament/shared/casualPlayerMatchStatus";
import { isNearMissTableSummary } from "../tournament/replay/casualReplayTokens";
import type { CasualAsyncTableSummary } from "../tournament/settle/casualRunSettlementFill";
import { authorizeCasualRunReplayCore } from "../tournament/replay/casualRunReplay";
import type { PortalTournamentDefinition } from "../../data/portalTournamentConfigs";
import { getPortalTournamentDefinition } from "../../data/portalTournamentConfigs";
import {
  isPortalAdReplayOfferEligible,
  resolvePortalSoloChallengeSuccessForPlayerGame,
} from "./portalAdReplayEligibility";
import { buildCasualAsyncTableSummary } from "../tournament/settle/casualRunSettlementFill";
import { casualTableSummarySolo } from "../tournament/settle/async/casualAsyncTableSummary";

function randomHexSessionId(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type AdReplaySessionError =
  | "disabled"
  | "invalid_channel"
  | "unknown_match_game"
  | "forbidden"
  | "replay_not_allowed"
  | "replay_window_closed"
  | "daily_cap_reached"
  | "already_claimed"
  | "near_miss_required"
  | "session_not_found"
  | "session_expired"
  | "session_not_pending"
  | "session_mismatch";

export async function countAdReplayClaimsForDay(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  dayKey: string
): Promise<number> {
  const rows = await ctx.db
    .query("portal_ad_replay_claims")
    .withIndex("by_uid_dayKey", (q) => q.eq("uid", uid).eq("dayKey", dayKey))
    .collect();
  const seen = new Set<string>();
  for (const row of rows) {
    seen.add(adReplayClaimDedupeKey(row.matchGameId, row.replayEpoch));
  }
  return seen.size;
}

export function normalizeReplayEpoch(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : 0;
}

/** 每日上限去重键：同一 matchGameId + replayEpoch 只计一次 */
export function adReplayClaimDedupeKey(
  matchGameId: string,
  replayEpoch: unknown
): string {
  return `${matchGameId}:${normalizeReplayEpoch(replayEpoch)}`;
}

/** 当前局次 replay epoch：pg/pm 取较大值，避免 seat/game 不同步时误判 already_claimed。 */
export function resolveSourceReplayEpoch(
  pg: { replayEpoch?: number } | null | undefined,
  pm: { replayEpoch?: number } | null | undefined
): number {
  return Math.max(normalizeReplayEpoch(pg?.replayEpoch), normalizeReplayEpoch(pm?.replayEpoch));
}

export async function hasAdReplayClaimForReplayAttempt(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  matchGameId: string,
  sourceReplayEpoch: number
): Promise<boolean> {
  const epoch = normalizeReplayEpoch(sourceReplayEpoch);
  const rows = await ctx.db
    .query("portal_ad_replay_claims")
    .withIndex("by_uid_matchGameId", (q) => q.eq("uid", uid).eq("matchGameId", matchGameId))
    .collect();
  return rows.some((row) => normalizeReplayEpoch(row.replayEpoch) === epoch);
}

/** @deprecated 使用 hasAdReplayClaimForReplayAttempt */
export async function hasAdReplayClaimForMatch(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  matchGameId: string
): Promise<boolean> {
  const row = await ctx.db
    .query("portal_ad_replay_claims")
    .withIndex("by_uid_matchGameId", (q) => q.eq("uid", uid).eq("matchGameId", matchGameId))
    .first();
  return row != null;
}

async function findAdReplayClaimForSession(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  matchGameId: string,
  sessionId: string
) {
  const rows = await ctx.db
    .query("portal_ad_replay_claims")
    .withIndex("by_uid_matchGameId", (q) => q.eq("uid", uid).eq("matchGameId", matchGameId))
    .collect();
  return rows.find((row) => row.sessionId === sessionId) ?? null;
}

async function loadReplayMatchContext(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  matchGameId: string
) {
  const pg = await findPlayerGameByGameId(ctx, matchGameId);
  if (!pg) return { ok: false as const, error: "unknown_match_game" as const };
  if (pg.uid !== uid) return { ok: false as const, error: "forbidden" as const };

  const pm = await ctx.db.get(pg.playerMatchId);
  if (!pm) return { ok: false as const, error: "unknown_match_game" as const };

  if (!canUseReplayForTemplate(pm.templateId)) {
    return { ok: false as const, error: "replay_not_allowed" as const };
  }
  if (!isPortalAdReplayTemplate(pm.templateId)) {
    return { ok: false as const, error: "replay_not_allowed" as const };
  }

  return { ok: true as const, pg, pm };
}

async function cancelPendingAdReplaySessionsForMatch(
  ctx: MutationCtx,
  uid: string,
  matchGameId: string,
  now: number
): Promise<void> {
  const rows = await ctx.db
    .query("portal_ad_replay_sessions")
    .withIndex("by_uid_matchGameId", (q) => q.eq("uid", uid).eq("matchGameId", matchGameId))
    .collect();
  for (const row of rows) {
    if (row.status === "pending") {
      await ctx.db.patch(row._id, { status: "cancelled", updatedAt: now });
    }
  }
}

export async function assertAdReplayWindowOpen(
  ctx: QueryCtx | MutationCtx,
  pm: Doc<"portal_run_player_matches">,
  now: number
): Promise<{ ok: true } | { ok: false; error: AdReplaySessionError }> {
  const freshPm = (await ctx.db.get(pm._id)) ?? pm;
  if (!isReplayableFinished(freshPm, pm.templateId, now)) {
    return { ok: false, error: "replay_window_closed" };
  }
  return { ok: true };
}

export async function assertPortalAdReplayOfferEligible(
  ctx: QueryCtx | MutationCtx,
  args: { uid: string; pm: Doc<"portal_run_player_matches">; matchGameId: string }
): Promise<{ ok: true } | { ok: false; error: AdReplaySessionError }> {
  const def = getPortalTournamentDefinition(args.pm.templateId);
  if (!def) {
    return { ok: false, error: "replay_not_allowed" };
  }

  const pg = await findPlayerGameByGameId(ctx, args.matchGameId);
  if (!pg || pg.uid !== args.uid) {
    return { ok: false, error: "forbidden" };
  }

  let tableSummary: CasualAsyncTableSummary | null = null;
  let challengeSuccess: boolean | undefined;

  if (def.maxPlayers <= 1) {
    tableSummary = casualTableSummarySolo(def.maxPlayers, args.pm.score ?? 0);
    challengeSuccess = await resolvePortalSoloChallengeSuccessForPlayerGame(ctx, {
      def,
      pg,
      score: args.pm.score ?? 0,
    });
  } else {
    tableSummary = await buildCasualAsyncTableSummary(ctx, {
      templateId: args.pm.templateId,
      uid: args.uid,
      maxPlayers: def.maxPlayers,
      matchId: args.pm.matchId,
    });
  }

  if (!isPortalAdReplayOfferEligible({ def, tableSummary, challengeSuccess })) {
    return { ok: false, error: "replay_not_allowed" };
  }
  return { ok: true };
}

export async function buildPortalAdReplayOffer(
  ctx: QueryCtx,
  args: {
    uid: string;
    pm: Doc<"portal_run_player_matches">;
    now: number;
    matchGameId: string;
    tableSummary: CasualAsyncTableSummary | null;
    def: PortalTournamentDefinition;
    challengeSuccess?: boolean;
  }
): Promise<{
  replayOffered: boolean;
  replayMode: "ad" | "token";
  replayTokenCount: number;
  canReplay: boolean;
  adReplayDailyRemaining: number;
  replayWindowEndsAt?: number;
}> {
  const { uid, pm, now, tableSummary, matchGameId, def, challengeSuccess } = args;
  const empty = {
    replayOffered: false,
    replayMode: "ad" as const,
    replayTokenCount: 0,
    canReplay: false,
    adReplayDailyRemaining: 0,
  };

  if (!PORTAL_AD_REPLAY_ENABLED || !isPortalAdReplayTemplate(pm.templateId)) {
    return empty;
  }
  if (!canUseReplayForTemplate(pm.templateId)) {
    return empty;
  }

  const eligibilityOk = isPortalAdReplayOfferEligible({
    def,
    tableSummary,
    challengeSuccess,
  });
  if (!eligibilityOk) {
    return empty;
  }

  const freshPm = (await ctx.db.get(pm._id)) ?? pm;
  const replayOffered = isReplayableFinished(freshPm, pm.templateId, now);
  const replayWindowEndsAt = replayOffered
    ? getReplayWindowEndsAt(freshPm, pm.templateId, now)
    : undefined;

  const pg = await findPlayerGameByGameId(ctx, matchGameId);
  const sourceReplayEpoch = resolveSourceReplayEpoch(pg, freshPm);

  const dayKey = dailyPeriodKey(now);
  const usedToday = await countAdReplayClaimsForDay(ctx, uid, dayKey);
  const adReplayDailyRemaining = Math.max(0, PORTAL_AD_REPLAY_DAILY_CAP - usedToday);
  const alreadyClaimed = replayOffered
    ? await hasAdReplayClaimForReplayAttempt(ctx, uid, matchGameId, sourceReplayEpoch)
    : false;

  const nearMissOk =
    !CASUAL_REPLAY_REQUIRE_NEAR_MISS ||
    (tableSummary ? isNearMissTableSummary(tableSummary) : false);

  const canReplay =
    replayOffered &&
    adReplayDailyRemaining > 0 &&
    !alreadyClaimed &&
    nearMissOk;

  return {
    replayOffered,
    replayMode: "ad",
    replayTokenCount: 0,
    canReplay,
    adReplayDailyRemaining,
    ...(replayWindowEndsAt != null ? { replayWindowEndsAt } : {}),
  };
}

export async function beginPortalAdReplaySessionCore(
  ctx: MutationCtx,
  args: { uid: string; matchGameId: string; channel: string; now?: number }
) {
  const now = args.now ?? Date.now();
  if (!PORTAL_AD_REPLAY_ENABLED) {
    return { ok: false as const, error: "disabled" as const };
  }
  if (!isPortalAdReplayChannel(args.channel)) {
    return { ok: false as const, error: "invalid_channel" as const };
  }

  const loaded = await loadReplayMatchContext(ctx, args.uid, args.matchGameId);
  if (!loaded.ok) return loaded;

  const windowOk = await assertAdReplayWindowOpen(ctx, loaded.pm, now);
  if (!windowOk.ok) return windowOk;

  const eligible = await assertPortalAdReplayOfferEligible(ctx, {
    uid: args.uid,
    pm: loaded.pm,
    matchGameId: args.matchGameId,
  });
  if (!eligible.ok) return eligible;

  const sourceReplayEpoch = resolveSourceReplayEpoch(loaded.pg, loaded.pm);
  if (
    await hasAdReplayClaimForReplayAttempt(
      ctx,
      args.uid,
      args.matchGameId,
      sourceReplayEpoch
    )
  ) {
    return { ok: false as const, error: "already_claimed" as const };
  }

  const dayKey = dailyPeriodKey(now);
  const usedToday = await countAdReplayClaimsForDay(ctx, args.uid, dayKey);
  if (usedToday >= PORTAL_AD_REPLAY_DAILY_CAP) {
    return { ok: false as const, error: "daily_cap_reached" as const };
  }

  const sessionId = randomHexSessionId(16);
  const expiresAt = now + PORTAL_AD_REPLAY_SESSION_TTL_MS;

  await cancelPendingAdReplaySessionsForMatch(ctx, args.uid, args.matchGameId, now);

  await ctx.db.insert("portal_ad_replay_sessions", {
    sessionId,
    uid: args.uid,
    matchGameId: args.matchGameId,
    matchId: loaded.pm.matchId,
    channel: args.channel as PortalAdReplayChannel,
    status: "pending",
    createdAt: now,
    expiresAt,
  });

  return {
    ok: true as const,
    sessionId,
    expiresAt,
    adReplayDailyRemaining: PORTAL_AD_REPLAY_DAILY_CAP - usedToday,
  };
}

export async function completePortalAdReplaySessionCore(
  ctx: MutationCtx,
  args: {
    uid: string;
    sessionId: string;
    clientProof?: string;
    now?: number;
  }
) {
  const now = args.now ?? Date.now();
  if (!PORTAL_AD_REPLAY_ENABLED) {
    return { ok: false as const, error: "disabled" as const };
  }

  const session = await ctx.db
    .query("portal_ad_replay_sessions")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
    .unique();

  if (!session) {
    return { ok: false as const, error: "session_not_found" as const };
  }
  if (session.uid !== args.uid) {
    return { ok: false as const, error: "forbidden" as const };
  }
  if (session.status !== "pending") {
    return { ok: false as const, error: "session_not_pending" as const };
  }
  if (session.expiresAt < now) {
    await ctx.db.patch(session._id, { status: "expired", updatedAt: now });
    return { ok: false as const, error: "session_expired" as const };
  }

  const loaded = await loadReplayMatchContext(ctx, args.uid, session.matchGameId);
  if (!loaded.ok) return loaded;
  if (loaded.pm.matchId !== session.matchId) {
    return { ok: false as const, error: "session_mismatch" as const };
  }

  const freshPg = await findPlayerGameByGameId(ctx, session.matchGameId);
  const freshPm = (await ctx.db.get(loaded.pm._id)) ?? loaded.pm;
  const sourceReplayEpoch = resolveSourceReplayEpoch(freshPg, freshPm);

  const windowOk = await assertAdReplayWindowOpen(ctx, freshPm, now);
  if (!windowOk.ok) return windowOk;

  const eligible = await assertPortalAdReplayOfferEligible(ctx, {
    uid: args.uid,
    pm: freshPm,
    matchGameId: session.matchGameId,
  });
  if (!eligible.ok) return eligible;

  const sessionClaim = await findAdReplayClaimForSession(
    ctx,
    args.uid,
    session.matchGameId,
    session.sessionId
  );
  if (
    !sessionClaim &&
    (await hasAdReplayClaimForReplayAttempt(
      ctx,
      args.uid,
      session.matchGameId,
      sourceReplayEpoch
    ))
  ) {
    await ctx.db.patch(session._id, { status: "cancelled", updatedAt: now });
    return { ok: false as const, error: "already_claimed" as const };
  }

  const dayKey = dailyPeriodKey(now);
  const usedToday = await countAdReplayClaimsForDay(ctx, args.uid, dayKey);
  if (usedToday >= PORTAL_AD_REPLAY_DAILY_CAP) {
    return { ok: false as const, error: "daily_cap_reached" as const };
  }

  if (!isPortalAdReplayMockEnabled() && session.channel === "dev") {
    return { ok: false as const, error: "invalid_channel" as const };
  }

  const weekKey = weeklyPeriodKey(now);
  let claimId = sessionClaim?._id;
  let insertedClaim = false;
  if (!claimId) {
    if (
      await hasAdReplayClaimForReplayAttempt(
        ctx,
        args.uid,
        session.matchGameId,
        sourceReplayEpoch
      )
    ) {
      await ctx.db.patch(session._id, { status: "cancelled", updatedAt: now });
      return { ok: false as const, error: "already_claimed" as const };
    }
    claimId = await ctx.db.insert("portal_ad_replay_claims", {
      uid: args.uid,
      matchGameId: session.matchGameId,
      sessionId: session.sessionId,
      channel: session.channel,
      weekKey,
      dayKey,
      replayEpoch: sourceReplayEpoch,
      clientProof: args.clientProof,
      createdAt: now,
    });
    insertedClaim = true;
  }

  const authorized = await authorizeCasualRunReplayCore(ctx, {
    uid: args.uid,
    matchGameId: session.matchGameId,
    adReplayClaimId: claimId,
  });

  if (!authorized.ok) {
    if (insertedClaim) {
      await ctx.db.delete(claimId);
    }
    await ctx.db.patch(session._id, { status: "cancelled", updatedAt: now });
    return { ok: false as const, error: authorized.error };
  }

  await ctx.db.patch(session._id, {
    status: "completed",
    completedAt: now,
    updatedAt: now,
    clientProof: args.clientProof,
  });

  return {
    ok: true as const,
    sessionId: session.sessionId,
    claimId,
    gameId: authorized.gameId,
    templateId: authorized.templateId,
    matchId: authorized.matchId,
    replayEpoch: authorized.replayEpoch,
  };
}
