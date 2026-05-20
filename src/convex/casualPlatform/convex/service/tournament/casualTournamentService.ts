import { v } from "convex/values";
import { internal } from "../../_generated/api";
import {
  applyPassXpFromModifiers,
  casualSettleBaseCoins,
  casualSettleBaseGems,
  findCasualRankRewardEntry,
  getTournamentDefinition,
  isPeriodScopedTournament,
  listPlayCasualTournaments,
  listTournamentDefinitions,
} from "../../data/casualTournamentConfigs";
import { applyCasualTemplateLadderDelta } from "../season/casualSeasonLadder";
import type { CasualTournamentDefinition } from "../../data/casualTournamentConfigs";
import { resolveInstanceWindow } from "../../data/casualInstanceWindow";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internalMutation, internalQuery, mutation, query } from "../../_generated/server";
import {
  activeSeasonWindowForCtx,
  applyPeriodMatchScoreToInstanceState,
  computePeriodInstanceSelfStanding,
  ensureInstancePlayerStateRow,
  getOrCreateOpenInstance,
  grantCasualScoreTierRewardsOnEachRunSettled,
  leaderboardRowsFromInstance,
} from "./casualInstanceService";
import {
  applyCasualJoinEntryChargeWithInstance,
  computeJoinEntryWillCharge,
  insertCasualRunDocumentsForHumans,
  requiresDailySoloPlayCostAck,
  RUN_PLAYER_TOURNAMENT_COMPLETED,
  RUN_TOURNAMENT_COMPLETED,
} from "./casualTournamentJoinCore";
import type { JoinCasualRunResult } from "./casualTournamentTypes";
export type { JoinCasualRunResult } from "./casualTournamentTypes";
import {
  buildCasualAsyncTableSummary,
  casualSolitaireVirtualOpponentCount,
  casualTableSummarySolo,
  computeSolitaireRankForSession,
  fillSolitaireVirtualLeaderboardAndRerankHumans,
  isCasualSolitaireVirtualUid,
} from "./casualRunSettlementFill";

/** Re-exports for backward compatibility with imports from this module path */
export {
  CASUAL_BLOCK_BLAST_BOT_UID_PREFIX,
  CASUAL_SOLITAIRE_BOT_UID_PREFIX,
  isCasualSolitaireVirtualUid,
  seedSolitaireVirtualOpponents,
} from "./casualRunSettlementFill";

async function resolveRunHistoryRank(
  ctx: QueryCtx,
  opts: {
    templateId: string;
    gameId: string;
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

  if ((opts.gameId === "solitaire" || opts.gameId === "block_blast") && pm.externalGameId) {
    return computeSolitaireRankForSession(ctx, opts.templateId, pm.externalGameId, opts.uid);
  }

  if (pm.status === "settled" && pm.rank != null) {
    return pm.rank;
  }
  return null;
}

async function activeSeasonId(ctx: MutationCtx): Promise<string | null> {
  const seasons = await ctx.db.query("casual_seasons").collect();
  const s = seasons.find((r) => r.active) ?? seasons[0];
  return s?.seasonId ?? null;
}

function resolveBridgeExternalGameId(
  pm: { externalGameId?: string | null },
  incoming?: string
): string | undefined {
  if (pm.externalGameId && String(pm.externalGameId).startsWith("casual_sess:")) {
    return pm.externalGameId;
  }
  return incoming ?? pm.externalGameId ?? undefined;
}

/** 同一 `casual_run_matches` 内真人 + 虚拟同桌共用，保证 `by_template_external` 能拉全表 */
function canonicalCasualRunSessionExternalId(matchId: string): string {
  return `casual_sess:${matchId}`;
}

/** 模板榜：从 `casual_run_player_matches` 聚合每人最高「已结算」分（与旧 `casual_entries` rollup 语义对齐）。 */
async function leaderboardRowsFromRuns(
  ctx: QueryCtx,
  templateId: string,
  limit: number
): Promise<Array<{ rank: number; uid: string; score: number; submittedAt?: number }>> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_templateId", (q) => q.eq("templateId", templateId))
    .collect();
  const eligible = rows.filter(
    (r) =>
      r.status === "settled" &&
      r.score != null &&
      !isCasualSolitaireVirtualUid(r.uid)
  );
  const bestByUid = new Map<string, { score: number; submittedAt?: number }>();
  for (const r of eligible) {
    const sc = r.score as number;
    const prev = bestByUid.get(r.uid);
    const at = r.updatedAt ?? (r as { _creationTime?: number })._creationTime;
    if (!prev || sc > prev.score) {
      bestByUid.set(r.uid, { score: sc, submittedAt: at });
    } else if (sc === prev.score && at != null && (prev.submittedAt == null || at > prev.submittedAt)) {
      bestByUid.set(r.uid, { score: sc, submittedAt: at });
    }
  }
  const sorted = [...bestByUid.entries()].sort((a, b) => b[1].score - a[1].score);
  return sorted.slice(0, limit).map(([uid, v], i) => ({
    rank: i + 1,
    uid,
    score: v.score,
    submittedAt: v.submittedAt,
  }));
}

