/**
 * 周期型锦标：实例建桶、局后聚合分、到期收尾与待领奖励。
 */
import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import { internal } from "../../../_generated/api";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { internalMutation } from "../../../_generated/server";
import { authedMutation, authedQuery } from "../../../custom/session";
import { resolveInstanceWindow, type ActiveSeasonWindow } from "../../../data/casualInstanceWindow";
import type { CasualTournamentDefinition } from "../../../data/casualTournamentConfigs";
import {
  applyPassXpFromModifiers,
  casualSettleBaseCoins,
  casualSettleBaseGems,
  effectiveScoreAggregation,
  getTournamentDefinition,
  isPeriodScopedTournament,
} from "../../../data/casualTournamentConfigs";
import type {
  CasualRankRewardEntry,
  CasualScoreTierRewardEntry,
} from "../../../data/casualTournamentRewardTypes";

export async function activeSeasonWindowForCtx(
  ctx: MutationCtx | QueryCtx
): Promise<ActiveSeasonWindow | null> {
  const seasons = await ctx.db.query("casual_seasons").collect();
  const s = seasons.find((r) => r.active) ?? seasons[0];
  if (!s) return null;
  return { seasonId: s.seasonId, startsAt: s.startsAt, endsAt: s.endsAt };
}

export async function getOrCreateOpenInstance(
  ctx: MutationCtx,
  args: { templateId: string; def: CasualTournamentDefinition; now: number }
): Promise<Id<"casual_tournament_instances"> | null> {
  const { templateId, def, now } = args;
  if (!isPeriodScopedTournament(def)) return null;
  const activeSeason = await activeSeasonWindowForCtx(ctx);
  const win = resolveInstanceWindow(def, now, activeSeason);
  if (!win) return null;

  const rawAgg = effectiveScoreAggregation(def);
  const storedAgg = rawAgg === "sum_scores" ? "sum_scores" : "best_score";

  const existing = await ctx.db
    .query("casual_tournament_instances")
    .withIndex("by_template_instanceKey", (q) =>
      q.eq("templateId", templateId).eq("instanceKey", win.instanceKey)
    )
    .first();

  if (existing) {
    if (existing.status === "closed") {
      return null;
    }
    return existing._id;
  }

  const insertId = await ctx.db.insert("casual_tournament_instances", {
    templateId,
    instanceKey: win.instanceKey,
    startsAt: win.startsAt,
    endsAt: win.endsAt,
    status: "open",
    scoreAggregation: storedAgg,
    createdAt: now,
    updatedAt: now,
  });

  const dupes = await ctx.db
    .query("casual_tournament_instances")
    .withIndex("by_template_instanceKey", (q) =>
      q.eq("templateId", templateId).eq("instanceKey", win.instanceKey)
    )
    .collect();
  if (dupes.length > 1) {
    dupes.sort((a, b) => a.createdAt - b.createdAt);
    const keep = dupes[0]!._id;
    for (const d of dupes.slice(1)) {
      await ctx.db.delete(d._id);
    }
    return keep === insertId ? insertId : keep;
  }

  return insertId;
}

export async function ensureInstancePlayerStateRow(
  ctx: MutationCtx,
  args: { instanceId: Id<"casual_tournament_instances">; uid: string; now: number }
): Promise<Id<"casual_instance_player_state">> {
  const cur = await ctx.db
    .query("casual_instance_player_state")
    .withIndex("by_instance_uid", (q) => q.eq("instanceId", args.instanceId).eq("uid", args.uid))
    .first();
  if (cur) return cur._id;
  return await ctx.db.insert("casual_instance_player_state", {
    instanceId: args.instanceId,
    uid: args.uid,
    entryFeeCharged: false,
    matchCount: 0,
    createdAt: args.now,
    updatedAt: args.now,
  });
}

