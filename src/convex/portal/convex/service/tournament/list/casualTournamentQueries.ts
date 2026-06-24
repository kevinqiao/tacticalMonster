import { v } from "convex/values";
import {
  getPortalTournamentDefinition,
  isPeriodScopedTournament,
  listPlayCasualTournaments,
  shouldAppearInCasualPlayLobby,
} from "../../../data/portalTournamentConfigs";
import { resolveInstanceWindow } from "../../../data/portalInstanceWindow";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { QueryCtx } from "../../../_generated/server";
import { query } from "../../../_generated/server";
import {
  activeSeasonWindowForCtx,
  computePeriodInstanceSelfStanding,
  leaderboardRowsFromInstance,
} from "./casualInstanceService";
import { RUN_PLAYER_TOURNAMENT_COMPLETED } from "../join/casualTournamentJoinCore";
import { isHumanSubmittedStatus } from "../shared/casualPlayerMatchStatus";
import { computeCasualAsyncSessionRank, isCasualAsyncVirtualOpponentUid } from "../settle/casualRunSettlementFill";
import {
  buildCasualAsyncTableSummary,
  buildCasualTriathlonHistoryTableSummary,
} from "../settle/async/casualAsyncTableSummary";
import { isRegisteredPortalGameType } from "../../../data/portalGameRegistry";
import { getPoolMetaByVersion } from "../../../service/seedPool/seedPoolStore";
import { prunePendingWalletRewards } from "../settle/casualRunScoreEffects";
import {
  findPlayerGameByGameId,
  listPlayerGamesForSeat,
} from "../shared/casualPlayerGameTypes";

async function attachCasualHistoryTableSummary(
  ctx: QueryCtx,
  opts: {
    uid: string;
    templateId: string;
    gameType: string;
    matchGameId?: string;
    runTournamentId?: Id<"portal_run_tournaments">;
  }
) {
  const def = getPortalTournamentDefinition(opts.templateId);
  if (!def) return undefined;

  let pm: Doc<"portal_run_player_matches"> | null = null;
  if (opts.matchGameId?.trim()) {
    const pg = await findPlayerGameByGameId(ctx, opts.matchGameId.trim());
    if (pg && pg.uid === opts.uid) {
      pm = await ctx.db.get(pg.playerMatchId);
    }
  }
  if (!pm && opts.runTournamentId) {
    pm =
      (await ctx.db
        .query("portal_run_player_matches")
        .withIndex("by_run_uid", (q) =>
          q.eq("tournamentId", String(opts.runTournamentId)).eq("uid", opts.uid)
        )
        .unique()) ?? null;
  }
  if (!pm) return undefined;

  if (def.gameType === "triathlon") {
    const summary = await buildCasualTriathlonHistoryTableSummary(ctx, {
      templateId: opts.templateId,
      uid: opts.uid,
      maxPlayers: Math.max(1, def.maxPlayers),
      matchId: pm.matchId,
    });
    if (!summary?.triathlonLegs?.some((leg) => leg.rows.some((r) => r.watchContext))) {
      return undefined;
    }
    return {
      maxPlayers: summary.maxPlayers,
      rows: summary.rows,
      triathlonLegs: summary.triathlonLegs,
      isBoardStable: true as const,
    };
  }

  if (
    opts.gameType !== "match_3" &&
    opts.gameType !== "solitaire" &&
    opts.gameType !== "block_blast" &&
    opts.gameType !== "yatz"
  ) {
    return undefined;
  }

  const summary = await buildCasualAsyncTableSummary(ctx, {
    templateId: opts.templateId,
    uid: opts.uid,
    maxPlayers: Math.max(1, def.maxPlayers),
    matchId: pm.matchId,
    historical: true,
  });
  if (!summary?.rows.some((r) => r.watchContext)) return undefined;
  return {
    maxPlayers: summary.maxPlayers,
    rows: summary.rows,
    isBoardStable: true as const,
  };
}
async function resolveRunHistoryRank(
  ctx: QueryCtx,
  opts: {
    templateId: string;
    gameType: string;
    runTournamentId: Id<"portal_run_tournaments">;
    uid: string;
  }
): Promise<number | null> {
  const runIdStr = String(opts.runTournamentId);
  const pm = await ctx.db
    .query("portal_run_player_matches")
    .withIndex("by_run_uid", (q) => q.eq("tournamentId", runIdStr).eq("uid", opts.uid))
    .unique();
  if (!pm || pm.score == null) {
    return null;
  }

  if (isRegisteredPortalGameType(opts.gameType)) {
    const def = getPortalTournamentDefinition(opts.templateId);
    if (def && def.maxPlayers > 1) {
      return computeCasualAsyncSessionRank(ctx, pm.matchId, opts.uid);
    }
  }

  if (pm.status === "settled" && pm.rank != null) {
    return pm.rank;
  }
  return null;
}

