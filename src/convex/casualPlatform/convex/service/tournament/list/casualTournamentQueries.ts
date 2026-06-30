import { v } from "convex/values";
import {
  getTournamentDefinition,
  isPeriodScopedTournament,
  listPlayCasualTournaments,
  shouldAppearInCasualPlayLobby,
} from "../../../data/casualTournamentConfigs";
import { resolveInstanceWindow } from "../../../data/casualInstanceWindow";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { QueryCtx } from "../../../_generated/server";
import { query } from "../../../_generated/server";
import { authedQuery } from "../../../custom/session";
import {
  activeSeasonWindowForCtx,
  computePeriodInstanceSelfStanding,
  leaderboardRowsFromInstance,
} from "./casualInstanceService";
import { RUN_PLAYER_TOURNAMENT_COMPLETED } from "../join/casualTournamentJoinCore";
import { computeCasualAsyncSessionRank, isCasualAsyncVirtualOpponentUid } from "../settle/casualRunSettlementFill";
import {
  buildCasualAsyncTableSummary,
  buildCasualTriathlonHistoryTableSummary,
} from "../settle/async/casualAsyncTableSummary";
import { isRegisteredCasualGameType } from "../../../data/casualGameRegistry";
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
    runTournamentId?: Id<"casual_run_tournaments">;
  }
) {
  const def = getTournamentDefinition(opts.templateId);
  if (!def) return undefined;

  let pm: Doc<"casual_run_player_matches"> | null = null;
  if (opts.matchGameId?.trim()) {
    const pg = await findPlayerGameByGameId(ctx, opts.matchGameId.trim());
    if (pg && pg.uid === opts.uid) {
      pm = await ctx.db.get(pg.playerMatchId);
    }
  }
  if (!pm && opts.runTournamentId) {
    pm =
      (await ctx.db
        .query("casual_run_player_matches")
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
    runTournamentId: Id<"casual_run_tournaments">;
    uid: string;
  }
): Promise<number | null> {
  const runIdStr = String(opts.runTournamentId);
  const pm = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_run_uid", (q) => q.eq("tournamentId", runIdStr).eq("uid", opts.uid))
    .unique();
  if (!pm || pm.score == null) {
    return null;
  }

  if (isRegisteredCasualGameType(opts.gameType)) {
    const def = getTournamentDefinition(opts.templateId);
    if (def && def.maxPlayers > 1) {
      return computeCasualAsyncSessionRank(ctx, pm.matchId, opts.uid);
    }
  }

  if (pm.status === "settled" && pm.rank != null) {
    return pm.rank;
  }
  return null;
}

/** ???:? `casual_run_player_matches` ???????????? */
async function leaderboardRowsFromRuns(
  ctx: QueryCtx,
  templateId: string,
  limit: number
): Promise<Array<{ rank: number; uid: string; score: number; submittedAt?: number }>> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
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
    const dbRows = await ctx.db.query("casual_tournaments").collect();
    const dbById = new Map(dbRows.map((r) => [r.tournamentId, r]));

    const defMeta = (tournamentId: string) => {
      const d = getTournamentDefinition(tournamentId);
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
      .filter((r) => shouldAppearInCasualPlayLobby(getTournamentDefinition(r.tournamentId)));

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
    const defLb = getTournamentDefinition(tournamentId);
    if (!defLb || defLb.hideLeaderboard) {
      return [];
    }
    const n = Math.min(Math.max(limit ?? 50, 1), 200);
    if (isPeriodScopedTournament(defLb)) {
      let inst: Doc<"casual_tournament_instances"> | null = null;
      if (instanceKey) {
        inst = await ctx.db
          .query("casual_tournament_instances")
          .withIndex("by_template_instanceKey", (q) =>
            q.eq("templateId", tournamentId).eq("instanceKey", instanceKey)
          )
          .first();
      } else {
        const season = await activeSeasonWindowForCtx(ctx);
        const win = resolveInstanceWindow(defLb, Date.now(), season);
        if (win) {
          inst = await ctx.db
            .query("casual_tournament_instances")
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
export const periodInstanceSelfStanding = authedQuery({
  args: {
    tournamentId: v.string(),
  },
  handler: async (ctx, { tournamentId }) => {
    const uid = ctx.uid;
    const defLb = getTournamentDefinition(tournamentId);
    if (!defLb || defLb.hideLeaderboard || !isPeriodScopedTournament(defLb)) {
      return { instanceKey: null, myBestScore: null, myRank: null };
    }
    const season = await activeSeasonWindowForCtx(ctx);
    const win = resolveInstanceWindow(defLb, Date.now(), season);
    if (!win) {
      return { instanceKey: null, myBestScore: null, myRank: null };
    }
    const inst = await ctx.db
      .query("casual_tournament_instances")
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

/** ?? Solitaire??? `casual_run_player_matches`??????????uid ????????? */
export const solitaireSessionStandings = query({
  args: { matchId: v.string() },
  handler: async (ctx, { matchId }) => {
    const rows = await ctx.db
      .query("casual_run_player_matches")
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
 * Game history: completed async runs (`casual_run_player_tournaments`).
 * Daily/period leaderboards are retired; no longer reads
 * `casual_score_tier_pending` or `casual_instance_player_state`.
 */
export const gameHistory = authedQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const uid = ctx.uid;
    const n = Math.min(Math.max(limit ?? 30, 1), 100);

    const pts = await ctx.db
      .query("casual_run_player_tournaments")
      .withIndex("by_uid_template", (q) => q.eq("uid", uid))
      .collect();
    pts.sort((a, b) => (b.createdAt ?? b._creationTime) - (a.createdAt ?? a._creationTime));

    const sliced = pts
      .filter((pt) => pt.status === RUN_PLAYER_TOURNAMENT_COMPLETED)
      .slice(0, n);
    const runRows = await Promise.all(
      sliced.map(async (pt) => {
        const run = await ctx.db.get(pt.tournamentId);
        const def = getTournamentDefinition(pt.templateId);
        const completed = pt.status === RUN_PLAYER_TOURNAMENT_COMPLETED;
        const gameType = def?.gameType ?? run?.gameType ?? "unknown";

        const runIdStr = String(pt.tournamentId);
        const pmForRun = await ctx.db
          .query("casual_run_player_matches")
          .withIndex("by_run_tournament", (q) => q.eq("tournamentId", runIdStr))
          .collect();
        const participantCount = pmForRun.length;

        const rank = completed
          ? await resolveRunHistoryRank(ctx, {
              templateId: pt.templateId,
              gameType,
              runTournamentId: pt.tournamentId,
              uid,
            })
          : null;

        const pendingPruned = prunePendingWalletRewards({
          coins: pt.pendingRunRewards?.coins,
          gems: pt.pendingRunRewards?.gems,
          seasonVoucher: pt.pendingRunRewards?.seasonVoucher,
        });
        const canClaimReward =
          Boolean(completed && pendingPruned && pt.runRewardsClaimedAt == null);

        let periodInstanceKey: string | undefined;
        let periodTournament = false;
        if (run?.instanceId && def) {
          const inst = await ctx.db.get(run.instanceId);
          periodInstanceKey = inst?.instanceKey;
          periodTournament = isPeriodScopedTournament(def);
        }

        const historySortAt = run?.createdAt ?? pt.createdAt;
        const tableSummary = await attachCasualHistoryTableSummary(ctx, {
          uid,
          templateId: pt.templateId,
          gameType,
          runTournamentId: pt.tournamentId,
        });
        return {
          historySortAt,
          entryId: String(pt._id),
          historyRewardKind: "run_pending" as const,
          runTournamentId: String(pt.tournamentId),
          tournamentId: pt.templateId,
          title: def?.title ?? pt.templateId,
          gameType,
          matchType: def?.matchType ?? "unknown",
          score: pt.score ?? null,
          submittedAt: completed ? (pt.updatedAt ?? null) : null,
          entryStatus: completed ? ("submitted" as const) : ("joined" as const),
          runStartedAt: run?.createdAt ?? pt.createdAt,
          rank,
          participantCount,
          canClaimReward,
          pendingRunRewards: pendingPruned ?? null,
          rewardsClaimedAt: pt.runRewardsClaimedAt ?? null,
          periodTournament,
          periodInstanceKey,
          ...(tableSummary ? { tableSummary } : {}),
        };
      })
    );
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
export const listOpenCasualRunAssignments = authedQuery({
  args: {},
  handler: async (ctx) => {
    const uid = ctx.uid;
    const openGames = await ctx.db
      .query("casual_run_player_games")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();
    const assignments = [];
    for (const pg of openGames) {
      if (pg.status !== "open" && pg.status !== "replaying") continue;
      const pm = await ctx.db.get(pg.playerMatchId);
      if (!pm || (pm.status !== "open" && pm.status !== "replaying")) continue;
      assignments.push({
        templateId: pg.templateId,
        gameId: pg.gameId,
        gameType: pg.gameType,
        gameIndex: pg.gameIndex,
        sessionKind: pm.sessionKind,
        matchId: pg.matchId,
        runTournamentId: pm.tournamentId,
        createdAt: pg.createdAt,
      });
    }
    return assignments.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** ???? session:?????? + ?? open ?(?????????) */
export const getTriathlonSessionProgress = authedQuery({
  args: {
    matchGameId: v.string(),
  },
  handler: async (ctx, { matchGameId }) => {
    const uid = ctx.uid;
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
