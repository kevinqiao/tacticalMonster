import type { MutationCtx } from "../../_generated/server";
import { dailyPeriodKey } from "../../utils/casualTaskPeriod";
import {
  decayMultiplier,
  XP_DECAY_BY_ORDINAL,
  type PayoutBucket,
} from "../../data/casualPayoutPolicy";
import { DAILY_P75_COINS_SOFT_CAP } from "../../data/casualSeasonEconomyConstants";

/** 纯函数：p75 当日金币软顶裁剪（单测用）。 */
export function capP75DailyCoins(
  proposedCoins: number,
  coinsGrantedToday: number,
  cap: number = DAILY_P75_COINS_SOFT_CAP
): number {
  if (proposedCoins <= 0) return 0;
  const left = Math.max(0, cap - Math.max(0, coinsGrantedToday));
  return Math.min(proposedCoins, left);
}

/**
 * 当日 payout bucket 场次序号 → League/Pass XP 递减乘子。
 * Bucket：`async` | `season_challenge` | `solo_p75`（见 casualPayoutPolicy）。
 * 币/钻/券不衰减（入场费已是水槽，见 casualPayoutPolicy 头注）。
 */
export type PayoutRollup = {
  ordinal: number;
  xpDecay: number;
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
    updatedAt: nowMs,
  });
  return (await ctx.db.get(id))!;
}

/** 本场结算前的序号与 XP 递减乘子；调用方结算后须 `recordPayoutRollupApplied` 自增序号。 */
export async function resolvePayoutRollup(
  ctx: MutationCtx,
  uid: string,
  bucket: PayoutBucket,
  nowMs: number
): Promise<PayoutRollup> {
  const row = await getOrCreateRollup(ctx, uid, bucket, nowMs);
  const ordinal = row.settledCount;
  return {
    ordinal,
    xpDecay: decayMultiplier(ordinal, XP_DECAY_BY_ORDINAL),
  };
}

/** 自增当日该 bucket 的结算场次序号（驱动 XP 递减阶梯）。 */
export async function recordPayoutRollupApplied(
  ctx: MutationCtx,
  uid: string,
  bucket: PayoutBucket,
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
    updatedAt: nowMs,
  });
}

/** 当日满额 Pass/League XP 场次数（与 XP_DECAY_BY_ORDINAL 前三档对齐） */
export const DAILY_GROWTH_FULL_XP_GAMES = 8;

export type DailyGrowthBucketRow = {
  bucket: PayoutBucket;
  settledCount: number;
  nextXpDecayMultiplier: number;
  fullXpSlotsUsed: number;
  fullXpSlotsTotal: number;
  xpOrdinalDecayEnabled: boolean;
  coinsGrantedToday?: number;
  coinsDailyCap?: number;
};

export function buildDailyGrowthBucketRow(
  bucket: PayoutBucket,
  settledCount: number,
  coinsGrantedToday = 0
): DailyGrowthBucketRow {
  const xpOrdinalDecayEnabled = bucket !== "season_challenge";
  const nextXpDecayMultiplier = xpOrdinalDecayEnabled
    ? decayMultiplier(settledCount, XP_DECAY_BY_ORDINAL)
    : 1;
  return {
    bucket,
    settledCount: Math.max(0, settledCount),
    nextXpDecayMultiplier,
    fullXpSlotsUsed: xpOrdinalDecayEnabled
      ? Math.min(Math.max(0, settledCount), DAILY_GROWTH_FULL_XP_GAMES)
      : 0,
    fullXpSlotsTotal: DAILY_GROWTH_FULL_XP_GAMES,
    xpOrdinalDecayEnabled,
    ...(bucket === "solo_p75"
      ? {
          coinsGrantedToday: Math.max(0, coinsGrantedToday),
          coinsDailyCap: DAILY_P75_COINS_SOFT_CAP,
        }
      : {}),
  };
}

/** p75：裁剪并累计当日已发金币（`solo_p75` bucket · coinsGrantedToday）。 */
export async function applyP75DailyCoinCap(
  ctx: MutationCtx,
  uid: string,
  proposedCoins: number,
  nowMs: number
): Promise<number> {
  if (proposedCoins <= 0) return 0;
  const row = await getOrCreateRollup(ctx, uid, "solo_p75", nowMs);
  const granted = capP75DailyCoins(proposedCoins, row.coinsGrantedToday);
  if (granted <= 0) return 0;
  await ctx.db.patch(row._id, {
    coinsGrantedToday: row.coinsGrantedToday + granted,
    updatedAt: nowMs,
  });
  return granted;
}