function prunePendingWalletRewards(p: {
  coins?: number;
  gems?: number;
  seasonVoucher?: number;
}):
  | {
      coins?: number;
      gems?: number;
      seasonVoucher?: number;
    }
  | undefined {
  const o: {
    coins?: number;
    gems?: number;
    seasonVoucher?: number;
  } = {};
  if ((p.coins ?? 0) > 0) o.coins = p.coins;
  if ((p.gems ?? 0) > 0) o.gems = p.gems;
  if ((p.seasonVoucher ?? 0) > 0) o.seasonVoucher = p.seasonVoucher;
  return Object.keys(o).length > 0 ? o : undefined;
}

/** 结算待发奖写入 `casual_run_player_tournaments.pendingRunRewards`，由历史页 `claimCasualRunRewards` 领取 */
async function persistPendingRunRewards(
  ctx: MutationCtx,
  runTournamentId: Id<"casual_run_tournaments"> | string,
  uid: string,
  rewards:
    | {
        coins?: number;
        gems?: number;
        seasonVoucher?: number;
      }
    | undefined
): Promise<void> {
  const pruned = rewards ? prunePendingWalletRewards(rewards) : undefined;
  if (!pruned) return;
  const pt = await ctx.db
    .query("casual_run_player_tournaments")
    .withIndex("by_tournament_uid", (q) =>
      q.eq("tournamentId", runTournamentId as Id<"casual_run_tournaments">).eq("uid", uid)
    )
    .unique();
  if (!pt) return;
  await ctx.db.patch(pt._id, {
    pendingRunRewards: pruned,
    updatedAt: Date.now(),
  });
}

async function applyCasualTemplateScoreEffects(
  ctx: MutationCtx,
  def: CasualTournamentDefinition,
  args: {
    uid: string;
    tournamentId: string;
    gameId: string;
    score: number;
    externalGameId?: string;
    /** 与真人局同一场 `casual_run_matches` / run 实例，用于写入机器人 `casual_run_player_matches` */
    matchId?: string;
    runTournamentId?: string;
    /** 为 true 时金币/钻/赛季券写入 pending，由历史页 `claimCasualRunRewards` 领取 */
    deferWalletRewards?: boolean;
    /** 多人场合已在结算路径手动调用 `seedSolitaireVirtualOpponents`，跳过此处播种 */
    skipSolitaireBotSeed?: boolean;
    /**
     * 多人异步终局名次（含虚拟对手重排后）。传入时赛季分来自 `rankRewards.seasonPoints`，
     * 不再使用本局分数 × `seasonPointsMultiplier`。
     */
    multiplayerFinalRank?: number;
  }
): Promise<{
  pendingWalletRewards?: {
    coins?: number;
    gems?: number;
    seasonVoucher?: number;
  };
}> {
  const { uid, tournamentId, gameId, score, externalGameId, matchId, runTournamentId } = args;
  /** 默认待发奖：金币/钻须玩家在历史页手动领取 */
  const deferWallet = args.deferWalletRewards !== false;
  const pendingWallet: {
    coins?: number;
    gems?: number;
    seasonVoucher?: number;
  } = {};
  const now = Date.now();

  const seasonId = await activeSeasonId(ctx);
  let pointsDelta = 0;
  if (seasonId) {
    pointsDelta = await applyCasualTemplateLadderDelta(ctx, seasonId, def, {
      uid,
      score,
      multiplayerFinalRank: args.multiplayerFinalRank,
    });
  }
  /** 当场软币/钻按配表足额；门票 + 名次赛季分 ± 约束刷币，不再做当日递减/软币日顶（`casual-platform-design-adjustments.md` §5）。 */
  const settleCoins = casualSettleBaseCoins(def);
  const settleGems = casualSettleBaseGems(def);
  const mpRank = args.multiplayerFinalRank;
  if (typeof mpRank === "number" && mpRank >= 1) {
    const rr = findCasualRankRewardEntry(def.rewards.rankRewards, mpRank);
    if (rr) {
      const mult = rr.multiplier ?? 1;
      if (rr.coins != null) {
        const rc = Math.floor(rr.coins * mult);
        if (rc > 0) pendingWallet.coins = (pendingWallet.coins ?? 0) + rc;
      }
      if (rr.gems != null) {
        const rg = Math.floor(rr.gems * mult);
        if (rg > 0) pendingWallet.gems = (pendingWallet.gems ?? 0) + rg;
      }
    }
  }
  if (settleCoins > 0) {
    if (deferWallet) {
      pendingWallet.coins = (pendingWallet.coins ?? 0) + settleCoins;
    } else {
      await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "coins",
        amount: settleCoins,
      });
    }
  }
  if (settleGems > 0) {
    if (deferWallet) {
      pendingWallet.gems = (pendingWallet.gems ?? 0) + settleGems;
    } else {
      await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "gems",
        amount: settleGems,
      });
    }
  }
  let passXpDelta = def.seasonXpOnSettle;
  if (def.seasonXpOnSettle > 0) {
    const xpMods = await ctx.runQuery(
      internal.service.activity.casualActivityService.resolveSeasonActivityModifiers,
      { tournamentId }
    );
    passXpDelta = applyPassXpFromModifiers(
      def.seasonXpOnSettle,
      xpMods.passXpMultiplier,
      xpMods.passXpDelta
    );
  }
  /** Pass XP：每场固定（A/B/C/专场/日榜），不受当日钱包递减影响；升级后自动发 Pass 轨道奖励 */
  if (passXpDelta > 0) {
    await ctx.runMutation(internal.service.season.casualSeasonService.addPassXpFromRun, {
      uid,
      deltaXp: passXpDelta,
    });
  }

  const appliedSeasonPointsForTask =
    def.matchType === "season_challenge" ? pointsDelta : 0;

  await ctx.runMutation(internal.service.task.casualTaskService.notifyScoreSubmitted, {
    uid,
    matchType: def.matchType,
    spotlightSeasonBoardGain: appliedSeasonPointsForTask,
  });

  const pendingPruned = deferWallet ? prunePendingWalletRewards(pendingWallet) : undefined;
  return {
    ...(pendingPruned ? { pendingWalletRewards: pendingPruned } : {}),
  };
}

