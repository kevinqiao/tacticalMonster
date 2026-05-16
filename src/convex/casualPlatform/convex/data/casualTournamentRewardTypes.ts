/**
 * 休闲异步锦标奖励类型：与 TacticalMonster `RewardConfig`（tournament 模块）对齐，
 * 并扩展钻石等休闲经济字段；结算逻辑以 `baseRewards` 为主，排名/表现档可后续接入。
 */
import type { RewardConfig as TacticalMonsterRewardConfig } from "../../../tournament/convex/data/tournamentConfigTypes";

export type CasualRankRewardEntry =
  NonNullable<TacticalMonsterRewardConfig["rankRewards"]>[number] & {
    gems?: number;
    /** 多人一局按名次结算赛季分（可负）；单机/周期日榜仍用 `seasonPointsMultiplier × 分数`。 */
    seasonPoints?: number;
  };

/**
 * 周期实例收尾时按聚合分命中「最高满足」的一档（`minScore` 从高到低首个 `score >= minScore`），
 * 与 TM `performanceRewards` 不同：仅休闲金币/钻，不含碎片/体力/宝箱。
 */
export type CasualScoreTierRewardEntry = {
  minScore: number;
  coins?: number;
  gems?: number;
};

/** 分数档发放时机；缺省等价 `period_instance_close` */
export type CasualScoreTierRewardsGrantTiming =
  | "period_instance_close"
  | "on_each_run_settled";

/** 对齐 TM `RewardConfig`，`baseRewards` / `rankRewards` 可含 `gems` */
export type CasualPlatformRewardConfig = Omit<
  TacticalMonsterRewardConfig,
  "baseRewards" | "rankRewards"
> & {
  baseRewards: TacticalMonsterRewardConfig["baseRewards"] & {
    gems?: number;
  };
  rankRewards?: CasualRankRewardEntry[];
  /**
   * 按分数档追加奖励。
   * - `period_instance_close`（缺省）：桶收尾时按当日聚合分命中**最高一档**写入 `pendingInstanceRewards`。
   * - `on_each_run_settled`：每局结算写入 `casual_score_tier_pending`（每条一档、历史页手动领取）；桶收尾不再发分档。
   */
  scoreTierRewards?: CasualScoreTierRewardEntry[];
  scoreTierRewardsGrantTiming?: CasualScoreTierRewardsGrantTiming;
  /**
   * 多人结算且传了最终名次时，若名次未落入任何含 `seasonPoints` 的 `rankRewards` 行，
   * 使用本值（可负）；缺省为 0。
   */
  seasonPointsRankMissPenalty?: number;
};
