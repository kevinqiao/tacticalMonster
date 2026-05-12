/**
 * 休闲异步锦标奖励类型：与 TacticalMonster `RewardConfig`（tournament 模块）对齐，
 * 并扩展钻石等休闲经济字段；结算逻辑以 `baseRewards` 为主，排名/表现档可后续接入。
 */
import type { RewardConfig as TacticalMonsterRewardConfig } from "../../../tournament/convex/data/tournamentConfigTypes";

export type CasualRankRewardEntry =
  NonNullable<TacticalMonsterRewardConfig["rankRewards"]>[number] & {
    gems?: number;
  };

/** 对齐 TM `RewardConfig`，`baseRewards` / `rankRewards` 可含 `gems` */
export type CasualPlatformRewardConfig = Omit<
  TacticalMonsterRewardConfig,
  "baseRewards" | "rankRewards"
> & {
  baseRewards: TacticalMonsterRewardConfig["baseRewards"] & {
    gems?: number;
  };
  rankRewards?: CasualRankRewardEntry[];
};