/** ???:? `portal_run_player_matches` ???????????? */
async function leaderboardRowsFromRuns(
  ctx: QueryCtx,
  templateId: string,
  limit: number
): Promise<Array<{ rank: number; uid: string; score: number; submittedAt?: number }>> {
  const rows = await ctx.db
    .query("portal_run_player_matches")
    .withIndex("by_templateId", (q) => q.eq("templateId", templateId))
    .collect();
  const bestByUid = new Map<string, { score: number; submittedAt?: number }>();
  for (const r of rows) {
    if (r.status !== "settled" || r.score == null) continue;
    const prev = bestByUid.get(r.uid);
    if (!prev || r.score > prev.score) {
      bestByUid.set(r.uid, {
        score: r.score,
        submittedAt: r.updatedAt ?? r.finishedAt,
      });
    }
  }
  const sorted = [...bestByUid.entries()]
    .map(([uid, v]) => ({ uid, score: v.score, submittedAt: v.submittedAt }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.uid.localeCompare(b.uid);
    })
    .slice(0, limit);
  return sorted.map((v, i) => ({
    rank: i + 1,
    uid: v.uid,
    score: v.score,
    submittedAt: v.submittedAt,
  }));
}

export const listTournaments = query({
  args: {},
  handler: async (ctx) => {
    const dbRows = await ctx.db.query("portal_tournaments").collect();
    const dbById = new Map(dbRows.map((r) => [r.tournamentId, r]));

    const defMeta = (tournamentId: string) => {
      const d = getPortalTournamentDefinition(tournamentId);
      return d
        ? {
            instanceScope: d.instanceScope ?? "single_match",
            scoreAggregation: d.scoreAggregation ?? "single_match",
            entryBilling: d.entryBilling ?? "per_match",
          }
        : {};
    };

    /** ????????????? Play ???????DB ??? title/status????????? */
    const staticPlay = listPlayCasualTournaments();
    const staticIds = new Set(staticPlay.map((s) => s.tournamentId));
    const fromStatic = staticPlay.map((s) => {
      const db = dbById.get(s.tournamentId);
      return {
        tournamentId: s.tournamentId,
        title: db?.title ?? s.title,
        gameType: s.gameType,
        matchType: s.matchType,
        status: db?.status ?? s.status,
        ...defMeta(s.tournamentId),
      };
    });

    const orphans = dbRows
      .filter((r) => !staticIds.has(r.tournamentId))
      .map((r) => ({
        tournamentId: r.tournamentId,
        title: r.title,
        gameType: r.gameType,
        matchType: r.matchType,
        status: r.status,
        ...defMeta(r.tournamentId),
      }))
      .filter((r) => shouldAppearInCasualPlayLobby(getPortalTournamentDefinition(r.tournamentId)));

    return [...fromStatic, ...orphans];
  },
});

export const leaderboard = query({
  args: {
    tournamentId: v.string(),
    limit: v.optional(v.number()),
    /** ??????????????????????????????? */
    instanceKey: v.optional(v.string()),
  },
  handler: async (ctx, { tournamentId, limit, instanceKey }) => {
    const defLb = getPortalTournamentDefinition(tournamentId);
    if (!defLb || defLb.hideLeaderboard) {
      return [];
    }
    const n = Math.min(Math.max(limit ?? 50, 1), 200);
    if (isPeriodScopedTournament(defLb)) {
      let inst: Doc<"portal_tournament_instances"> | null = null;
      if (instanceKey) {
        inst = await ctx.db
          .query("portal_tournament_instances")
          .withIndex("by_template_instanceKey", (q) =>
            q.eq("templateId", tournamentId).eq("instanceKey", instanceKey)
          )
          .first();
      } else {
        const season = await activeSeasonWindowForCtx(ctx);
        const win = resolveInstanceWindow(defLb, Date.now(), season);
        if (win) {
          inst = await ctx.db
            .query("portal_tournament_instances")
            .withIndex("by_template_instanceKey", (q) =>
              q.eq("templateId", tournamentId).eq("instanceKey", win.instanceKey)
            )
            .first();
        }
      }
      if (inst) {
        const rows = await leaderboardRowsFromInstance(ctx, inst._id, n, {
          allowClosed: Boolean(instanceKey),
        });
        return rows.map((r) => ({
          rank: r.rank,
          uid: r.uid,
          score: r.score,
          submittedAt: r.submittedAt,
        }));
      }
      return [];
    }
    const rows = await leaderboardRowsFromRuns(ctx, tournamentId, n);
    return rows.map((r) => ({
      rank: r.rank,
      uid: r.uid,
      score: r.score,
      submittedAt: r.submittedAt,
    }));
  },
});

