/**
 * Async multi: join an open unfinished table or signal caller to create one.
 * Sync multi still uses portal_match_queue.
 */
import { v } from "convex/values";

import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import { internalMutation } from "../../../_generated/server";
import {
  effectiveGameSequence,
  getPortalTournamentDefinition,
  isPeriodScopedTournament,
  type PortalTournamentDefinition,
} from "../../../data/portalTournamentConfigs";
import { getOrCreateOpenInstance } from "../list/portalInstanceService";
import {
  insertPlayerSessionForUid,
  type SeedBindingByGameIndex,
} from "../shared/casualSessionOpenCore";
import {
  applyCasualJoinEntryChargeWithInstance,
  assertJoinEntryEligible,
  refundCasualJoinEntryCharge,
  RUN_PLAYER_TOURNAMENT_OPEN,
} from "./casualTournamentJoinCore";
import { assertNoGlobalOpenCasualMatch } from "./casualOpenTableGuard";
import { assertCampaignDailyPlayLimit } from "./campaignDailyPlayLimit";
import { assertPortalDailyPlayLimit } from "./portalDailyPlayLimit";
import {
  matchPartitionKey,
} from "../../economy/resolveEconomyScope";
import {
  entrySnapshotFromDef,
  loadLobbyRewardsOverride,
} from "../../lobby/lobbyOfferingRewards";
import {
  joinContextFromPlayContext,
  joinContextRowFields,
  lobbyIdFromRun,
  playContextInputValidator,
  resolveWalletScopeFromRun,
  type PlayContext,
} from "../../../data/portalPlayContext";
import { isCasualAsyncVirtualOpponentUid } from "../settle/async/casualAsyncTypes";
import {
  isAsyncMatchJoinable,
  resolveAsyncMatchEffectiveHumans,
} from "./casualAsyncMatchJoinCore";

type JoinChargeMeta = {
  vouchersCharged?: number;
  coinsCharged?: number;
  gemsCharged?: number;
  scopeKey?: string;
  playScopeKey?: string;
};

function joinChargeForStorage(
  byUid: Record<string, JoinChargeMeta>
): Record<string, JoinChargeMeta> {
  return Object.fromEntries(
    Object.entries(byUid).map(([uid, m]) => [
      uid,
      {
        vouchersCharged: m.vouchersCharged,
        coinsCharged: m.coinsCharged,
        gemsCharged: m.gemsCharged,
      },
    ])
  );
}

async function loadSeedBindingsFromMatch(
  ctx: MutationCtx,
  matchId: string,
  def: PortalTournamentDefinition
): Promise<SeedBindingByGameIndex | null> {
  const sequence = effectiveGameSequence(def);
  const seedBindingsByIndex: SeedBindingByGameIndex = {};
  const seats = await ctx.db
    .query("portal_run_player_matches")
    .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
    .collect();
  const humanSeat = seats.find((s) => !isCasualAsyncVirtualOpponentUid(s.uid));
  if (!humanSeat) return null;

  const games = await ctx.db
    .query("portal_run_player_games")
    .withIndex("by_playerMatch_gameIndex", (q) => q.eq("playerMatchId", humanSeat._id))
    .collect();

  for (let i = 0; i < sequence.length; i++) {
    const g = games.find((row) => row.gameIndex === i);
    if (!g?.seedBinding) return null;
    seedBindingsByIndex[String(i)] = g.seedBinding;
  }
  return seedBindingsByIndex;
}

/** Close async join window (full table or human submit/finish). */
export async function closeAsyncMatchJoin(
  ctx: MutationCtx,
  matchId: string,
  now = Date.now()
): Promise<void> {
  const match = await ctx.db.get(matchId as Id<"portal_run_matches">);
  if (!match || match.joinOpen !== true) return;
  await ctx.db.patch(match._id, { joinOpen: false, updatedAt: now });
}

export const closeAsyncMatchJoinOnHumanSubmit = internalMutation({
  args: { matchId: v.string() },
  handler: async (ctx, { matchId }) => {
    await closeAsyncMatchJoin(ctx, matchId);
    return { ok: true as const };
  },
});

/**
 * Try to seat uid on an existing async open table.
 * Returns joined:false when caller should create a new match.
 */