export async function applyPeriodMatchScoreToInstanceState(
  ctx: MutationCtx,
  args: {
    instanceId: Id<"casual_tournament_instances">;
    uid: string;
    matchScore: number;
    now: number;
    def: CasualTournamentDefinition;
  }
): Promise<void> {
  const row = await ctx.db
    .query("casual_instance_player_state")
    .withIndex("by_instance_uid", (q) => q.eq("instanceId", args.instanceId).eq("uid", args.uid))
    .first();
  if (!row) return;
  const agg = effectiveScoreAggregation(args.def);
  const prevBest = row.bestScore ?? 0;
  const prevSum = row.sumScore ?? 0;
  const nextCount = row.matchCount + 1;
  if (agg === "sum_scores") {
    await ctx.db.patch(row._id, {
      sumScore: prevSum + args.matchScore,
      matchCount: nextCount,
      updatedAt: args.now,
    });
  } else {
    await ctx.db.patch(row._id, {
      bestScore: Math.max(prevBest, args.matchScore),
      matchCount: nextCount,
      updatedAt: args.now,
    });
  }
}

/**
 * 周期型且 `scoreTierRewardsGrantTiming === on_each_run_settled`：
 * 须在 `applyPeriodMatchScoreToInstanceState` 之后调用；对本局新达成且本桶未建档的各 `minScore` 档写入 `casual_score_tier_pending`（历史页手动领取）。
 */