/** ?????????????????? `leaderboard` ????????? Top N ??????? */
export const periodInstanceSelfStanding = query({
  args: {
    tournamentId: v.string(),
    uid: v.string(),
  },
  handler: async (ctx, { tournamentId, uid }) => {
    const defLb = getPortalTournamentDefinition(tournamentId);
    if (!defLb || defLb.hideLeaderboard || !isPeriodScopedTournament(defLb)) {
      return { instanceKey: null, myBestScore: null, myRank: null };
    }
    const season = await activeSeasonWindowForCtx(ctx);
    const win = resolveInstanceWindow(defLb, Date.now(), season);
    if (!win) {
      return { instanceKey: null, myBestScore: null, myRank: null };
    }
    const inst = await ctx.db
      .query("portal_tournament_instances")
      .withIndex("by_template_instanceKey", (q) =>
        q.eq("templateId", tournamentId).eq("instanceKey", win.instanceKey)
      )
      .first();
    if (!inst) {
      return { instanceKey: win.instanceKey, myBestScore: null, myRank: null };
    }
    const self = await computePeriodInstanceSelfStanding(ctx, inst._id, uid);
    return {
      instanceKey: inst.instanceKey,
      myBestScore: self?.score ?? null,
      myRank: self?.rank ?? null,
    };
  },
});

/** ?? Solitaire??? `portal_run_player_matches`??????????uid ????????? */
export const solitaireSessionStandings = query({
  args: { matchId: v.string() },
  handler: async (ctx, { matchId }) => {
    const rows = await ctx.db
      .query("portal_run_player_matches")
      .withIndex("by_match_uid", (q) => q.eq("matchId", matchId))
      .collect();
    const withScore = rows
      .filter((r) => r.score != null)
      .map((r) => ({
        uid: r.uid,
        score: r.score as number,
        submittedAt: r.updatedAt,
        isVirtual: isCasualAsyncVirtualOpponentUid(r.uid),
      }));
    withScore.sort((a, b) => b.score - a.score);
    return withScore.map((e, i) => ({
      rank: i + 1,
      uid: e.uid,
      score: e.score,
      submittedAt: e.submittedAt,
      isVirtual: e.isVirtual,
    }));
  },
});

/**
 * Game history: completed runs + human-submitted runs awaiting settlement.
 * Unsettled rows stay in the reactive query until `RUN_PLAYER_TOURNAMENT_COMPLETED`.
 */