export const tryJoinExistingAsyncMatch = internalMutation({
  args: {
    uid: v.string(),
    templateId: v.string(),
    effectiveHumans: v.number(),
    playContext: playContextInputValidator,
    playEntryLane: v.optional(v.union(v.literal("ad"), v.literal("ticket"))),
    skipEntryCharge: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { uid, templateId, playContext: playContextArg, playEntryLane } = args;
    const playContext: PlayContext = playContextArg;
    const lobbyId = lobbyIdFromRun(playContext);
    const campaignId = playContext.contextKind === "campaign" ? playContext.contextId : undefined;
    const partnerId = playContext.contextSnapshot?.partnerId;
    const maxPlaysPerDay = playContext.contextSnapshot?.maxPlaysPerDay;
    const dayTimezone = playContext.contextSnapshot?.dayTimezone;
    const def = getPortalTournamentDefinition(templateId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" as const };
    }

    const openGuard = await assertNoGlobalOpenCasualMatch(ctx, [uid]);
    if (!openGuard.ok) {
      return { ok: false as const, error: openGuard.error, uid: openGuard.uid };
    }

    const now = Date.now();
    const preview = await assertJoinEntryEligible(ctx, uid, templateId, now, {
      partnerId,
      lobbyId,
    });
    if (!preview.ok) {
      return { ok: false as const, error: preview.error };
    }

    if (campaignId && maxPlaysPerDay != null && maxPlaysPerDay >= 1) {
      const daily = await assertCampaignDailyPlayLimit(ctx, {
        uid,
        campaignId,
        maxPlaysPerDay,
        ...(dayTimezone ? { dayTimezone } : {}),
      });
      if (!daily.ok) {
        return { ok: false as const, error: daily.error };
      }
    } else if (!campaignId) {
      const daily = await assertPortalDailyPlayLimit(ctx, {
        uid,
        templateId,
        ...(lobbyId ? { lobbyId } : {}),
        ...(dayTimezone ? { dayTimezone } : {}),
        ...(playEntryLane ? { entryLane: playEntryLane } : {}),
      });
      if (!daily.ok) {
        return { ok: false as const, error: daily.error };
      }
    }

    const resolvedPartnerId = partnerId ?? 0;
    const partitionKey = matchPartitionKey(resolvedPartnerId, templateId);
    const candidates = await ctx.db
      .query("portal_run_matches")
      .withIndex("by_partition_joinOpen", (q) =>
        q.eq("matchPartitionKey", partitionKey).eq("joinOpen", true)
      )
      .take(48);

    const sorted = [...candidates].sort((a, b) => a.createdAt - b.createdAt);

    for (const match of sorted) {
      const seats = await ctx.db
        .query("portal_run_player_matches")
        .withIndex("by_matchId", (q) => q.eq("matchId", String(match._id)))
        .collect();

      if (
        !isAsyncMatchJoinable({
          match,
          humanSeats: seats,
          templateId,
        })
      ) {
        if (
          match.joinOpen === true &&
          (match.completed ||
            seats.some(
              (s) =>
                !isCasualAsyncVirtualOpponentUid(s.uid) &&
                (s.status === "finished" ||
                  s.status === "confirmed" ||
                  s.status === "settled")
            ) ||
            (match.humanPlayerCount ?? 0) >= match.maxPlayers)
        ) {
          await closeAsyncMatchJoin(ctx, String(match._id), now);
        }
        continue;
      }

      if (seats.some((s) => s.uid === uid)) {
        continue;
      }

      const run = await ctx.db.get(match.tournamentId);
      if (!run) continue;
      if (run.playScopeKey !== playContext.playScopeKey) continue;

      const seedBindingsByIndex = await loadSeedBindingsFromMatch(ctx, String(match._id), def);
      if (!seedBindingsByIndex) {
        await closeAsyncMatchJoin(ctx, String(match._id), now);
        continue;
      }

      const instanceId = await getOrCreateOpenInstance(ctx, { templateId, def, now });
      if (instanceId === null && isPeriodScopedTournament(def)) {
        return { ok: false as const, error: "period_unavailable" as const };
      }

      const walletScope = await resolveWalletScopeFromRun(ctx, playContext);
      const ch = await applyCasualJoinEntryChargeWithInstance(
        ctx,
        uid,
        templateId,
        def,
        instanceId,
        {
          scopeKey: walletScope.scopeKey,
          lobbyId: walletScope.lobbyId,
          skipEntryCharge: args.skipEntryCharge === true,
        }
      );
      if (!ch.ok) {
        return { ok: false as const, error: ch.error };
      }

      const chargeMeta: JoinChargeMeta = {
        vouchersCharged: ch.vouchersCharged,
        coinsCharged: ch.coinsCharged,
        gemsCharged: ch.gemsCharged,
        scopeKey: walletScope.scopeKey,
        playScopeKey: playContext.playScopeKey,
      };

      const ptId = await (async () => {
        let joinCtx = joinContextFromPlayContext(playContext);
        if (lobbyId && !joinCtx.joinSnapshot?.rewardsOverride) {
          const rewardsOverride = await loadLobbyRewardsOverride(ctx, lobbyId, templateId);
          if (rewardsOverride) {
            joinCtx = {
              ...joinCtx,
              joinSnapshot: {
                ...joinCtx.joinSnapshot,
                rewardsOverride,
              },
            };
          }
        }
        const entrySnap = entrySnapshotFromDef(def);
        return await ctx.db.insert("portal_run_player_tournaments", {
          uid,
          tournamentId: match.tournamentId,
          templateId,
          score: 0,
          status: RUN_PLAYER_TOURNAMENT_OPEN,
          createdAt: now,
          updatedAt: now,
          ...joinContextRowFields(joinCtx),
          entrySnapshot: entrySnap,
        });
      })().catch(async (err) => {
        console.error("[casual] tryJoinExistingAsyncMatch pt insert failed", {
          templateId,
          uid,
          matchId: String(match._id),
          err,
        });
        await refundCasualJoinEntryCharge(ctx, uid, chargeMeta);
        return null;
      });
      if (!ptId) {
        return { ok: false as const, error: "join_failed" as const };
      }

      const matchIdStr = String(match._id);
      let opened: Awaited<ReturnType<typeof insertPlayerSessionForUid>>;
      try {
        opened = await insertPlayerSessionForUid(ctx, {
          matchId: matchIdStr,
          runTournamentId: String(match.tournamentId),
          templateId,
          def,
          uid,
          seedBindingsByIndex,
          now,
        });
      } catch (err) {
        console.error("[casual] tryJoinExistingAsyncMatch seat insert failed", {
          templateId,
          uid,
          matchId: matchIdStr,
          err,
        });
        await ctx.db.delete(ptId);
        await refundCasualJoinEntryCharge(ctx, uid, chargeMeta);
        return { ok: false as const, error: "join_failed" as const };
      }

      // Re-count after insert to catch last-seat races.
      const seatsAfter = await ctx.db
        .query("portal_run_player_matches")
        .withIndex("by_matchId", (q) => q.eq("matchId", matchIdStr))
        .collect();
      const humanAfter = seatsAfter.filter(
        (s) => !isCasualAsyncVirtualOpponentUid(s.uid)
      );
      if (humanAfter.length > match.maxPlayers) {
        const games = await ctx.db
          .query("portal_run_player_games")
          .withIndex("by_playerMatch_gameIndex", (q) =>
            q.eq("playerMatchId", opened.playerMatchId)
          )
          .collect();
        for (const g of games) await ctx.db.delete(g._id);
        await ctx.db.delete(opened.playerMatchId);
        await ctx.db.delete(ptId);
        await refundCasualJoinEntryCharge(ctx, uid, chargeMeta);
        await closeAsyncMatchJoin(ctx, matchIdStr, now);
        continue;
      }

      const nextHumans = humanAfter.length;
      const joinChargeByUid = {
        ...(match.joinChargeByUid ?? {}),
        ...joinChargeForStorage({ [uid]: chargeMeta }),
      };
      const full = nextHumans >= match.maxPlayers;
      await ctx.db.patch(match._id, {
        humanPlayerCount: nextHumans,
        minPlayers: Math.min(match.minPlayers, nextHumans),
        joinChargeByUid,
        joinOpen: full ? false : true,
        updatedAt: now,
      });

      await ctx.runMutation(
        internal.service.task.casualTaskService.notifyTournamentJoined,
        { uid }
      );

      return {
        ok: true as const,
        joined: true as const,
        queued: false as const,
        templateId,
        gameId: opened.openGameId,
        matchId: matchIdStr,
        runTournamentId: String(match.tournamentId),
        vouchersCharged: ch.vouchersCharged,
        coinsCharged: ch.coinsCharged,
        gemsCharged: ch.gemsCharged,
        activityIds: ch.activityIds,
      };
    }

    return {
      ok: true as const,
      joined: false as const,
      effectiveHumans: resolveAsyncMatchEffectiveHumans(args.effectiveHumans),
    };
  },
});