export async function grantCasualScoreTierRewardsOnEachRunSettled(
  ctx: MutationCtx,
  args: {
    instanceId: Id<"casual_tournament_instances">;
    runTournamentId: Id<"casual_run_tournaments">;
    uid: string;
    def: CasualTournamentDefinition;
    now: number;
    /** `casual_run_player_matches.gameId`，与 Play `casualMatchGameId` 一致 */
    matchGameId: string;
    /** `solitaire` | `block_blast`，与 `CasualTournamentDefinition.gameType` 一致 */
    gameType: string;
  }
): Promise<void> {
  if (args.def.rewards.scoreTierRewardsGrantTiming !== "on_each_run_settled") {
    return;
  }
  const tiers = args.def.rewards.scoreTierRewards;
  if (!tiers?.length) return;

  const inst = await ctx.db.get(args.instanceId);
  if (!inst) return;

  const agg = instanceAggregationForRanking(inst.scoreAggregation);
  const row = await ctx.db
    .query("casual_instance_player_state")
    .withIndex("by_instance_uid", (q) => q.eq("instanceId", args.instanceId).eq("uid", args.uid))
    .first();
  if (!row) return;

  const newAgg = aggregatedScoreForInstanceRow(row, agg);
  const issued = await ctx.db
    .query("casual_score_tier_pending")
    .withIndex("by_instance_uid", (q) => q.eq("instanceId", args.instanceId).eq("uid", args.uid))
    .collect();
  const previouslyClaimed = new Set(issued.map((r) => r.minScore));
  const sortedTiers = [...tiers].sort((a, b) => a.minScore - b.minScore);
  const toGrant = sortedTiers.filter(
    (t) => newAgg >= t.minScore && !previouslyClaimed.has(t.minScore)
  );
  for (const t of toGrant) {
    const tc = t.coins != null ? Math.max(0, Math.floor(t.coins)) : 0;
    const tg = t.gems != null ? Math.max(0, Math.floor(t.gems)) : 0;
    if (tc === 0 && tg === 0) continue;
    await ctx.db.insert("casual_score_tier_pending", {
      uid: args.uid,
      instanceId: args.instanceId,
      runTournamentId: args.runTournamentId,
      templateId: args.def.tournamentId,
      minScore: t.minScore,
      matchGameId: args.matchGameId,
      gameType: args.gameType,
      coins: tc,
      gems: tg,
      status: "pending",
      createdAt: args.now,
    });
  }
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

function findRankRewardEntry(
  rankRewards: CasualRankRewardEntry[] | undefined,
  rank: number
): CasualRankRewardEntry | undefined {
  if (!rankRewards?.length) return undefined;
  return rankRewards.find((rw) => {
    const [minR, maxR] = rw.rankRange;
    return rank >= minR && rank <= maxR;
  });
}

/** 按 `minScore` 从高到低，命中首个 `score >= minScore`（最高满足档）。 */
function findScoreTierRewardEntry(
  tiers: CasualScoreTierRewardEntry[] | undefined,
  score: number
): CasualScoreTierRewardEntry | undefined {
  if (!tiers?.length) return undefined;
  const sorted = [...tiers].sort((a, b) => b.minScore - a.minScore);
  return sorted.find((t) => score >= t.minScore);
}

function aggregatedScoreForInstanceRow(
  row: { bestScore?: number; sumScore?: number; matchCount: number },
  agg: "best_score" | "sum_scores"
): number {
  if (row.matchCount <= 0) return 0;
  if (agg === "sum_scores") return row.sumScore ?? 0;
  return row.bestScore ?? 0;
}

/** 实例表 `scoreAggregation` 含 `single_match`；周期榜排行与 `aggregatedScoreForInstanceRow` 仅区分求和 vs 取高 */
function instanceAggregationForRanking(
  stored: "single_match" | "best_score" | "sum_scores"
): "best_score" | "sum_scores" {
  return stored === "sum_scores" ? "sum_scores" : "best_score";
}

export async function leaderboardRowsFromInstance(
  ctx: QueryCtx,
  instanceId: Id<"casual_tournament_instances">,
  limit: number,
  opts?: { allowClosed?: boolean }
): Promise<Array<{ rank: number; uid: string; score: number; submittedAt?: number }>> {
  const inst = await ctx.db.get(instanceId);
  if (!inst) {
    return [];
  }
  if (inst.status !== "open" && !opts?.allowClosed) {
    return [];
  }
  const rows = await ctx.db
    .query("casual_instance_player_state")
    .withIndex("by_instance_uid", (q) => q.eq("instanceId", instanceId))
    .collect();
  const agg = instanceAggregationForRanking(inst.scoreAggregation);
  const scored = rows
    .filter((r) => r.matchCount > 0)
    .map((r) => ({
      uid: r.uid,
      score: aggregatedScoreForInstanceRow(r, agg),
      submittedAt: r.updatedAt ?? r._creationTime,
    }));
  scored.sort((a, b) => b.score - a.score || (b.submittedAt ?? 0) - (a.submittedAt ?? 0));
  return scored.slice(0, limit).map((r, i) => ({
    rank: i + 1,
    uid: r.uid,
    score: r.score,
    submittedAt: r.submittedAt,
  }));
}

/**
 * 与 `leaderboardRowsFromInstance` 同一聚合与排序；在完整榜中定位 `uid` 的名次与分数。
 * 仅 `matchCount > 0` 计入；实例非 open 时返回 null（与缺省榜查询一致）。
 */
export async function computePeriodInstanceSelfStanding(
  ctx: QueryCtx,
  instanceId: Id<"casual_tournament_instances">,
  uid: string
): Promise<{ rank: number; score: number } | null> {
  const inst = await ctx.db.get(instanceId);
  if (!inst || inst.status !== "open") {
    return null;
  }
  const rows = await ctx.db
    .query("casual_instance_player_state")
    .withIndex("by_instance_uid", (q) => q.eq("instanceId", instanceId))
    .collect();
  const agg = instanceAggregationForRanking(inst.scoreAggregation);
  const scored = rows
    .filter((r) => r.matchCount > 0)
    .map((r) => ({
      uid: r.uid,
      score: aggregatedScoreForInstanceRow(r, agg),
      submittedAt: r.updatedAt ?? r._creationTime,
    }));
  scored.sort((a, b) => b.score - a.score || (b.submittedAt ?? 0) - (a.submittedAt ?? 0));
  const idx = scored.findIndex((r) => r.uid === uid);
  if (idx < 0) return null;
  return { rank: idx + 1, score: scored[idx]!.score };
}

/**
 * 将「仍为 open」的 `casual_tournament_instances` 做周期收尾（与到期 cron 同一套排行/发奖/关桶逻辑）。
 * 调用方需保证业务上允许提前关桶（例如仍有进行中的 run，玩家仍可交分直至 match 逻辑处理完毕；本函数不主动取消 open run）。
 */
async function settleOpenCasualTournamentInstanceCore(
  ctx: MutationCtx,
  inst: {
    _id: Id<"casual_tournament_instances">;
    templateId: string;
    status: "open" | "closed";
    scoreAggregation: "single_match" | "best_score" | "sum_scores";
  },
  now: number
): Promise<void> {
  if (inst.status !== "open") return;
  const def = getTournamentDefinition(inst.templateId);
  if (!def || !isPeriodScopedTournament(def)) {
    await ctx.db.patch(inst._id, { status: "closed", updatedAt: now });
    return;
  }
  const players = await ctx.db
    .query("casual_instance_player_state")
    .withIndex("by_instance_uid", (q) => q.eq("instanceId", inst._id))
    .collect();
  const activePlayers = players.filter((p) => p.matchCount > 0);
  const agg = instanceAggregationForRanking(inst.scoreAggregation);
  const ranked = [...activePlayers].sort(
    (a, b) =>
      aggregatedScoreForInstanceRow(b, agg) - aggregatedScoreForInstanceRow(a, agg) ||
      (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  );
  const seasonIdRow = await activeSeasonWindowForCtx(ctx);
  const seasonId = seasonIdRow?.seasonId ?? null;

  let rankCounter = 0;
  for (const p of ranked) {
    rankCounter++;
    const rank = rankCounter;
    const aggScore = aggregatedScoreForInstanceRow(p, agg);
    const pending: {
      coins?: number;
      gems?: number;
      seasonVoucher?: number;
    } = {};
    const baseCoins = casualSettleBaseCoins(def);
    const baseGems = casualSettleBaseGems(def);
    if (baseCoins > 0) pending.coins = (pending.coins ?? 0) + baseCoins;
    if (baseGems > 0) pending.gems = (pending.gems ?? 0) + baseGems;
    const rr = findRankRewardEntry(def.rewards.rankRewards, rank);
    if (rr) {
      const mult = (rr as { multiplier?: number }).multiplier ?? 1;
      const rc = rr.coins != null ? Math.floor(rr.coins * mult) : 0;
      const rg = rr.gems != null ? Math.floor(rr.gems * mult) : 0;
      if (rc > 0) pending.coins = (pending.coins ?? 0) + rc;
      if (rg > 0) pending.gems = (pending.gems ?? 0) + rg;
    }
    const tierTiming = def.rewards.scoreTierRewardsGrantTiming ?? "period_instance_close";
    if (tierTiming !== "on_each_run_settled") {
      const st = findScoreTierRewardEntry(def.rewards.scoreTierRewards, aggScore);
      if (st) {
        const tc = st.coins != null ? Math.max(0, Math.floor(st.coins)) : 0;
        const tg = st.gems != null ? Math.max(0, Math.floor(st.gems)) : 0;
        if (tc > 0) pending.coins = (pending.coins ?? 0) + tc;
        if (tg > 0) pending.gems = (pending.gems ?? 0) + tg;
      }
    }
    const pruned = prunePendingWalletRewards(pending);

    let passXpDelta = def.seasonXpOnSettle;
    if (def.seasonXpOnSettle > 0) {
      const xpMods = await ctx.runQuery(
        internal.service.activity.casualActivityService.resolveSeasonActivityModifiers,
        { tournamentId: inst.templateId }
      );
      passXpDelta = applyPassXpFromModifiers(
        def.seasonXpOnSettle,
        xpMods.passXpMultiplier,
        xpMods.passXpDelta
      );
    }
    if (passXpDelta > 0) {
      await ctx.runMutation(internal.service.season.casualSeasonService.addPassXpFromRun, {
        uid: p.uid,
        deltaXp: passXpDelta,
      });
    }

    await ctx.db.patch(p._id, {
      finalRank: rank,
      aggregatedScore: aggScore,
      ...(pruned ? { pendingInstanceRewards: pruned } : {}),
      updatedAt: now,
    });
  }

  await ctx.db.patch(inst._id, { status: "closed", updatedAt: now });
}

export const finalizeExpiredCasualTournamentInstances = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db.query("casual_tournament_instances").collect();
    const due = all.filter((i) => i.status === "open" && i.endsAt < now);
    let closed = 0;
    for (const inst of due) {
      await settleOpenCasualTournamentInstanceCore(ctx, inst, now);
      closed++;
    }
    return { ok: true as const, closed };
  },
});

