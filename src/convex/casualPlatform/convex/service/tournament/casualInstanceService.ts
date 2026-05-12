/**
 * 周期型锦标：实例建桶、局后聚合分、到期收尾与待领奖励。
 */
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internalMutation, mutation, query } from "../../_generated/server";
import { resolveInstanceWindow, type ActiveSeasonWindow } from "../../data/casualInstanceWindow";
import type { CasualTournamentDefinition } from "../../data/casualTournamentConfigs";
import {
  applyPassXpFromModifiers,
  casualSettleBaseCoins,
  casualSettleBaseGems,
  effectiveScoreAggregation,
  getTournamentDefinition,
  isPeriodScopedTournament,
  seasonPointsFromScore,
} from "../../data/casualTournamentConfigs";
import type { CasualRankRewardEntry } from "../../data/casualTournamentRewardTypes";

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

function prunePendingWalletRewards(p: {
  coins?: number;
  gems?: number;
  seasonChallengePoints?: number;
  seasonVoucher?: number;
}):
  | {
      coins?: number;
      gems?: number;
      seasonChallengePoints?: number;
      seasonVoucher?: number;
    }
  | undefined {
  const o: {
    coins?: number;
    gems?: number;
    seasonChallengePoints?: number;
    seasonVoucher?: number;
  } = {};
  if ((p.coins ?? 0) > 0) o.coins = p.coins;
  if ((p.gems ?? 0) > 0) o.gems = p.gems;
  if ((p.seasonChallengePoints ?? 0) > 0) o.seasonChallengePoints = p.seasonChallengePoints;
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

function aggregatedScoreForInstanceRow(
  row: { bestScore?: number; sumScore?: number; matchCount: number },
  agg: "best_score" | "sum_scores"
): number {
  if (row.matchCount <= 0) return 0;
  if (agg === "sum_scores") return row.sumScore ?? 0;
  return row.bestScore ?? 0;
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
  const agg = inst.scoreAggregation;
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

export const finalizeExpiredCasualTournamentInstances = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db.query("casual_tournament_instances").collect();
    const due = all.filter((i) => i.status === "open" && i.endsAt < now);
    let closed = 0;
    for (const inst of due) {
      const def = getTournamentDefinition(inst.templateId);
      if (!def || !isPeriodScopedTournament(def)) {
        await ctx.db.patch(inst._id, { status: "closed", updatedAt: now });
        closed++;
        continue;
      }
      const players = await ctx.db
        .query("casual_instance_player_state")
        .withIndex("by_instance_uid", (q) => q.eq("instanceId", inst._id))
        .collect();
      const activePlayers = players.filter((p) => p.matchCount > 0);
      const agg = inst.scoreAggregation;
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
          seasonChallengePoints?: number;
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
          const rg =
            rr.gems != null ? Math.floor(rr.gems * mult) : 0;
          if (rc > 0) pending.coins = (pending.coins ?? 0) + rc;
          if (rg > 0) pending.gems = (pending.gems ?? 0) + rg;
        }
        const pruned = prunePendingWalletRewards(pending);

        if (seasonId) {
          const pointsDelta = seasonPointsFromScore(aggScore, def.seasonPointsMultiplier);
          if (pointsDelta > 0) {
            const stat = await ctx.db
              .query("casual_player_season_stats")
              .withIndex("by_season_uid", (q) => q.eq("seasonId", seasonId).eq("uid", p.uid))
              .unique();
            const addMain = pointsDelta;
            const addC = def.matchType === "tournament_c" ? pointsDelta : 0;
            if (!stat) {
              await ctx.db.insert("casual_player_season_stats", {
                uid: p.uid,
                seasonId,
                mainSeasonPoints: addMain,
                cArenaPoints: addC,
                updatedAt: now,
              });
            } else {
              await ctx.db.patch(stat._id, {
                mainSeasonPoints: stat.mainSeasonPoints + addMain,
                cArenaPoints: stat.cArenaPoints + addC,
                updatedAt: now,
              });
            }
          }
        }

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
      closed++;
    }
    return { ok: true as const, closed };
  },
});

export const claimCasualInstanceRewards = mutation({
  args: {
    uid: v.string(),
    instancePlayerStateId: v.id("casual_instance_player_state"),
  },
  handler: async (ctx, { uid, instancePlayerStateId }) => {
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
      seasonChallengePoints: pending?.seasonChallengePoints,
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
    if ((pr.seasonChallengePoints ?? 0) > 0) {
      const gr = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "seasonChallengePoints",
        amount: pr.seasonChallengePoints!,
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

export const listInstancePendingRewards = query({
  args: { uid: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { uid, limit }) => {
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
      finalRank: number | null;
      aggregatedScore: number | null;
      canClaim: boolean;
      pendingInstanceRewards: ReturnType<typeof prunePendingWalletRewards>;
    }> = [];
    for (const s of mine) {
      const inst = await ctx.db.get(s.instanceId);
      if (!inst) continue;
      const def = getTournamentDefinition(inst.templateId);
      const pr = prunePendingWalletRewards({
        coins: s.pendingInstanceRewards?.coins,
        gems: s.pendingInstanceRewards?.gems,
        seasonChallengePoints: s.pendingInstanceRewards?.seasonChallengePoints,
        seasonVoucher: s.pendingInstanceRewards?.seasonVoucher,
      });
      const canClaim = Boolean(pr && s.instanceRewardsClaimedAt == null && inst.status === "closed");
      if (!canClaim) continue;
      out.push({
        instancePlayerStateId: String(s._id),
        templateId: inst.templateId,
        title: def?.title ?? inst.templateId,
        instanceKey: inst.instanceKey,
        finalRank: s.finalRank ?? null,
        aggregatedScore: s.aggregatedScore ?? null,
        canClaim,
        pendingInstanceRewards: pr ?? undefined,
      });
    }
    out.sort((a, b) => (b.finalRank ?? 0) - (a.finalRank ?? 0));
    return out.slice(0, n);
  },
});
