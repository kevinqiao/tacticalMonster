/** 赛季货架 SKU（多支付）与固定箱表；`season_challenge` 锦标定义见 `casualTournamentConfigs` */

import { listSeasonChallengeMatchCatalog } from "./casualTournamentConfigs";

export type SeasonShelfSku =
  | {
      skuId: string;
      title: string;
      paymentMode: "voucher_only";
      voucherCost: number;
      chestId?: string;
    }
  | {
      skuId: string;
      title: string;
      paymentMode: "challenge_points_only";
      challengePointsCost: number;
      chestId?: string;
    }
  | {
      skuId: string;
      title: string;
      paymentMode: "unlock_points_and_gems";
      /** 需当前持有挑战点≥（不扣点，仅门槛） */
      unlockPointsRequired: number;
      priceGems: number;
      chestId?: string;
    };

export function seasonShelfPriceHint(sku: SeasonShelfSku): string {
  switch (sku.paymentMode) {
    case "voucher_only":
      return `${sku.voucherCost} 赛季券`;
    case "challenge_points_only":
      return `${sku.challengePointsCost} 挑战点`;
    case "unlock_points_and_gems":
      return `持有≥${sku.unlockPointsRequired} 点 + ${sku.priceGems} 钻`;
    default:
      return "";
  }
}

/** 模板行：skuId / chestId 均以 `_s{n}` 结尾；其它赛季由 `seasonShelfSkusForSeasonId` 替换后缀 */
export const SEASON_SHELF_SKUS: SeasonShelfSku[] = [
  {
    skuId: "season_challenge_memorial_chest_s1",
    title: "纪念固定箱",
    paymentMode: "voucher_only",
    voucherCost: 5,
    chestId: "chest_season_memorial_s1",
  },
  {
    skuId: "season_challenge_supply_small_s1",
    title: "补给箱·小",
    paymentMode: "challenge_points_only",
    challengePointsCost: 6,
    chestId: "chest_season_challenge_supply_small_s1",
  },
  {
    skuId: "season_challenge_title_bundle_ss_s1",
    title: "赛季称号套（占位）",
    paymentMode: "unlock_points_and_gems",
    unlockPointsRequired: 36,
    priceGems: 380,
    chestId: "chest_ss_title_s1",
  },
];

const RE_S_SUFFIX = /_s\d+$/i;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 从 `casual_s2` → `_s2`；无法解析时 `_s1` */
export function seasonShelfSuffixFromSeasonId(seasonId: string): string {
  const m = /^casual_s(\d+)$/i.exec(seasonId.trim());
  return m ? `_s${m[1]}` : "_s1";
}

/** 当前激活赛季对应的货架 SKU（数值与 S1 相同；兑奖与 `casual_season_shelf_redemptions` 按完整 skuId 区分赛季） */
export function seasonShelfSkusForSeasonId(seasonId: string): SeasonShelfSku[] {
  const suffix = seasonShelfSuffixFromSeasonId(seasonId);
  if (suffix === "_s1") {
    return SEASON_SHELF_SKUS;
  }
  const repl = (id: string) => id.replace(RE_S_SUFFIX, suffix);
  return SEASON_SHELF_SKUS.map(
    (sku) =>
      ({
        ...sku,
        skuId: repl(sku.skuId),
        ...(sku.chestId ? { chestId: repl(sku.chestId) } : {}),
      }) as SeasonShelfSku
  );
}

/** 赛季货架关联 chest 禁止 `openFixedChest` 直开（任意 `_s{n}` 后缀） */
export function isSeasonShelfLinkedChestId(chestId: string): boolean {
  for (const s of SEASON_SHELF_SKUS) {
    if (!s.chestId) continue;
    const stem = s.chestId.replace(RE_S_SUFFIX, "");
    if (new RegExp(`^${escapeRegExp(stem)}_s\\d+$`, "i").test(chestId)) {
      return true;
    }
  }
  return false;
}

export interface SeasonChallengeMatchRow {
  matchId: string;
  title: string;
  voucherCost: number;
}

/** 与锦标表里 `season_challenge` 行同源（tournamentId === matchId） */
export const SEASON_CHALLENGE_MATCHES: SeasonChallengeMatchRow[] =
  listSeasonChallengeMatchCatalog();

/** chestId -> 确定性奖励列表 */
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
  /** Pass / 任务直达开箱（非货架券兑换） */
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
