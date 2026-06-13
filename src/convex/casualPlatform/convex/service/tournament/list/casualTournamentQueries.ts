import { v } from "convex/values";
import {
  getTournamentDefinition,
  isPeriodScopedTournament,
  listPlayCasualTournaments,
} from "../../../data/casualTournamentConfigs";
import { resolveInstanceWindow } from "../../../data/casualInstanceWindow";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { QueryCtx } from "../../../_generated/server";
import { query } from "../../../_generated/server";
import {
  activeSeasonWindowForCtx,
  computePeriodInstanceSelfStanding,
  leaderboardRowsFromInstance,
} from "./casualInstanceService";
import { RUN_PLAYER_TOURNAMENT_COMPLETED } from "../join/casualTournamentJoinCore";
import { computeCasualAsyncSessionRank, isCasualAsyncVirtualOpponentUid } from "../settle/casualRunSettlementFill";
import { isRegisteredCasualGameType } from "../../../data/casualGameRegistry";
import { prunePendingWalletRewards } from "../settle/casualRunScoreEffects";

type Match3HistoryWatchContext = {
  kind: "recorded";
  gameId: string;
};

function match3SelfRecordedWatchContext(
  gameType: string,
  gameId: string | undefined
): Match3HistoryWatchContext | undefined {
  if (gameType !== "match_3" || !gameId?.trim()) return undefined;
  return { kind: "recorded", gameId: gameId.trim() };
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

/** 模板榜：从 `casual_run_player_matches` 聚合每人最高「已结算」分 */
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

    /** ä¸Žã€Œåº“é‡Œæœ‰ç§å­ã€è§£è€¦ï¼šé™æ€ Play åˆ—è¡¨å§‹ç»ˆå®Œæ•´ï¼ŒDB ä»…è¦†ç›– title/statusï¼ˆè¿è¥æ”¹è¡¨æ—¶ç”Ÿæ•ˆï¼‰ */
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
      }));

    return [...fromStatic, ...orphans].filter(
      (r) => getTournamentDefinition(r.tournamentId)?.matchType !== "season_challenge"
    );
  },
});