/**
 * 后台强制结算：未到 `endsAt` 仍为 `open` 的周期型实例，或显式指定实例 id。
 * 仅 `internalMutation`，在 Convex Dashboard 或 `npx convex run` 调用；勿对前端暴露。
 */
export const forceFinalizeCasualTournamentInstances = internalMutation({
  args: {
    instanceIds: v.optional(v.array(v.id("casual_tournament_instances"))),
    /** 为 true 时结算所有「open 且 endsAt >= now」且模板为周期型的桶（慎用） */
    allOpenNotExpiredPeriodScoped: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let settled = 0;
    const ids = args.instanceIds;
    if (ids && ids.length > 0) {
      for (const id of ids) {
        const inst = await ctx.db.get(id);
        if (!inst || inst.status !== "open") continue;
        const def = getTournamentDefinition(inst.templateId);
        if (!def || !isPeriodScopedTournament(def)) continue;
        await settleOpenCasualTournamentInstanceCore(ctx, inst, now);
        settled++;
      }
      return { ok: true as const, settled };
    }
    if (args.allOpenNotExpiredPeriodScoped) {
      const all = await ctx.db.query("casual_tournament_instances").collect();
      for (const inst of all) {
        if (inst.status !== "open" || inst.endsAt < now) continue;
        const def = getTournamentDefinition(inst.templateId);
        if (!def || !isPeriodScopedTournament(def)) continue;
        await settleOpenCasualTournamentInstanceCore(ctx, inst, now);
        settled++;
      }
      return { ok: true as const, settled };
    }
    return {
      ok: false as const,
      error: "specify_instance_ids_or_allOpenNotExpiredPeriodScoped" as const,
    };
  },
});

