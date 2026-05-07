import {
  applyPassXpFromModifiers,
  applyScaledCurrencyCost,
  applyVoucherCost,
} from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";

import type { CasualActivityPublicRow, CasualActivityTarget } from "../../service/casualActivityTypes";

export type { CasualActivityPublicRow, CasualActivityTarget };

/** 与后端 `targetMatches` 一致（前端预览用） */
export function targetMatchesActivity(
  target: CasualActivityTarget,
  ctx: { tournamentId?: string; matchId?: string; skuId?: string; shopSkuId?: string }
): boolean {
  if (target.type === "global") return true;
  if (target.type === "tournament_match") {
    const tid = ctx.tournamentId ?? ctx.matchId;
    if (!tid) return false;
    const bound = target.tournamentId;
    return !bound || bound === tid;
  }
  if (target.type === "season_shelf_sku") {
    if (!ctx.skuId) return false;
    const bound = target.shelfSkuId;
    return !bound || bound === ctx.skuId;
  }
  if (target.type === "casual_shop_sku") {
    if (!ctx.shopSkuId) return false;
    const bound = target.shopSkuId;
    return !bound || bound === ctx.shopSkuId;
  }
  return false;
}

/** 与货架券兑换 `resolveSeasonActivityModifiers({ skuId })` 命中集合一致（仅 target 匹配） */
export function listActivitiesMatchingShelfRedeem(
  activities: CasualActivityPublicRow[],
  skuId: string
): CasualActivityPublicRow[] {
  return activities.filter((a) => targetMatchesActivity(a.target, { skuId }));
}

/** `purchaseSku` 上下文：`resolveSeasonActivityModifiers({ shopSkuId })` */
export function listActivitiesMatchingShopPurchase(
  activities: CasualActivityPublicRow[],
  shopSkuId: string
): CasualActivityPublicRow[] {
  return activities.filter((a) => targetMatchesActivity(a.target, { shopSkuId }));
}

export function foldVoucherModifiers(
  activities: CasualActivityPublicRow[],
  ctx: { tournamentId?: string; skuId?: string }
): { multiplier: number; delta: number } {
  let multiplier = 1;
  let delta = 0;
  for (const a of activities) {
    if (!targetMatchesActivity(a.target, ctx)) continue;
    const fx = a.effects;
    if (typeof fx.voucherCostMultiplier === "number") multiplier *= fx.voucherCostMultiplier;
    if (typeof fx.voucherCostDelta === "number") delta += fx.voucherCostDelta;
  }
  return { multiplier, delta };
}

export function foldCoinsModifiers(
  activities: CasualActivityPublicRow[],
  ctx: { tournamentId?: string; skuId?: string; shopSkuId?: string }
): { multiplier: number; delta: number } {
  let multiplier = 1;
  let delta = 0;
  for (const a of activities) {
    if (!targetMatchesActivity(a.target, ctx)) continue;
    const fx = a.effects;
    if (typeof fx.coinsCostMultiplier === "number") multiplier *= fx.coinsCostMultiplier;
    if (typeof fx.coinsCostDelta === "number") delta += fx.coinsCostDelta;
  }
  return { multiplier, delta };
}

export function foldGemsModifiers(
  activities: CasualActivityPublicRow[],
  ctx: { tournamentId?: string; skuId?: string; shopSkuId?: string }
): { multiplier: number; delta: number } {
  let multiplier = 1;
  let delta = 0;
  for (const a of activities) {
    if (!targetMatchesActivity(a.target, ctx)) continue;
    const fx = a.effects;
    if (typeof fx.gemsCostMultiplier === "number") multiplier *= fx.gemsCostMultiplier;
    if (typeof fx.gemsCostDelta === "number") delta += fx.gemsCostDelta;
  }
  return { multiplier, delta };
}

/** 法币 IAP 到账钻石基数：`floor(grantGems × mult + delta)` */
export function foldIapGrantGemsModifiers(
  activities: CasualActivityPublicRow[],
  ctx: { shopSkuId?: string }
): { multiplier: number; delta: number } {
  let multiplier = 1;
  let delta = 0;
  for (const a of activities) {
    if (!targetMatchesActivity(a.target, ctx)) continue;
    const fx = a.effects;
    if (typeof fx.iapGrantGemsMultiplier === "number") multiplier *= fx.iapGrantGemsMultiplier;
    if (typeof fx.iapGrantGemsDelta === "number") delta += fx.iapGrantGemsDelta;
  }
  return { multiplier, delta };
}

export function foldPassXpModifiers(
  activities: CasualActivityPublicRow[],
  ctx: { tournamentId?: string }
): { multiplier: number; delta: number } {
  let multiplier = 1;
  let delta = 0;
  for (const a of activities) {
    if (!targetMatchesActivity(a.target, ctx)) continue;
    const fx = a.effects;
    if (typeof fx.passXpMultiplier === "number") multiplier *= fx.passXpMultiplier;
    if (typeof fx.passXpDelta === "number") delta += fx.passXpDelta;
  }
  return { multiplier, delta };
}

export function previewVoucherCost(
  activities: CasualActivityPublicRow[],
  ctx: { tournamentId?: string; skuId?: string },
  base: number
): { effective: number; changed: boolean } {
  const { multiplier, delta } = foldVoucherModifiers(activities, ctx);
  const effective = applyVoucherCost(base, multiplier, delta);
  return { effective, changed: effective !== base };
}

