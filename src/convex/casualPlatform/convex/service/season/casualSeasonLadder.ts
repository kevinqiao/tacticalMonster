import type { CasualTournamentDefinition } from "../../data/casualTournamentConfigs";
import {
  computeCasualLadderTier,
  resolveCasualLadderPointsDelta,
} from "../../data/casualSeasonLadderConfig";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export async function applySeasonLadderPointsDelta(
  ctx: MutationCtx,
  seasonId: string,
  uid: string,
  pointsDelta: number
): Promise<number> {
  if (pointsDelta === 0) return 0;
  const now = Date.now();
  const row = await ctx.db
    .query("casual_player_season_ladder")
    .withIndex("by_season_uid", (q) => q.eq("seasonId", seasonId).eq("uid", uid))
    .unique();
  const prevTotal = row?.points ?? 0;
  const nextTotal = Math.max(0, prevTotal + pointsDelta);
  if (!row) {
    await ctx.db.insert("casual_player_season_ladder", {
      uid,
      seasonId,
      points: nextTotal,
      updatedAt: now,
    });
  } else {
    await ctx.db.patch(row._id, { points: nextTotal, updatedAt: now });
  }
  return nextTotal - prevTotal;
}

export async function applyCasualTemplateLadderDelta(
  ctx: MutationCtx,
  seasonId: string,
  def: CasualTournamentDefinition,
  args: { uid: string; score: number; multiplayerFinalRank?: number }
): Promise<number> {
  const delta = resolveCasualLadderPointsDelta(def, args);
  if (delta == null) return 0;
  return applySeasonLadderPointsDelta(ctx, seasonId, args.uid, delta);
}

export type SeasonLadderSnapshot = {
  seasonId: string;
  points: number;
  tierId: string;
  rankInTier: number;
  tierSize: number;
};

export async function buildSeasonLadderSnapshot(
  ctx: QueryCtx,
  seasonId: string,
  uid: string
): Promise<SeasonLadderSnapshot> {
  const row = await ctx.db
    .query("casual_player_season_ladder")
    .withIndex("by_season_uid", (q) => q.eq("seasonId", seasonId).eq("uid", uid))
    .unique();
  const points = Math.max(0, row?.points ?? 0);
  const tierId = computeCasualLadderTier(points);

  const all = await ctx.db
    .query("casual_player_season_ladder")
    .withIndex("by_season", (q) => q.eq("seasonId", seasonId))
    .collect();
  const inTier = all.filter((r) => computeCasualLadderTier(Math.max(0, r.points)) === tierId);
  const rankInTier =
    inTier.filter((r) => Math.max(0, r.points) > points).length + 1;

  return {
    seasonId,
    points,
    tierId,
    rankInTier,
    tierSize: inTier.length,
  };
}

export async function seasonLadderLeaderboardRows(
  ctx: QueryCtx,
  seasonId: string,
  limit: number
): Promise<Array<{ rank: number; uid: string; points: number; tierId: string }>> {
  const rows = await ctx.db
    .query("casual_player_season_ladder")
    .withIndex("by_season", (q) => q.eq("seasonId", seasonId))
    .collect();
  const sorted = [...rows]
    .map((r) => ({ ...r, points: Math.max(0, r.points) }))
    .sort((a, b) => b.points - a.points || a.uid.localeCompare(b.uid));
  return sorted.slice(0, limit).map((r, i) => ({
    rank: i + 1,
    uid: r.uid,
    points: r.points,
    tierId: computeCasualLadderTier(r.points),
  }));
}