/** Charge + claim payload for async create (no queue row). */
export const chargeAsyncMultiCreate = internalMutation({
  args: {
    uid: v.string(),
    templateId: v.string(),
    playContext: playContextInputValidator,
    playEntryLane: v.optional(v.union(v.literal("ad"), v.literal("ticket"))),
    skipEntryCharge: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { uid, templateId, playContext: playContextArg, playEntryLane } = args;
    const playContext: PlayContext = playContextArg;
    const lobbyId = lobbyIdFromRun(playContext);
    const campaignId = playContext.contextKind === "campaign" ? playContext.contextId : undefined;
    const partnerId = playContext.contextSnapshot?.partnerId;
    const maxPlaysPerDay = playContext.contextSnapshot?.maxPlaysPerDay;
    const dayTimezone = playContext.contextSnapshot?.dayTimezone;
    const def = getPortalTournamentDefinition(templateId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" as const };
    }

    const openGuard = await assertNoGlobalOpenCasualMatch(ctx, [uid]);
    if (!openGuard.ok) {
      return { ok: false as const, error: openGuard.error, uid: openGuard.uid };
    }

    const now = Date.now();
    const preview = await assertJoinEntryEligible(ctx, uid, templateId, now, {
      partnerId,
      lobbyId,
    });
    if (!preview.ok) {
      return { ok: false as const, error: preview.error };
    }

    if (campaignId && maxPlaysPerDay != null && maxPlaysPerDay >= 1) {
      const daily = await assertCampaignDailyPlayLimit(ctx, {
        uid,
        campaignId,
        maxPlaysPerDay,
        ...(dayTimezone ? { dayTimezone } : {}),
      });
      if (!daily.ok) {
        return { ok: false as const, error: daily.error };
      }
    } else if (!campaignId) {
      const daily = await assertPortalDailyPlayLimit(ctx, {
        uid,
        templateId,
        ...(lobbyId ? { lobbyId } : {}),
        ...(dayTimezone ? { dayTimezone } : {}),
        ...(playEntryLane ? { entryLane: playEntryLane } : {}),
      });
      if (!daily.ok) {
        return { ok: false as const, error: daily.error };
      }
    }

    const instanceId = await getOrCreateOpenInstance(ctx, { templateId, def, now });
    if (instanceId === null && isPeriodScopedTournament(def)) {
      return { ok: false as const, error: "period_unavailable" as const };
    }

    const resolvedPartnerId = partnerId ?? 0;
    const walletScope = await resolveWalletScopeFromRun(ctx, playContext);
    const ch = await applyCasualJoinEntryChargeWithInstance(
      ctx,
      uid,
      templateId,
      def,
      instanceId,
      {
        scopeKey: walletScope.scopeKey,
        lobbyId: walletScope.lobbyId,
        skipEntryCharge: args.skipEntryCharge === true,
      }
    );
    if (!ch.ok) {
      return { ok: false as const, error: ch.error };
    }

    return {
      ok: true as const,
      uids: [uid],
      queueRowIds: [] as Id<"portal_match_queue">[],
      joinChargeByUid: {
        [uid]: {
          vouchersCharged: ch.vouchersCharged,
          coinsCharged: ch.coinsCharged,
          gemsCharged: ch.gemsCharged,
          scopeKey: walletScope.scopeKey,
          playScopeKey: playContext.playScopeKey,
        },
      },
      instanceId: instanceId ?? undefined,
      activityIds: ch.activityIds,
      playContext,
      matchPartitionKey: matchPartitionKey(resolvedPartnerId, templateId),
    };
  },
});
