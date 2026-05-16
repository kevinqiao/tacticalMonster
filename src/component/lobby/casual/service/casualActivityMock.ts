/**
 * 静态活动数据：覆盖 Play 活动条、锦标 Pass XP/赛季券预览、普通商店钻→币价预览与 IAP 档位文案示例、商店横幅等 UI。
 *
 * 默认：`import.meta.env.DEV` 下开启静态活动（便于本地看全量 UI）。
 * 覆盖：`VITE_CASUAL_MOCK_ACTIVITIES=1` / `true` 强制开启；`0` / `false` 强制关闭（本地对接真实 Convex 活动列表时用）。
 *
 * 说明：未叠加「全局赛季券减免」与「专场半价」，避免出现预览扣券为 0。
 */

import { CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID } from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";

import type { CasualActivityPublicRow } from "./casualActivityTypes";

function demoWindow(): { startsAt: number; endsAt: number } {
  const now = Date.now();
  return {
    startsAt: now - 86400000,
    endsAt: now + 90 * 86400000,
  };
}

export function getMockCasualActivitiesForUiDemo(): CasualActivityPublicRow[] {
  const { startsAt, endsAt } = demoWindow();

  return [
    {
      activityId: "mock_ui_global_pass_boost",
      title: "全局 Pass XP ×1.25 +4（演示）",
      target: { type: "global" },
      seasonId: "casual_s1",
      startsAt,
      endsAt,
      effects: { passXpMultiplier: 1.25, passXpDelta: 4 },
    },
    {
      activityId: "mock_ui_spot_bb_half_entry",
      title: "专场入场半价（演示）",
      target: { type: "tournament_match", tournamentId: CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID },
      seasonId: "casual_s1",
      startsAt,
      endsAt,
      effects: { voucherCostMultiplier: 0.5 },
    },
    {
      activityId: "mock_ui_async_b_extra_pass_xp",
      title: "B 档额外 Pass XP +10（演示）",
      target: { type: "tournament_match", tournamentId: "casual_async_b_bb" },
      seasonId: "casual_s1",
      startsAt,
      endsAt,
      effects: { passXpDelta: 10 },
    },
    {
      activityId: "mock_ui_all_tournaments_pass_delta",
      title: "全部锦标 Pass XP +2（通配·演示）",
      target: { type: "tournament_match" },
      seasonId: "casual_s1",
      startsAt,
      endsAt,
      effects: { passXpDelta: 2 },
    },
    {
      activityId: "mock_ui_strip_empty_effect_summary",
      title: "占位活动（无效果摘要字段）",
      target: { type: "global" },
      startsAt,
      endsAt,
      effects: {},
    },
    {
      activityId: "mock_ui_shop_coin_tier_1_gem_08",
      title: "金币补给小档·钻石价 8 折（演示）",
      target: { type: "casual_shop_sku", shopSkuId: "shop_coin_tier_1" },
      seasonId: "casual_s1",
      startsAt,
      endsAt,
      effects: { gemsCostMultiplier: 0.8 },
    },
    {
      activityId: "mock_ui_shop_coin_tier_2_gem_088",
      title: "金币补给中档·钻石价 88 折（演示）",
      target: { type: "casual_shop_sku", shopSkuId: "shop_coin_tier_2" },
      seasonId: "casual_s1",
      startsAt,
      endsAt,
      effects: { gemsCostMultiplier: 0.88 },
    },
    {
      activityId: "mock_ui_shop_all_coin_packs_gem_096",
      title: "全部钻→金币档位·钻石价 96 折（通配·演示）",
      target: { type: "casual_shop_sku" },
      seasonId: "casual_s1",
      startsAt,
      endsAt,
      effects: { gemsCostMultiplier: 0.96 },
    },
    {
      activityId: "mock_ui_iap_tier_2_grant_112",
      title: "¥30 钻石档·IAP 到账钻 ×1.12（演示）",
      target: { type: "casual_shop_sku", shopSkuId: "iap_gem_tier_2" },
      seasonId: "casual_s1",
      startsAt,
      endsAt,
      effects: { iapGrantGemsMultiplier: 1.12 },
    },
    {
      activityId: "mock_ui_iap_tier_3_grant_plus80",
      title: "¥98 尊享档·IAP 额外 +80 钻（演示）",
      target: { type: "casual_shop_sku", shopSkuId: "iap_gem_tier_3" },
      seasonId: "casual_s1",
      startsAt,
      endsAt,
      effects: { iapGrantGemsDelta: 80 },
    },
    {
      activityId: "mock_ui_async_c_entry_gem_09",
      title: "C 档入场钻石 9 折（演示）",
      target: { type: "tournament_match", tournamentId: "casual_async_c_bb" },
      seasonId: "casual_s1",
      startsAt,
      endsAt,
      effects: { gemsCostMultiplier: 0.9 },
    },
  ];
}

/** 仅普通商店 `casual_shop_sku` 定向活动；可与 Convex 活动合并，保证静态货架始终有促销预览 */
export function getMockCasualShopPromotionActivities(): CasualActivityPublicRow[] {
  return getMockCasualActivitiesForUiDemo().filter((a) => a.target.type === "casual_shop_sku");
}

export function shouldUseMockCasualActivities(): boolean {
  const raw = import.meta.env.VITE_CASUAL_MOCK_ACTIVITIES;
  if (raw === "0" || raw === "false") return false;
  if (raw === "1" || raw === "true") return true;
  return Boolean(import.meta.env.DEV);
}