export const leaderboard = query({
  args: {
    tournamentId: v.string(),
    limit: v.optional(v.number()),
    /** æŒ‡å®šåŽ†å²æ¡¶ï¼›ç¼ºçœä¸ºå½“å‰è§£æžåˆ°çš„å¼€æ”¾æ¡¶ï¼ˆå·²å…³é—­æ¡¶å¯æŸ¥æ¦œæ—¶ä¼ æ­¤å‚ï¼‰ */
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

/** å½“å‰å‘¨æœŸæ¡¶å†…ã€Œæˆ‘çš„ã€èšåˆåˆ†ä¸Žåæ¬¡ï¼ˆä¸Ž `leaderboard` åŒå®žä¾‹è§£æžï¼›ä¸ä¾èµ– Top N æ˜¯å¦å«æœ¬äººï¼‰ã€‚ */
export const periodInstanceSelfStanding = query({
  args: {
    tournamentId: v.string(),
    uid: v.string(),
  },
  handler: async (ctx, { tournamentId, uid }) => {
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

/** å•åœº Solitaireï¼šä»…æŸ¥ `casual_run_player_matches`ï¼ˆæœºå™¨äººä¸ŽçœŸäººåŒè¡¨ï¼Œuid å‰ç¼€åŒºåˆ†è™šæ‹Ÿå¯¹æ‰‹ï¼‰ */
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
 * æ¸¸æˆåŽ†å²ï¼šéžå‘¨æœŸåž‹å¼‚æ­¥ run ä¸€æ¡ `casual_run_player_tournaments`ï¼›
 * å‘¨æœŸåž‹åˆ†æ¡£é¢„å‘å¥–ï¼šåŒä¸€å±€ç»“ç®—å†™å…¥çš„å¤šæ¡ `casual_score_tier_pending`ï¼ˆåŒ instance+run+matchGame+createdAtï¼‰åˆå¹¶ä¸ºä¸€æ¡ï¼›
 * å‘¨æœŸæ¡¶å…³æ¡¶åŽçš„ base/åæ¬¡å¥–å¹¶å…¥ `historyRewardKind: "instance_close_pending"`ï¼ˆä¸Žä¸Šä¸¤ç±»åŒä¸€åˆ—è¡¨ï¼‰ã€‚
 * å‘¨æœŸåœºï¼ˆå¦‚æ—¥æ¦œï¼‰ï¼š`run_pending` ä¸å…¥åˆ—è¡¨ï¼›æœªè¾¾ä»»ä½•æœ‰å¥–åŠ±åˆ†æ¡£æ—¶ä¸å‡ºçŽ°ï¼›ä»…å½“ç»“ç®—å†™å…¥åˆ†æ¡£å¾…é¢†ï¼ˆå„æ¡£æ¯æ¡¶é¦–æ¬¡è¾¾æˆï¼‰æˆ–å…³æ¡¶ç»“ç®—è¡Œæ‰å±•ç¤ºã€‚
 * åˆ—è¡¨åˆå¹¶åŽæŒ‰ `historySortAt`ï¼ˆæ–°â†’æ—§ï¼‰æŽ’åºï¼šéžå‘¨æœŸ run ä¸Žåˆ†æ¡£è¡Œä»¥ **åˆ›å»ºæ—¶é—´**ï¼ˆ`casual_run_tournaments.createdAt` / `casual_run_player_tournaments.createdAt`ï¼‰ä¸ºå‡†ï¼Œä¸ç”¨ `updatedAt`ï¼ˆé¢†å–å¥–åŠ±ä¼šåˆ·æ–°ï¼‰ï¼›å‘¨æœŸå…³æ¡¶è¡Œä»ä»¥æ¡¶ `endsAt`ï¼›åŒæ¯«ç§’ç”¨ `entryId` ç¨³å®šæ¬¡åºã€‚
 */
export const gameHistory = query({
  args: { uid: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { uid, limit }) => {
    const n = Math.min(Math.max(limit ?? 30, 1), 100);

    const pts = await ctx.db
      .query("casual_run_player_tournaments")
      .withIndex("by_uid_template", (q) => q.eq("uid", uid))
      .collect();
    pts.sort((a, b) => (b.createdAt ?? b._creationTime) - (a.createdAt ?? a._creationTime));

    const tierPendings = await ctx.db
      .query("casual_score_tier_pending")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();
    tierPendings.sort((a, b) => b.createdAt - a.createdAt);

    const scoreTierBundleKey = (tr: Doc<"casual_score_tier_pending">) =>
      `${String(tr.instanceId)}|${String(tr.runTournamentId)}|${tr.matchGameId}|${String(tr.createdAt)}`;

    const bundleMap = new Map<string, Doc<"casual_score_tier_pending">[]>();
    for (const tr of tierPendings) {
      const k = scoreTierBundleKey(tr);
      const arr = bundleMap.get(k) ?? [];
      arr.push(tr);
      bundleMap.set(k, arr);
    }
    const tierGroups = [...bundleMap.values()].map((arr) => {
      arr.sort((a, b) => a.minScore - b.minScore);
      return arr;
    });
    tierGroups.sort((a, b) => b[0].createdAt - a[0].createdAt);

    const runCache = new Map<string, Doc<"casual_run_tournaments"> | null>();
    for (const group of tierGroups) {
      for (const tr of group) {
        const rid = String(tr.runTournamentId);
        if (!runCache.has(rid)) {
          runCache.set(rid, await ctx.db.get(tr.runTournamentId));
        }
      }
    }

    const tierRows = await Promise.all(
      tierGroups.map(async (group) => {
        const tr = group[0];
        const run = runCache.get(String(tr.runTournamentId)) ?? null;
        const pt = await ctx.db
          .query("casual_run_player_tournaments")
          .withIndex("by_tournament_uid", (q) =>
            q.eq("tournamentId", tr.runTournamentId).eq("uid", uid)
          )
          .unique();
        const def = getTournamentDefinition(tr.templateId);
        const inst = run?.instanceId ? await ctx.db.get(run.instanceId) : null;
        const runIdStr = String(tr.runTournamentId);
        const pmForRun = await ctx.db
          .query("casual_run_player_matches")
          .withIndex("by_run_tournament", (q) => q.eq("tournamentId", runIdStr))
          .collect();
        const participantCount = pmForRun.length;
        const isMulti = group.length > 1;
        const sortedMinScores = [...new Set(group.map((g) => g.minScore))].sort((a, b) => a - b);
        const pendingOnly = group.filter((g) => g.status === "pending");
        const sumCoins = pendingOnly.reduce((s, g) => s + Math.max(0, Math.floor(g.coins ?? 0)), 0);
        const sumGems = pendingOnly.reduce((s, g) => s + Math.max(0, Math.floor(g.gems ?? 0)), 0);
        const pr = prunePendingWalletRewards({
          coins: sumCoins,
          gems: sumGems,
        });
        const canClaimReward = Boolean(pendingOnly.length && pr);
        const allClaimed = group.every((g) => g.status === "claimed");
        const rewardsClaimedAt = allClaimed
          ? Math.max(...group.map((g) => (g.claimedAt != null ? g.claimedAt : g.createdAt)))
          : null;
        const submittedAt = allClaimed
          ? Math.max(...group.map((g) => (g.claimedAt != null ? g.claimedAt : g.createdAt)))
          : tr.createdAt;
        const ptDone = pt?.status === RUN_PLAYER_TOURNAMENT_COMPLETED;
        const idKeys = [...group]
          .sort((a, b) => String(a._id).localeCompare(String(b._id)))
          .map((g) => String(g._id));
        const entryId = isMulti ? `score_tier_bundle:${idKeys.join(":")}` : String(tr._id);
        const titleTiers = sortedMinScores.map((m) => `â‰¥${m}`).join("ã€");
        const pendingSortedIds = [...pendingOnly]
          .sort((a, b) => String(a._id).localeCompare(String(b._id)))
          .map((g) => String(g._id));
        const historySortAt = Math.min(...group.map((g) => g.createdAt));
        const watchContext = match3SelfRecordedWatchContext(tr.gameType, tr.matchGameId);
        return {
          historySortAt,
          entryId,
          historyRewardKind: "score_tier_pending" as const,
          runTournamentId: String(tr.runTournamentId),
          tournamentId: tr.templateId,
          title: `${def?.title ?? tr.templateId} Â· åˆ†æ¡£ ${titleTiers}`,
          gameType: tr.gameType,
          matchType: def?.matchType ?? "unknown",
          score: pt?.score ?? null,
          submittedAt,
          entryStatus: ptDone ? ("submitted" as const) : ("joined" as const),
          runStartedAt: run?.createdAt ?? tr.createdAt,
          rank: null as number | null,
          participantCount,
          canClaimReward,
          pendingRunRewards: pr ?? null,
          rewardsClaimedAt,
          periodTournament: true,
          periodInstanceKey: inst?.instanceKey,
          matchGameId: tr.matchGameId,
          scoreTierMinScore: isMulti ? undefined : tr.minScore,
          scoreTierMinScores: isMulti ? sortedMinScores : undefined,
          scoreTierPendingIds: isMulti && pendingSortedIds.length > 0 ? pendingSortedIds : undefined,
          ...(watchContext ? { watchContext } : {}),
        };
      })
    );

    const mine = await ctx.db
      .query("casual_instance_player_state")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();
    const instanceCloseRows: Array<{
      historySortAt: number;
      entryId: string;
      historyRewardKind: "instance_close_pending";
      tournamentId: string;
      title: string;
      gameType: string;
      matchType: string;
      score: number | null;
      submittedAt: number;
      entryStatus: "submitted";
      runStartedAt: number;
      rank: number | null;
      canClaimReward: boolean;
      pendingRunRewards: ReturnType<typeof prunePendingWalletRewards> | null;
      rewardsClaimedAt: number | null;
      periodTournament: boolean;
      periodInstanceKey: string | undefined;
    }> = [];
    for (const s of mine) {
      if (s.matchCount <= 0) continue;
      const inst = await ctx.db.get(s.instanceId);
      if (!inst) continue;
      const def = getTournamentDefinition(inst.templateId);
      if (!def || !isPeriodScopedTournament(def)) continue;
      if (inst.status !== "closed") continue;
      const pr = prunePendingWalletRewards({
        coins: s.pendingInstanceRewards?.coins,
        gems: s.pendingInstanceRewards?.gems,
        seasonVoucher: s.pendingInstanceRewards?.seasonVoucher,
      });
      const canClaimReward = Boolean(pr && s.instanceRewardsClaimedAt == null);
      instanceCloseRows.push({
        historySortAt: inst.endsAt,
        entryId: String(s._id),
        historyRewardKind: "instance_close_pending",
        tournamentId: inst.templateId,
        title: `${def.title ?? inst.templateId} Â· å‘¨æœŸç»“ç®—`,
        gameType: def.gameType,
        matchType: def.matchType ?? "unknown",
        score: s.aggregatedScore ?? null,
        submittedAt: inst.endsAt,
        entryStatus: "submitted",
        runStartedAt: inst.startsAt ?? inst.endsAt,
        rank: s.finalRank ?? null,
        canClaimReward,
        pendingRunRewards: pr ?? null,
        rewardsClaimedAt: s.instanceRewardsClaimedAt ?? null,
        periodTournament: true,
        periodInstanceKey: inst.instanceKey,
      });
    }

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
        };
      })
    );
    const filteredRunRows = runRows.filter((r) => !r.periodTournament);

    const merged = [...filteredRunRows, ...tierRows, ...instanceCloseRows].sort((a, b) => {
      const d = b.historySortAt - a.historySortAt;
      if (d !== 0) return d;
      return String(a.entryId).localeCompare(String(b.entryId));
    });
    return merged
      .slice(0, n)
      .map(({ historySortAt: _historySortAt, ...row }) => row);
  },
});

/** 前端匹配中轮询：是否有已开出的 `open` 对局 assignment */
export const listOpenCasualRunAssignments = query({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const rows = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();
    return rows
      .filter((r) => r.status === "open" || r.status === "replaying")
      .map((r) => ({
        templateId: r.templateId,
        gameId: r.gameId,
        gameType: r.gameType,
        matchId: r.matchId,
        runTournamentId: r.tournamentId,
        createdAt: r.createdAt,
      }))
      