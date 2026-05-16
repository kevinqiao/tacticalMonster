import type { MutationCtx } from "../../_generated/server";
import { dailyPeriodKey } from "../../utils/casualTaskPeriod";
import {
  DAILY_COINS_CAP,
  DAILY_SEASON_POINTS_CAP,
  decayMultiplier,
  scaleFloor,
  SEASON_POINTS_DECAY_BY_ORDINAL,
  WALLET_DECAY_BY_ORDINAL,
  type PayoutBucket,
} from "../../data/casualPayoutPolicy";

export type PayoutRollup = {
  ordinal: number;
  walletDecay: number;
  seasonDecay: number;
  coinsCapRemaining: number;
  seasonPointsCapRemaining: number;
};

async function getOrCreateRollup(
  ctx: MutationCtx,
  uid: string,
  bucket: PayoutBucket,
  nowMs: number
) {
  const periodKey = dailyPeriodKey(nowMs);
  const existing = await ctx.db
    .query("casual_payout_daily_counters")
    .withIndex("by_uid_period_bucket", (q) =>
      q.eq("uid", uid).eq("periodKey", periodKey).eq("bucket", bucket)
    )
    .unique();
  if (existing) return existing;
  const id = await ctx.db.insert("casual_payout_daily_counters", {
    uid,
    periodKey,
    bucket,
    settledCount: 0,
    coinsGrantedToday: 0,
    seasonPointsGrantedToday: 0,
    updatedAt: nowMs,
  });
  return (await ctx.db.get(id))!;
}

/** 本场计奖前的序号与衰减；调用方结算后须 `recordPayoutRollupApplied`。 */
export async function resolvePayoutRollup(
  ctx: MutationCtx,
  uid: string,
  bucket: PayoutBucket,
  nowMs: number
): Promise<PayoutRollup> {
  const row = await getOrCreateRollup(ctx, uid, bucket, nowMs);
  const ordinal = row.settledCount;
  const coinsCap = DAILY_COINS_CAP[bucket] ?? Number.POSITIVE_INFINITY;
  const seasonCap = DAILY_SEASON_POINTS_CAP[bucket] ?? Number.POSITIVE_INFINITY;
  return {
    ordinal,
    walletDecay: decayMultiplier(ordinal, WALLET_DECAY_BY_ORDINAL),
    seasonDecay: decayMultiplier(ordinal, SEASON_POINTS_DECAY_BY_ORDINAL),
    coinsCapRemaining: Math.max(0, coinsCap - row.coinsGrantedToday),
    seasonPointsCapRemaining: Math.max(0, seasonCap - row.seasonPointsGrantedToday),
  };
}

export async function recordPayoutRollupApplied(
  ctx: MutationCtx,
  uid: string,
  bucket: PayoutBucket,
  applied: { coins?: number; seasonPoints?: number },
  nowMs: number
): Promise<void> {
  const periodKey = dailyPeriodKey(nowMs);
  const row = await ctx.db
    .query("casual_payout_daily_counters")
    .withIndex("by_uid_period_bucket", (q) =>
      q.eq("uid", uid).eq("periodKey", periodKey).eq("bucket", bucket)
    )
    .unique();
  if (!row) return;
  await ctx.db.patch(row._id, {
    settledCount: row.settledCount + 1,
    coinsGrantedToday: row.coinsGrantedToday + Math.max(0, applied.coins ?? 0),
    seasonPointsGrantedToday:
      row.seasonPointsGrantedToday + Math.max(0, applied.seasonPoints ?? 0),
    updatedAt: nowMs,
  });
}

export function applyCoinsCap(amount: number, rollup: PayoutRollup): number {
  const scaled = scaleFloor(amount, rollup.walletDecay);
  return Math.min(scaled, rollup.coinsCapRemaining);
}

export function applySeasonPointsCap(amount: number, rollup: PayoutRollup): number {
  const scaled = scaleFloor(amount, rollup.seasonDecay);
  return Math.min(scaled, rollup.seasonPointsCapRemaining);
}
