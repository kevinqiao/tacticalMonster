/** 固定开箱奖池（Pass / 任务等）；与已下线的赛季货架无关 */

const RE_S_SUFFIX = /_s\d+$/i;

export const FIXED_CHEST_TABLES: Record<
  string,
  Array<{ kind: "coins" | "gems" | "seasonVoucher" | "seasonXp"; amount: number }>
> = {
  chest_season_memorial_s1: [
    { kind: "coins", amount: 100 },
    { kind: "seasonVoucher", amount: 1 },
  ],
  chest_season_challenge_supply_small_s1: [
    { kind: "coins", amount: 80 },
    { kind: "seasonXp", amount: 25 },
  ],
  chest_ss_title_s1: [
    { kind: "gems", amount: 3 },
    { kind: "seasonXp", amount: 120 },
  ],
  chest_pass_milestone_1: [
    { kind: "gems", amount: 3 },
    { kind: "seasonXp", amount: 80 },
  ],
};

export type FixedChestGrant = Array<{
  kind: "coins" | "gems" | "seasonVoucher" | "seasonXp";
  amount: number;
}>;

/** 未单独配 `chest_*_s2` 等表时，回退到同 stem 的 `_s1` 奖池 */
export function resolveFixedChestTable(chestId: string): FixedChestGrant | undefined {
  const direct = FIXED_CHEST_TABLES[chestId];
  if (direct) return direct;
  const canonical = chestId.replace(RE_S_SUFFIX, "_s1");
  if (canonical !== chestId) {
    return FIXED_CHEST_TABLES[canonical];
  }
  return undefined;
}