export const claimCasualInstanceRewards = authedMutation({
  args: {
    instancePlayerStateId: v.id("casual_instance_player_state"),
  },
  handler: async (ctx, { instancePlayerStateId }) => {
    const uid = ctx.uid;
    const row = await ctx.db.get(instancePlayerStateId);
    if (!row || row.uid !== uid) {
      return { ok: false as const, error: "forbidden" as const };
    }
    if (row.instanceRewardsClaimedAt != null) {
      return { ok: false as const, error: "already_claimed" as const };
    }
    const pending = row.pendingInstanceRewards;
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
      if (!gr.ok) return { ok: false as const, error: "grant_failed" as const };
    }
    if ((pr.gems ?? 0) > 0) {
      const gr = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "gems",
        amount: pr.gems!,
      });
      if (!gr.ok) return { ok: false as const, error: "grant_failed" as const };
    }
    if ((pr.seasonVoucher ?? 0) > 0) {
      const gr = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "seasonVoucher",
        amount: pr.seasonVoucher!,
      });
      if (!gr.ok) return { ok: false as const, error: "grant_failed" as const };
    }
    await ctx.db.patch(row._id, {
      pendingInstanceRewards: undefined,
      instanceRewardsClaimedAt: now,
      updatedAt: now,
    });
    return { ok: true as const };
  },
});

/**
 * 周期型锦标：仅「实例已关闭且已参与至少一局」的桶级记录（结算后一条），
 * 含待领取与已领取，供历史页展示；非周期玩法请用 `gameHistory`。
 */
export const listInstancePendingRewards = authedQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const uid = ctx.uid;
    const n = Math.min(Math.max(limit ?? 20, 1), 50);
    const mine = await ctx.db
      .query("casual_instance_player_state")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();
    const out: Array<{
      instancePlayerStateId: string;
      templateId: string;
      title: string;
      instanceKey: string;
      matchType: string;
      finalRank: number | null;
      aggregatedScore: number | null;
      canClaim: boolean;
      pendingInstanceRewards: ReturnType<typeof prunePendingWalletRewards>;
      rewardsClaimedAt: number | null;
      periodEndedAt: number;
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
      const canClaim = Boolean(pr && s.instanceRewardsClaimedAt == null);
      out.push({
        instancePlayerStateId: String(s._id),
        templateId: inst.templateId,
        title: def?.title ?? inst.templateId,
        instanceKey: inst.instanceKey,
        matchType: def.matchType,
        finalRank: s.finalRank ?? null,
        aggregatedScore: s.aggregatedScore ?? null,
        canClaim,
        pendingInstanceRewards: pr ?? undefined,
        rewardsClaimedAt: s.instanceRewardsClaimedAt ?? null,
        periodEndedAt: inst.endsAt,
      });
    }
    out.sort((a, b) => b.periodEndedAt - a.periodEndedAt);
    return out.slice(0, n);
  },
});