export const gameHistory = query({
  args: {
    uid: v.string(),
    gameType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { uid, gameType, limit }) => {
    const n = Math.min(Math.max(limit ?? 30, 1), 100);

    const pts = await ctx.db
      .query("portal_run_player_tournaments")
      .withIndex("by_uid_template", (q) => q.eq("uid", uid))
      .collect();
    pts.sort((a, b) => b.updatedAt - a.updatedAt);

    const eligible = [];
    for (const pt of pts) {
      if (pt.status === RUN_PLAYER_TOURNAMENT_COMPLETED) {
        eligible.push(pt);
        continue;
      }
      const runIdStr = String(pt.tournamentId);
      const pm = await ctx.db
        .query("portal_run_player_matches")
        .withIndex("by_run_tournament", (q) => q.eq("tournamentId", runIdStr))
        .filter((q) => q.eq(q.field("uid"), uid))
        .first();
      if (
        pm &&
        isHumanSubmittedStatus(pm.status) &&
        pm.score != null &&
        Number.isFinite(pm.score)
      ) {
        eligible.push(pt);
      }
    }

    const sliced = eligible.slice(0, n);
    const runRows = (await Promise.all(sliced.map(async (pt) => {
        const run = await ctx.db.get(pt.tournamentId);
        const def = getPortalTournamentDefinition(pt.templateId);
        if (gameType && def?.gameType !== gameType) return null;
        const completed = pt.status === RUN_PLAYER_TOURNAMENT_COMPLETED;
        const resolvedGameType = def?.gameType ?? run?.gameType ?? "unknown";

        const runIdStr = String(pt.tournamentId);
        const pmForRun = await ctx.db
          .query("portal_run_player_matches")
          .withIndex("by_run_tournament", (q) => q.eq("tournamentId", runIdStr))
          .collect();
        const participantCount = pmForRun.length;
        const selfPm = pmForRun.find((p) => p.uid === uid);
        const displayScore =
          pt.score != null && pt.score > 0
            ? pt.score
            : selfPm?.score != null
              ? selfPm.score
              : pt.score ?? null;

        const rank = completed
          ? await resolveRunHistoryRank(ctx, {
              templateId: pt.templateId,
              gameType: resolvedGameType,
              runTournamentId: pt.tournamentId,
              uid,
            })
          : null;

        let periodInstanceKey: string | undefined;
        let periodTournament = false;

        const historySortAt = run?.createdAt ?? pt.createdAt;
        const tableSummary = completed
          ? await attachCasualHistoryTableSummary(ctx, {
              uid,
              templateId: pt.templateId,
              gameType: resolvedGameType,
              runTournamentId: pt.tournamentId,
            })
          : undefined;
        return {
          historySortAt,
          entryId: String(pt._id),
          historyRewardKind: "run_pending" as const,
          runTournamentId: String(pt.tournamentId),
          tournamentId: pt.templateId,
          title: def?.title ?? pt.templateId,
          gameType: resolvedGameType,
          matchType: def?.matchType ?? "unknown",
          score: displayScore,
          submittedAt: completed
            ? (pt.updatedAt ?? null)
            : (selfPm?.finishedAt ?? selfPm?.updatedAt ?? null),
          entryStatus: completed ? ("submitted" as const) : ("joined" as const),
          settlementPending: !completed,
          runStartedAt: run?.createdAt ?? pt.createdAt,
          rank,
          participantCount,
          pointDelta: pt.pointDelta ?? null,
          weeklyPointsAfter: pt.weeklyPointsAfter ?? null,
          periodTournament,
          periodInstanceKey,
          ...(tableSummary ? { tableSummary } : {}),
        };
      })
    )).filter((r): r is NonNullable<typeof r> => r != null);
    const filteredRunRows = runRows.filter((r) => !r.periodTournament);

    const merged = filteredRunRows.sort((a, b) => {
      const d = b.historySortAt - a.historySortAt;
      if (d !== 0) return d;
      return String(a.entryId).localeCompare(String(b.entryId));
    });
    return merged.map(({ historySortAt: _historySortAt, ...row }) => row);
  },
});

/** ???????:??????? `open` ?? assignment */
export const listOpenCasualRunAssignments = query({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const openGames = await ctx.db
      .query("portal_run_player_games")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();
    const assignments = [];
    for (const pg of openGames) {
      if (pg.status !== "open" && pg.status !== "replaying") continue;
      const pm = await ctx.db.get(pg.playerMatchId);
      if (!pm || (pm.status !== "open" && pm.status !== "replaying")) continue;
      const poolMeta = isRegisteredPortalGameType(pg.gameType)
        ? await getPoolMetaByVersion(ctx.db, pg.gameType, pg.seedBinding.poolVersion)
        : null;
      const matchTimeLimitSec = poolMeta?.matchTimeLimitSec ?? 300;
      const dueAt = pg.createdAt + matchTimeLimitSec * 1000;
      assignments.push({
        templateId: pg.templateId,
        gameId: pg.gameId,
        gameType: pg.gameType,
        gameIndex: pg.gameIndex,
        sessionKind: pm.sessionKind,
        matchId: pg.matchId,
        runTournamentId: pm.tournamentId,
        createdAt: pg.createdAt,
        dueAt,
      });
    }
    return assignments.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** ???? session:?????? + ?? open ?(?????????) */
export const getTriathlonSessionProgress = query({
  args: {
    uid: v.string(),
    matchGameId: v.string(),
  },
  handler: async (ctx, { uid, matchGameId }) => {
    const pg = await findPlayerGameByGameId(ctx, matchGameId);
    if (!pg || pg.uid !== uid) {
      return null;
    }
    const pm = await ctx.db.get(pg.playerMatchId);
    if (!pm || pm.sessionKind !== "triathlon") {
      return null;
    }
    const games = await listPlayerGamesForSeat(ctx, pm._id);
    const completedLegs = games
      .filter(
        (g) =>
          (g.status === "finished" ||
            g.status === "confirmed" ||
            g.status === "settled") &&
          typeof g.score === "number" &&
          Number.isFinite(g.score)
      )
      .sort((a, b) => a.gameIndex - b.gameIndex)
      .map((g) => ({
        gameIndex: g.gameIndex,
        gameType: g.gameType,
        score: g.score as number,
      }));
    const openLeg = games.find((g) => g.status === "open" || g.status === "replaying") ?? pg;
    return {
      templateId: pm.templateId,
      matchId: pm.matchId,
      completedLegs,
      openLeg: {
        gameId: openLeg.gameId,
        gameIndex: openLeg.gameIndex,
        gameType: openLeg.gameType,
      },
    };
  },
});