export function previewCoinsCost(
  activities: CasualActivityPublicRow[],
  ctx: { tournamentId?: string; skuId?: string; shopSkuId?: string },
  base: number
): { effective: number; changed: boolean } {
  const { multiplier, delta } = foldCoinsModifiers(activities, ctx);
  const effective = applyScaledCurrencyCost(base, multiplier, delta);
  return { effective, changed: effective !== base };
}

export function previewGemsCost(
  activities: CasualActivityPublicRow[],
  ctx: { tournamentId?: string; skuId?: string; shopSkuId?: string },
  base: number
): { effective: number; changed: boolean } {
  const { multiplier, delta } = foldGemsModifiers(activities, ctx);
  const effective = applyScaledCurrencyCost(base, multiplier, delta);
  return { effective, changed: effective !== base };
}

export function previewIapGrantGems(
  activities: CasualActivityPublicRow[],
  ctx: { shopSkuId?: string },
  baseGrantGems: number
): { effective: number; changed: boolean } {
  if (baseGrantGems <= 0) return { effective: 0, changed: false };
  const { multiplier, delta } = foldIapGrantGemsModifiers(activities, ctx);
  const effective = applyScaledCurrencyCost(baseGrantGems, multiplier, delta);
  return { effective, changed: effective !== baseGrantGems };
}

export function previewPassXp(
  activities: CasualActivityPublicRow[],
  ctx: { tournamentId?: string },
  base: number
): { effective: number; changed: boolean } {
  if (base <= 0) return { effective: 0, changed: false };
  const { multiplier, delta } = foldPassXpModifiers(activities, ctx);
  const effective = applyPassXpFromModifiers(base, multiplier, delta);
  return { effective, changed: effective !== base };
}

export function formatActivityEffectChips(row: CasualActivityPublicRow): string[] {
  const fx = row.effects;
  const chips: string[] = [];
  if (typeof fx.voucherCostMultiplier === "number" && fx.voucherCostMultiplier !== 1) {
    chips.push(`赛季券 ×${fx.voucherCostMultiplier}`);
  }
  if (typeof fx.voucherCostDelta === "number" && fx.voucherCostDelta !== 0) {
    chips.push(`赛季券 ${fx.voucherCostDelta > 0 ? "+" : ""}${fx.voucherCostDelta}`);
  }
  if (typeof fx.passXpMultiplier === "number" && fx.passXpMultiplier !== 1) {
    chips.push(`Pass XP ×${fx.passXpMultiplier}`);
  }
  if (typeof fx.passXpDelta === "number" && fx.passXpDelta !== 0) {
    chips.push(`Pass XP ${fx.passXpDelta > 0 ? "+" : ""}${fx.passXpDelta}`);
  }
  if (typeof fx.coinsCostMultiplier === "number" && fx.coinsCostMultiplier !== 1) {
    chips.push(`金币花费 ×${fx.coinsCostMultiplier}`);
  }
  if (typeof fx.coinsCostDelta === "number" && fx.coinsCostDelta !== 0) {
    chips.push(`金币花费 ${fx.coinsCostDelta > 0 ? "+" : ""}${fx.coinsCostDelta}`);
  }
  if (typeof fx.gemsCostMultiplier === "number" && fx.gemsCostMultiplier !== 1) {
    chips.push(`钻石花费 ×${fx.gemsCostMultiplier}`);
  }
  if (typeof fx.gemsCostDelta === "number" && fx.gemsCostDelta !== 0) {
    chips.push(`钻石花费 ${fx.gemsCostDelta > 0 ? "+" : ""}${fx.gemsCostDelta}`);
  }
  if (typeof fx.iapGrantGemsMultiplier === "number" && fx.iapGrantGemsMultiplier !== 1) {
    chips.push(`IAP 到账钻 ×${fx.iapGrantGemsMultiplier}`);
  }
  if (typeof fx.iapGrantGemsDelta === "number" && fx.iapGrantGemsDelta !== 0) {
    chips.push(`IAP 到账钻 ${fx.iapGrantGemsDelta > 0 ? "+" : ""}${fx.iapGrantGemsDelta}`);
  }
  return chips;
}

export function formatTargetScopeShort(row: CasualActivityPublicRow): string {
  const t = row.target;
  if (t.type === "global") return "全局";
  if (t.type === "tournament_match") return t.tournamentId ? `锦标 · ${t.tournamentId}` : "全部锦标";
  if (t.type === "season_shelf_sku") return t.shelfSkuId ? `货架 · ${t.shelfSkuId}` : "全部券兑 SKU";
  return t.shopSkuId ? `商店 · ${t.shopSkuId}` : "全部商店 SKU";
}

export function formatActivityRemaining(endsAt: number, nowMs: number): string {
  const ms = endsAt - nowMs;
  if (ms <= 0) return "已结束";
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  if (d >= 1) return `剩余 ${d} 天`;
  if (h >= 1) return `剩余 ${h} 小时`;
  const m = Math.max(1, Math.floor(ms / 60000));
  return `剩余 ${m} 分钟`;
}

export function resolveActivityTitlesById(
  activities: CasualActivityPublicRow[],
  ids?: string[]
): string[] {
  if (!ids?.length) return [];
  const map = new Map(activities.map((a) => [a.activityId, a.title]));
  return ids.map((id) => map.get(id) ?? id);
}