/**
 * 一次性引导 DB：`casual_seasons`、`casual_tournaments`（含异步场与 Block Blast `season_challenge`）、
 * 商店 SKU、活动目录。不在任何用户路径自动调用；上线请用 Dashboard / `npx convex run` 显式执行，或由运维迁移写入。
 */
export const seedDemoTournaments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const seasons = await ctx.db.query("casual_seasons").collect();
    if (seasons.length === 0) {
      const now = Date.now();
      await ctx.db.insert("casual_seasons", {
        seasonId: "casual_s1",
        name: "Season 1",
        startsAt: now,
        endsAt: now + 90 * 86400000,
        active: true,
      });
    }
    let tournamentsUpserted = 0;
    for (const t of listTournamentDefinitions()) {
      const existing = await ctx.db
        .query("casual_tournaments")
        .withIndex("by_tournamentId", (q) => q.eq("tournamentId", t.tournamentId))
        .unique();
      if (!existing) {
        await ctx.db.insert("casual_tournaments", {
          tournamentId: t.tournamentId,
          title: t.title,
          gameId: t.gameId,
          matchType: t.matchType,
          status: t.status,
        });
        tournamentsUpserted++;
      } else if (
        existing.title !== t.title ||
        existing.gameId !== t.gameId ||
        existing.matchType !== t.matchType ||
        existing.status !== t.status
      ) {
        await ctx.db.patch(existing._id, {
          title: t.title,
          gameId: t.gameId,
          matchType: t.matchType,
          status: t.status,
        });
        tournamentsUpserted++;
      }
    }
    await ctx.runMutation(internal.service.shop.casualShopService.seedShopSkusIfEmpty, {});
    await ctx.runMutation(internal.service.activity.casualActivityService.seedActivitiesIfEmpty, {});
    return { ok: true as const, tournamentsUpserted };
  },
});

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

    /** 与「库里有种子」解耦：静态 Play 列表始终完整，DB 仅覆盖 title/status（运营改表时生效） */
    const staticPlay = listPlayCasualTournaments();
    const staticIds = new Set(staticPlay.map((s) => s.tournamentId));
    const fromStatic = staticPlay.map((s) => {
      const db = dbById.get(s.tournamentId);
      return {
        tournamentId: s.tournamentId,
        title: db?.title ?? s.title,
        gameId: s.gameId,
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
        gameId: r.gameId,
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
    /** 指定历史桶；缺省为当前解析到的开放桶（已关闭桶可查榜时传此参） */
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

/** 当前周期桶内「我的」聚合分与名次（与 `leaderboard` 同实例解析；不依赖 Top N 是否含本人）。 */
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

/** 单场 Solitaire：仅查 `casual_run_player_matches`（机器人与真人同表，uid 前缀区分虚拟对手） */
export const solitaireSessionStandings = query({
  args: { tournamentId: v.string(), externalGameId: v.string() },
  handler: async (ctx, { tournamentId, externalGameId }) => {
    const rows = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_template_external", (q) =>
        q.eq("templateId", tournamentId).eq("externalGameId", externalGameId)
      )
      .collect();
    const withScore = rows
      .filter((r) => r.score != null)
      .map((r) => ({
        uid: r.uid,
        score: r.score as number,
        submittedAt: r.updatedAt,
        isVirtual: isCasualSolitaireVirtualUid(r.uid),
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
 * 游戏历史：非周期型异步 run 一条 `casual_run_player_tournaments`；
 * 周期型分档预发奖：同一局结算写入的多条 `casual_score_tier_pending`（同 instance+run+matchGame+createdAt）合并为一条；
 * 周期桶关桶后的 base/名次奖并入 `historyRewardKind: "instance_close_pending"`（与上两类同一列表）。
 * 周期场（如日榜）：`run_pending` 不入列表；未达任何有奖励分档时不出现；仅当结算写入分档待领（各档每桶首次达成）或关桶结算行才展示。
 * 列表合并后按 `historySortAt`（新→旧）排序：非周期 run 与分档行以 **创建时间**（`casual_run_tournaments.createdAt` / `casual_run_player_tournaments.createdAt`）为准，不用 `updatedAt`（领取奖励会刷新）；周期关桶行仍以桶 `endsAt`；同毫秒用 `entryId` 稳定次序。
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
        const titleTiers = sortedMinScores.map((m) => `≥${m}`).join("、");
        const pendingSortedIds = [...pendingOnly]
          .sort((a, b) => String(a._id).localeCompare(String(b._id)))
          .map((g) => String(g._id));
        const historySortAt = Math.min(...group.map((g) => g.createdAt));
        return {
          historySortAt,
          entryId,
          historyRewardKind: "score_tier_pending" as const,
          runTournamentId: String(tr.runTournamentId),
          tournamentId: tr.templateId,
          title: `${def?.title ?? tr.templateId} · 分档 ${titleTiers}`,
          gameId: tr.gameType,
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
      gameId: string;
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
        title: `${def.title ?? inst.templateId} · 周期结算`,
        gameId: def.gameId,
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

    const sliced = pts.slice(0, n * 2);
    const runRows = await Promise.all(
      sliced.map(async (pt) => {
        const run = await ctx.db.get(pt.tournamentId);
        const def = getTournamentDefinition(pt.templateId);
        const completed = pt.status === RUN_PLAYER_TOURNAMENT_COMPLETED;
        const gameId = def?.gameId ?? run?.gameType ?? "unknown";

        const runIdStr = String(pt.tournamentId);
        const pmForRun = await ctx.db
          .query("casual_run_player_matches")
          .withIndex("by_run_tournament", (q) => q.eq("tournamentId", runIdStr))
          .collect();
        const participantCount = pmForRun.length;

        const rank = completed
          ? await resolveRunHistoryRank(ctx, {
              templateId: pt.templateId,
              gameId,
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
          gameId,
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

/**
 * 供 solitaireArena / blockBlast `loadGame`（HTTP `find-match-by-game`）解析休闲 run 建局参数。
 * 仅 `status === "open"` 且玩法为 solitaire 或 block_blast；已结算则拒绝重复建局。
 */
export const findMatchByGameForBridge = internalQuery({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const pm = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    if (!pm) {
      return { ok: false as const, error: "unknown_match_game" as const };
    }
    if (pm.gameType !== "solitaire" && pm.gameType !== "block_blast") {
      return { ok: false as const, error: "wrong_game_type" as const };
    }
    if (pm.status !== "open") {
      return { ok: false as const, error: "match_not_open" as const };
    }
    const seedKey =
      pm.externalGameId && String(pm.externalGameId).startsWith("casual_sess:")
        ? pm.externalGameId
        : pm.uid;
    const seed = `casual:${pm.matchId}:${pm.templateId}:${seedKey}:${pm.createdAt}`;
    return {
      ok: true as const,
      match: {
        gameId: pm.gameId,
        seed,
        templateId: pm.templateId,
      },
    };
  },
});

/**
 * 每场新 run：扣费 + `casual_run_*` 四表 + TM 对齐 `game_${matchId}_${uid}`。
 *
 * 不在此函数创建 solitaireArena / blockBlast 的牌局文档：casual 与游戏 Convex 分离部署。
 * 前端拿到 `gameId` 后打开对局时调 solitaireArena / blockBlast 的 `proxy.controller.loadGame`（内部 HTTP 调本服务 `find-match-by-game` 取 seed 并建局）。
 */
export const joinCasualRunCore = internalMutation({
  args: {
    uid: v.string(),
    tournamentId: v.string(),
    dailySoloCostAck: v.optional(v.literal(true)),
  },
  handler: async (ctx, { uid, tournamentId, dailySoloCostAck }): Promise<JoinCasualRunResult> => {
    const def = getTournamentDefinition(tournamentId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" };
    }

    const now = Date.now();
    const preview = await computeJoinEntryWillCharge(ctx, uid, tournamentId, now);
    if (!preview.ok) {
      return { ok: false as const, error: preview.error };
    }
    if (requiresDailySoloPlayCostAck(tournamentId, preview.willChargeEntry) && dailySoloCostAck !== true) {
      return { ok: false as const, error: "needs_cost_ack" };
    }

    const instanceId = await getOrCreateOpenInstance(ctx, { templateId: tournamentId, def, now });
    if (isPeriodScopedTournament(def) && !instanceId) {
      return { ok: false as const, error: "period_unavailable" };
    }

    const ch = await applyCasualJoinEntryChargeWithInstance(ctx, uid, tournamentId, def, instanceId);
    if (!ch.ok) {
      return { ok: false as const, error: ch.error };
    }

    const inserted = await insertCasualRunDocumentsForHumans(ctx, {
      uids: [uid],
      templateId: tournamentId,
      def,
      ...(instanceId ? { instanceId } : {}),
      vouchersCharged: ch.vouchersCharged,
      coinsCharged: ch.coinsCharged,
      gemsCharged: ch.gemsCharged,
      activityIds: ch.activityIds,
    });

    const row = inserted.byUid[uid];
    if (!row) {
      return { ok: false as const, error: "join_failed" };
    }

    return {
      ok: true as const,
      runTournamentId: inserted.runTournamentId,
      matchId: inserted.matchId,
      gameId: row.gameId,
      templateId: tournamentId,
      vouchersCharged: inserted.vouchersCharged,
      coinsCharged: inserted.coinsCharged,
      gemsCharged: inserted.gemsCharged,
      activityIds: inserted.activityIds,
    };
  },
});

/** 本次 join 是否会扣入场费（只读，与 join 路径一致） */
export const previewJoinEntryCharge = query({
  args: { uid: v.string(), tournamentId: v.string() },
  handler: async (ctx, { uid, tournamentId }) => {
    return await computeJoinEntryWillCharge(ctx, uid, tournamentId, Date.now());
  },
});

export const joinTournament = mutation({
  args: {
    uid: v.string(),
    tournamentId: v.string(),
    dailySoloCostAck: v.optional(v.literal(true)),
    replayTokenId: v.optional(v.id("casual_replay_tokens")),
  },
  handler: async (ctx, { uid, tournamentId, dailySoloCostAck, replayTokenId }): Promise<JoinCasualRunResult> => {
    const def = getTournamentDefinition(tournamentId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" };
    }
    return await ctx.runMutation(internal.service.tournament.casualMatchmaking.enqueueCasualMatchmakingAndTryMatch, {
      uid,
      tournamentId,
      dailySoloCostAck,
      replayTokenId,
    });
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
      .filter((r) => r.status === "open")
      .map((r) => ({
        templateId: r.templateId,
        /** 对局文档 id（`game_${matchId}_${uid}`），传给 Play* 的 `casualMatchGameId` */
        gameId: r.gameId,
        /** 与 `CasualTournamentDefinition.gameId` 一致：`block_blast` / `solitaire` */
        gameType: r.gameType,
        matchId: r.matchId,
        runTournamentId: r.tournamentId,
        createdAt: r.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const submitCasualRunScoreCore = internalMutation({
  args: {
    uid: v.string(),
    matchGameId: v.string(),
    score: v.number(),
    externalGameId: v.optional(v.string()),
    gameId: v.string(),
  },
  handler: async (ctx, { uid, matchGameId, score, externalGameId, gameId }) => {
    const pm = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_gameId", (q) => q.eq("gameId", matchGameId))
      .unique();
    if (!pm) {
      return { ok: false as const, error: "unknown_match_game" };
    }
    if (pm.uid !== uid) {
      return { ok: false as const, error: "forbidden" };
    }
    const def = getTournamentDefinition(pm.templateId);
    if (!def || def.gameId !== gameId) {
      return { ok: false as const, error: "bad_tournament" };
    }
    if (!Number.isFinite(score) || score < 0) {
      return { ok: false as const, error: "bad_score" };
    }

    if (pm.status === "settled") {
      const defDedupe = getTournamentDefinition(pm.templateId);
      const extDedupe =
        typeof pm.externalGameId === "string" && pm.externalGameId.trim().length > 0
          ? pm.externalGameId.trim()
          : "";
      let tableSummary: Awaited<ReturnType<typeof buildCasualAsyncTableSummary>> | undefined =
        undefined;
      if (defDedupe && extDedupe) {
        const built = await buildCasualAsyncTableSummary(ctx, {
          templateId: pm.templateId,
          sessionExternalId: extDedupe,
          uid,
          maxPlayers: defDedupe.maxPlayers,
        });
        if (built) tableSummary = built;
      }
      return {
        ok: true as const,
        deduped: true as const,
        ...(tableSummary ? { tableSummary } : {}),
      };
    }

    const now = Date.now();
    const matchDoc = await ctx.db.get(pm.matchId as Id<"casual_run_matches">);
    if (!matchDoc) {
      return { ok: false as const, error: "match_not_found" };
    }

    const participants = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_match_uid", (q) => q.eq("matchId", pm.matchId))
      .collect();

    const resolvedExt = resolveBridgeExternalGameId(pm, externalGameId);

    const othersPending = participants.some((p) => p._id !== pm._id && p.status === "open");

    if (othersPending) {
      await ctx.db.patch(pm._id, {
        score,
        status: "finished",
        externalGameId: resolvedExt,
        updatedAt: now,
      });
      return { ok: true as const, pendingOthers: true as const };
    }

    await ctx.db.patch(pm._id, {
      score,
      status: "finished",
      externalGameId: resolvedExt,
      updatedAt: now,
    });

    const refreshed = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_match_uid", (q) => q.eq("matchId", pm.matchId))
      .collect();

    const humanPms = refreshed.filter((p) => !isCasualSolitaireVirtualUid(p.uid));
    const humanCountPlanned = Math.max(1, matchDoc.humanPlayerCount ?? 1);

    const allHumansDone = humanPms.every(
      (p) => p.status === "finished" || p.status === "settled"
    );
    if (!allHumansDone) {
      return { ok: true as const, pendingOthers: true as const };
    }

    const runTid = pm.tournamentId as Id<"casual_run_tournaments">;
    const runRow = await ctx.db.get(runTid);
    const skipPeriodWallet = Boolean(isPeriodScopedTournament(def) && runRow?.instanceId);
    const canonicalSessionId = canonicalCasualRunSessionExternalId(String(pm.matchId));

    /** 仅真正单人桌（`maxPlayers === 1`，如日榜）走简路；A/B/C 即使仅 1 真人也需虚拟对手 + 名次赛季分 */
    if (def.maxPlayers <= 1) {
      await ctx.db.patch(pm._id, {
        status: "settled",
        rank: 1,
        externalGameId: canonicalSessionId,
        updatedAt: now,
      });

      await ctx.db.patch(matchDoc._id, {
        completed: true,
        updatedAt: now,
      });

      const pt = await ctx.db
        .query("casual_run_player_tournaments")
        .withIndex("by_tournament_uid", (q) => q.eq("tournamentId", runTid).eq("uid", uid))
        .unique();
      if (pt) {
        await ctx.db.patch(pt._id, {
          score,
          status: RUN_PLAYER_TOURNAMENT_COMPLETED,
          updatedAt: now,
        });
      }
      await ctx.db.patch(runTid, {
        status: RUN_TOURNAMENT_COMPLETED,
        updatedAt: now,
      });

      if (skipPeriodWallet && runRow?.instanceId) {
        await ensureInstancePlayerStateRow(ctx, {
          instanceId: runRow.instanceId,
          uid,
          now,
        });
        await applyPeriodMatchScoreToInstanceState(ctx, {
          instanceId: runRow.instanceId,
          uid,
          matchScore: score,
          now,
          def,
        });
        await grantCasualScoreTierRewardsOnEachRunSettled(ctx, {
          instanceId: runRow.instanceId,
          runTournamentId: runTid,
          uid,
          def,
          now,
          matchGameId: pm.gameId,
          gameType: def.gameId,
        });
        const seasonIdPeriod = await activeSeasonId(ctx);
        let periodLadderDelta = 0;
        if (seasonIdPeriod) {
          periodLadderDelta = await applyCasualTemplateLadderDelta(ctx, seasonIdPeriod, def, {
            uid,
            score,
            multiplayerFinalRank: 1,
          });
        }
        await ctx.runMutation(internal.service.task.casualTaskService.notifyScoreSubmitted, {
          uid,
          matchType: def.matchType,
          spotlightSeasonBoardGain:
            def.matchType === "season_challenge" ? periodLadderDelta : 0,
        });
        const tableSummaryPeriodSolo = casualTableSummarySolo(def.maxPlayers, score);
        return {
          ok: true as const,
          periodSettled: true as const,
          tableSummary: tableSummaryPeriodSolo,
        };
      }

      const extra = await applyCasualTemplateScoreEffects(ctx, def, {
        uid,
        tournamentId: pm.templateId,
        gameId,
        score,
        externalGameId: canonicalSessionId,
        matchId: pm.matchId,
        runTournamentId: pm.tournamentId,
        multiplayerFinalRank: 1,
      });
      await persistPendingRunRewards(ctx, runTid, uid, extra.pendingWalletRewards);

      const tableBuilt = await buildCasualAsyncTableSummary(ctx, {
        templateId: pm.templateId,
        sessionExternalId: canonicalSessionId,
        uid,
        maxPlayers: def.maxPlayers,
      });
      const tableSummary = tableBuilt ?? casualTableSummarySolo(def.maxPlayers, score);

      return {
        ok: true as const,
        tableSummary,
        ...extra,
      };
    }

    const sortedHumans = [...humanPms].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    for (let i = 0; i < sortedHumans.length; i++) {
      await ctx.db.patch(sortedHumans[i]!._id, {
        status: "settled",
        rank: i + 1,
        externalGameId: canonicalSessionId,
        updatedAt: now,
      });
    }

    await ctx.db.patch(matchDoc._id, {
      completed: true,
      updatedAt: now,
    });

    await ctx.db.patch(runTid, {
      status: RUN_TOURNAMENT_COMPLETED,
      updatedAt: now,
    });

    for (const hp of sortedHumans) {
      const ptRow = await ctx.db
        .query("casual_run_player_tournaments")
        .withIndex("by_tournament_uid", (q) =>
          q.eq("tournamentId", runTid).eq("uid", hp.uid)
        )
        .unique();
      if (ptRow && hp.score != null) {
        await ctx.db.patch(ptRow._id, {
          score: hp.score,
          status: RUN_PLAYER_TOURNAMENT_COMPLETED,
          updatedAt: now,
        });
      }
    }

    if (canonicalSessionId) {
      const maxScore = Math.max(...sortedHumans.map((h) => h.score ?? 0));
      await fillSolitaireVirtualLeaderboardAndRerankHumans(ctx, {
        def,
        templateId: pm.templateId,
        matchId: pm.matchId,
        runTournamentId: pm.tournamentId,
        sessionExternalId: canonicalSessionId,
        humanCountPlanned,
        humanRows: humanPms
          .filter((h) => h.score != null)
          .map((h) => ({ _id: h._id, uid: h.uid, score: h.score as number })),
        updatedAt: now,
      });
    }

    if (skipPeriodWallet && runRow?.instanceId) {
      for (const hp of sortedHumans) {
        if (hp.score == null) continue;
        await ensureInstancePlayerStateRow(ctx, {
          instanceId: runRow.instanceId,
          uid: hp.uid,
          now,
        });
        await applyPeriodMatchScoreToInstanceState(ctx, {
          instanceId: runRow.instanceId,
          uid: hp.uid,
          matchScore: hp.score,
          now,
          def,
        });
        await grantCasualScoreTierRewardsOnEachRunSettled(ctx, {
          instanceId: runRow.instanceId,
          runTournamentId: runTid,
          uid: hp.uid,
          def,
          now,
          matchGameId: hp.gameId,
          gameType: def.gameId,
        });
        await ctx.runMutation(internal.service.task.casualTaskService.notifyScoreSubmitted, {
          uid: hp.uid,
          matchType: def.matchType,
          spotlightSeasonBoardGain: 0,
        });
      }
      let tableSummaryPeriodMulti: Awaited<ReturnType<typeof buildCasualAsyncTableSummary>> | undefined =
        undefined;
      if (canonicalSessionId.trim().length > 0) {
        const built = await buildCasualAsyncTableSummary(ctx, {
          templateId: pm.templateId,
          sessionExternalId: canonicalSessionId,
          uid,
          maxPlayers: def.maxPlayers,
        });
        if (built) tableSummaryPeriodMulti = built;
      }
      return {
        ok: true as const,
        periodSettled: true as const,
        ...(tableSummaryPeriodMulti ? { tableSummary: tableSummaryPeriodMulti } : {}),
      };
    }

    let lastExtra: Awaited<ReturnType<typeof applyCasualTemplateScoreEffects>> = {};
    for (const hp of sortedHumans) {
      if (hp.score == null) continue;
      const freshPm = await ctx.db.get(hp._id);
      const finalRank = freshPm?.rank;
      const extra = await applyCasualTemplateScoreEffects(ctx, def, {
        uid: hp.uid,
        tournamentId: pm.templateId,
        gameId,
        score: hp.score,
        externalGameId: canonicalSessionId,
        matchId: pm.matchId,
        runTournamentId: pm.tournamentId,
        skipSolitaireBotSeed: true,
        ...(typeof finalRank === "number" && finalRank >= 1 ? { multiplayerFinalRank: finalRank } : {}),
      });
      await persistPendingRunRewards(ctx, runTid, hp.uid, extra.pendingWalletRewards);
      lastExtra = extra;
    }

    let tableSummaryReturn: Awaited<ReturnType<typeof buildCasualAsyncTableSummary>> | undefined = undefined;
    if (canonicalSessionId.trim().length > 0) {
      const built = await buildCasualAsyncTableSummary(ctx, {
        templateId: pm.templateId,
        sessionExternalId: canonicalSessionId,
        uid,
        maxPlayers: def.maxPlayers,
      });
      if (built) tableSummaryReturn = built;
    }

    return {
      ok: true as const,
      ...(tableSummaryReturn ? { tableSummary: tableSummaryReturn } : {}),
      ...lastExtra,
    };
  },
});

export const claimCasualRunRewards = mutation({
  args: {
    uid: v.string(),
    playerTournamentId: v.id("casual_run_player_tournaments"),
  },
  handler: async (ctx, { uid, playerTournamentId }) => {
    const pt = await ctx.db.get(playerTournamentId);
    if (!pt || pt.uid !== uid) {
      return { ok: false as const, error: "forbidden" as const };
    }
    if (pt.runRewardsClaimedAt != null) {
      return { ok: false as const, error: "already_claimed" as const };
    }
    const pending = pt.pendingRunRewards;
    const pr = prunePendingWalletRewards({
      coins: pending?.coins,
      gems: pending?.gems,
      seasonVoucher: pending?.seasonVoucher,
    });
    if (!pr) {
      return { ok: false as const, error: "nothing_to_claim" as const };
    }
    const now = Date.now();
    if ((pr.coins ?? 0) > 0) {
      const gr = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "coins",
        amount: pr.coins!,
      });
      if (!gr.ok) {
        return { ok: false as const, error: "grant_failed" as const };
      }
    }
    if ((pr.gems ?? 0) > 0) {
      const gr = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "gems",
        amount: pr.gems!,
      });
      if (!gr.ok) {
        return { ok: false as const, error: "grant_failed" as const };
      }
    }
    if ((pr.seasonVoucher ?? 0) > 0) {
      const gr = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "seasonVoucher",
        amount: pr.seasonVoucher!,
      });
      if (!gr.ok) {
        return { ok: false as const, error: "grant_failed" as const };
      }
    }
    await ctx.db.patch(pt._id, {
      pendingRunRewards: undefined,
      runRewardsClaimedAt: now,
      updatedAt: now,
    });
    return { ok: true as const };
  },
});

/** 周期场分档预发奖：领取 `casual_score_tier_pending` 写入钱包 */
export const claimCasualScoreTierPendingReward = mutation({
  args: {
    uid: v.string(),
    pendingRewardId: v.id("casual_score_tier_pending"),
  },
  handler: async (ctx, { uid, pendingRewardId }) => {
    const row = await ctx.db.get(pendingRewardId);
    if (!row || row.uid !== uid) {
      return { ok: false as const, error: "forbidden" as const };
    }
    if (row.status !== "pending") {
      return { ok: false as const, error: "already_claimed" as const };
    }
    const pr = prunePendingWalletRewards({
      coins: row.coins,
      gems: row.gems,
    });
    if (!pr) {
      return { ok: false as const, error: "nothing_to_claim" as const };
    }
    const now = Date.now();
    if ((pr.coins ?? 0) > 0) {
      const gr = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "coins",
        amount: pr.coins!,
      });
      if (!gr.ok) {
        return { ok: false as const, error: "grant_failed" as const };
      }
    }
    if ((pr.gems ?? 0) > 0) {
      const gr = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "gems",
        amount: pr.gems!,
      });
      if (!gr.ok) {
        return { ok: false as const, error: "grant_failed" as const };
      }
    }
    await ctx.db.patch(row._id, {
      status: "claimed",
      claimedAt: now,
    });
    return { ok: true as const };
  },
});

const SCORE_TIER_PENDING_BATCH_MAX = 16;

/** 同一局结算多档合并领取：须为同一 `instanceId + runTournamentId + matchGameId + createdAt` 批次 */
export const claimCasualScoreTierPendingRewardsBatch = mutation({
  args: {
    uid: v.string(),
    pendingRewardIds: v.array(v.id("casual_score_tier_pending")),
  },
  handler: async (ctx, { uid, pendingRewardIds }) => {
    if (pendingRewardIds.length === 0) {
      return { ok: false as const, error: "empty_batch" as const };
    }
    if (pendingRewardIds.length > SCORE_TIER_PENDING_BATCH_MAX) {
      return { ok: false as const, error: "batch_too_large" as const };
    }
    if (new Set(pendingRewardIds.map(String)).size !== pendingRewardIds.length) {
      return { ok: false as const, error: "duplicate_ids" as const };
    }
    const rows = (await Promise.all(pendingRewardIds.map((id) => ctx.db.get(id)))).filter(
      (row): row is NonNullable<typeof row> => row != null
    );
    if (rows.length !== pendingRewardIds.length) {
      return { ok: false as const, error: "forbidden" as const };
    }
    for (const row of rows) {
      if (row.uid !== uid) {
        return { ok: false as const, error: "forbidden" as const };
      }
      if (row.status !== "pending") {
        return { ok: false as const, error: "already_claimed" as const };
      }
    }
    const r0 = rows[0];
    for (const row of rows) {
      if (
        String(row.instanceId) !== String(r0.instanceId) ||
        String(row.runTournamentId) !== String(r0.runTournamentId) ||
        row.matchGameId !== r0.matchGameId ||
        row.createdAt !== r0.createdAt
      ) {
        return { ok: false as const, error: "batch_mismatch" as const };
      }
    }
    let sumCoins = 0;
    let sumGems = 0;
    for (const row of rows) {
      sumCoins += Math.max(0, Math.floor(row.coins ?? 0));
      sumGems += Math.max(0, Math.floor(row.gems ?? 0));
    }
    const pr = prunePendingWalletRewards({
      coins: sumCoins,
      gems: sumGems,
    });
    if (!pr) {
      return { ok: false as const, error: "nothing_to_claim" as const };
    }
    const now = Date.now();
    if ((pr.coins ?? 0) > 0) {
      const gr = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "coins",
        amount: pr.coins!,
      });
      if (!gr.ok) {
        return { ok: false as const, error: "grant_failed" as const };
      }
    }
    if ((pr.gems ?? 0) > 0) {
      const gr = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "gems",
        amount: pr.gems!,
      });
      if (!gr.ok) {
        return { ok: false as const, error: "grant_failed" as const };
      }
    }
    for (const row of rows) {
      await ctx.db.patch(row._id, {
        status: "claimed",
        claimedAt: now,
      });
    }
    return { ok: true as const };
  },
});

export const applyScore = internalMutation({
  args: {
    uid: v.string(),
    tournamentId: v.string(),
    gameId: v.string(),
    score: v.number(),
    externalGameId: v.optional(v.string()),
  },
  handler: async (ctx, { uid, tournamentId, gameId, score, externalGameId }) => {
    const def = getTournamentDefinition(tournamentId);
    if (!def || def.gameId !== gameId) {
      return { ok: false as const, error: "bad_tournament" };
    }
    if (!Number.isFinite(score) || score < 0) {
      return { ok: false as const, error: "bad_score" };
    }
    const matches = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_uid_template", (q) => q.eq("uid", uid).eq("templateId", tournamentId))
      .collect();
    if (matches.length === 0) {
      return { ok: false as const, error: "must_join_first" };
    }
    if (externalGameId) {
      const dup = matches.find(
        (m) => m.externalGameId === externalGameId && m.score === score
      );
      if (dup) {
        return { ok: true as const, entryId: String(dup._id), deduped: true as const };
      }
    }
    matches.sort(
      (a, b) =>
        (b.updatedAt ?? (b as { _creationTime?: number })._creationTime ?? 0) -
        (a.updatedAt ?? (a as { _creationTime?: number })._creationTime ?? 0)
    );
    const anchor = matches[0];
    const anchorId = String(anchor._id);
    const extra = await applyCasualTemplateScoreEffects(ctx, def, {
      uid,
      tournamentId,
      gameId,
      score,
      externalGameId,
      matchId: anchor.matchId,
      runTournamentId: anchor.tournamentId,
    });
    await persistPendingRunRewards(ctx, anchor.tournamentId, uid, extra.pendingWalletRewards);

    return {
      ok: true as const,
      entryId: anchorId,
      ...extra,
    };
  },
});
