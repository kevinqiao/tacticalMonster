import { authedQuery } from "../../custom/session";
import type { PayoutBucket } from "../../data/casualPayoutPolicy";
import { dailyPeriodKey } from "../../utils/casualTaskPeriod";
import { buildDailyGrowthBucketRow } from "./casualPayoutDailyService";

const PAYOUT_BUCKETS: PayoutBucket[] = ["async", "season_challenge", "solo_p75"];

/** Play 顶栏「今日成长」：三 bucket 当日场次 / XP 递减 / p75 金币软顶。 */
export const getDailyGrowthProgress = authedQuery({
  args: {},
  handler: async (ctx) => {
    const uid = ctx.uid;
    const now = Date.now();
    const periodKey = dailyPeriodKey(now);
    const buckets = [];
    for (const bucket of PAYOUT_BUCKETS) {
      const row = await ctx.db
        .query("casual_payout_daily_counters")
        .withIndex("by_uid_period_bucket", (q) =>
          q.eq("uid", uid).eq("periodKey", periodKey).eq("bucket", bucket)
        )
        .unique();
      buckets.push(
        buildDailyGrowthBucketRow(
          bucket,
          row?.settledCount ?? 0,
          row?.coinsGrantedToday ?? 0
        )
      );
    }
    return { periodKey, buckets };
  },
});
