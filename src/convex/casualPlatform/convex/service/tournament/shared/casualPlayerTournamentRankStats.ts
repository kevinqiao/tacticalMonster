import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { isCasualMultiplayerAsyncTemplate } from "../../../data/casualPlayerStrategyTypes";
import { getTournamentDefinition } from "../../../data/casualTournamentConfigs";
import {
  CASUAL_RANK_STAT_BUCKET_MAX,
  collapseActualRankToStatBucket,
  normalizeRankCountsForStats,
} from "./casualRankStatBuckets";

export async function loadPlayerTournamentRankCounts(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  templateId: string
): Promise<Record<number, number>> {
  const row = await ctx.db
    .query("casual_player_tournament_rank_stats")
    .withIndex("by_uid_template", (q) => q.eq("uid", uid).eq("templateId", templateId))
    .unique();
  if (!row?.rankCounts) return {};

  const raw: Record<number, number> = {};
  for (const [k, v] of Object.entries(row.rankCounts)) {
    const rank = Number(k);
    if (Number.isFinite(rank) && rank >= 1 && typeof v === "number" && v > 0) {
      raw[rank] = v;
    }
  }
  return normalizeRankCountsForStats(raw);
}

export async function incrementPlayerTournamentRankCount(
  ctx: MutationCtx,
  args: { uid: string; templateId: string; rank: number; now: number }
): Promise<void> {
  const def = getTournamentDefinition(args.templateId);
  if (!def || !isCasualMultiplayerAsyncTemplate(def)) return;
  if (!Number.isFinite(args.rank) || args.rank < 1 || args.rank > def.maxPlayers) return;

  const statBucket = collapseActualRankToStatBucket(args.rank);
  if (statBucket < 1 || statBucket > CASUAL_RANK_STAT_BUCKET_MAX) return;

  const existing = await ctx.db
    .query("casual_player_tournament_rank_stats")
    .withIndex("by_uid_template", (q) =>
      q.eq("uid", args.uid).eq("templateId", args.templateId)
    )
    .unique();

  const key = String(statBucket);
  if (existing) {
    const merged = normalizeRankCountsForStats(existing.rankCounts);
    const prev = merged[statBucket] ?? 0;
    merged[statBucket] = prev + 1;
    const rankCounts: Record<string, number> = {};
    for (let r = 1; r <= CASUAL_RANK_STAT_BUCKET_MAX; r++) {
      const n = merged[r] ?? 0;
      if (n > 0) rankCounts[String(r)] = n;
    }
    await ctx.db.patch(existing._id, {
      rankCounts,
      updatedAt: args.now,
    });
    return;
  }

  await ctx.db.insert("casual_player_tournament_rank_stats", {
    uid: args.uid,
    templateId: args.templateId,
    rankCounts: { [key]: 1 },
    updatedAt: args.now,
  });
}

export async function incrementRankCountsForSettledHumans(
  ctx: MutationCtx,
  args: {
    templateId: string;
    humanRows: Array<{ uid: string; rank?: number | null }>;
    now: number;
  }
): Promise<void> {
  for (const row of args.humanRows) {
    if (row.rank == null || !Number.isFinite(row.rank)) continue;
    await incrementPlayerTournamentRankCount(ctx, {
      uid: row.uid,
      templateId: args.templateId,
      rank: row.rank,
      now: args.now,
    });
  }
}
