import type { CasualRewardKind } from "@/convex/casualPlatform/convex/service/reward/casualRewardTypes";

export function formatGrantLabel(kind: CasualRewardKind, amount: number): string {
  const n = Math.round(amount);
  switch (kind) {
    case "coins":
      return `金币 +${n}`;
    case "gems":
      return `钻 +${n}`;
    case "seasonXp":
      return `赛季 XP +${n}`;
    case "seasonVoucher":
      return `赛季券 +${n}`;
    default:
      return `${kind} +${n}`;
  }
}

export function passClaimErrorMessage(code: string | undefined): string {
  switch (code) {
    case "level_not_reached":
      return "等级不足";
    case "standard_not_owned":
      return "尚未解锁标准轨";
    case "deluxe_not_owned":
      return "尚未解锁豪华轨";
    case "already_claimed":
      return "已领取过";
    case "no_reward_row":
      return "该等级暂无配置奖励";
    case "no_auth":
      return "请先登录";
    case "no_player":
      return "未找到玩家档案，请先完成登录同步";
    case "no_active_season":
      return "当前无激活赛季，赛季资源暂不可用";
    case "claim_failed":
      return "领取失败，请重试";
    default:
      return code ? `Pass：${code}` : "操作失败";
  }
}

export function joinEntryErrorMessage(code: string | undefined): string {
  switch (code) {
    case "unknown_tournament":
      return "未知锦标赛";
    case "game_not_available":
      return "该玩法暂未开放";
    case "period_unavailable":
      return "当前周期不可用";
    case "needs_cost_ack":
      return "请先确认入场消耗";
    case "no_player":
      return "未找到玩家档案，请先完成登录同步";
    case "no_active_season":
      return "当前无激活赛季，赛季券不可用";
    case "insufficient_coins":
      return "金币不足，无法入场";
    case "insufficient_gems":
      return "钻石不足，无法入场";
    case "insufficient_vouchers":
      return "赛季券不足，无法入场";
    case "replay_not_for_season_voucher":
      return "赛季券专场不可使用再战令";
    case "unknown_match_game":
      return "未找到对局记录";
    case "match_not_replayable":
      return "当前对局不可再战";
    case "replay_requires_solo_table":
      return "仅单人桌（无其他真人同桌）可再战";
    case "token_invalid":
      return "再战令无效";
    case "token_used":
      return "再战令已使用";
    case "forbidden":
      return "无权操作该对局";
    case "join_failed":
      return "加入失败，请重试";
    case "already_in_open_match":
      return "有未结束的锦标对局，请先完成或放弃后再加入新场";
    default:
      return code ? `无法加入：${code}` : "无法加入";
  }
}

export function shopErrorMessage(code: string | undefined): string {
  switch (code) {
    case "sku_unavailable":
      return "商品不可用";
    case "no_player":
      return "未找到玩家档案";
    case "insufficient_coins":
      return "金币不足";
    case "insufficient_gems":
      return "钻石不足";
    case "gems_grant_requires_fiat":
      return "钻石获取请通过法币充值渠道，虚拟商店不支持金币/钻石购买钻石";
    case "coin_for_coin_shop_disabled":
      return "当前设计不提供「花金币买金币」";
    case "iap_use_payment_provider":
      return "钻石充值请在收银台完成支付（需接入 IAP / 第三方支付 SDK）";
    case "iap_payment_ref_required":
      return "缺少支付唯一单号（paymentRef）";
    case "iap_duplicate_payment_ref":
      return "该笔支付已发放过钻石，请勿重复提交";
    case "iap_sku_only":
      return "该商品不是法币钻石档位";
    case "iap_no_grant_gems":
      return "该 SKU 未配置到账钻石数";
    case "iap_grant_zero":
      return "活动修正后到账钻石为 0，无法发放";
    case "no_auth":
      return "请先登录";
    case "purchase_failed":
      return "购买失败，请重试";
    case "weekly_purchase_limit":
      return "本周购买次数已达上限";
    default:
      return code ? `商店：${code}` : "购买失败";
  }
}

export function chestErrorMessage(code: string | undefined): string {
  switch (code) {
    case "no_auth":
      return "请先登录";
    default:
      return code ? `宝箱：${code}` : "开启失败";
  }
}

/** 已知任务 ID 的中文标题；其余回退服务端 title */
export const MISSION_TITLE_ZH: Record<string, string> = {
  daily_sign_in: "每日签到",
  daily_platform_async_1: "任意游戏完成 1 次异步锦标（A/B/C）",
  daily_platform_runs_3: "任意游戏累计完成 3 局有效结算",
  weekly_platform_async_8: "任意游戏完成异步锦标结算 8 次",
  weekly_platform_runs_15: "任意游戏累计有效结算 15 局",
  season_first_tournament: "本赛季首次加入任意锦标赛",
  season_platform_runs_60: "任意游戏累计有效结算 60 局",
  weekly_spotlight_game_3: "本周主题游戏完成 3 局",
  weekly_spotlight_top3_1: "本周主题游戏异步 A/B 名次进入前 3 一次",
  weekly_non_primary_1: "非主游戏完成 1 局有效结算",
  weekly_two_distinct_games: "2 个不同游戏各完成至少 1 局",
  season_game_explorer_5: "非主游戏累计有效结算 5 局",
  season_platform_polyglot: "3 个不同游戏各累计至少 5 局",
  weekly_pvp_any_3: "任意 PVP 完成 3 局",
  season_pvp_win_10: "PVP 累计获得 10 胜",
  season_spotlight_6: "本赛季累计完成赛季专场结算 6 次",
  mock_preview_mission_claimed: "赛季：累计邀请 3 位好友（示例）",
};

export function missionPoolLabelZh(pool: string | undefined): string {
  switch (pool) {
    case "platform":
      return "平台必做";
    case "theme":
      return "主题游戏周";
    case "explorer":
      return "平台探索";
    case "pvp":
      return "PVP 专项";
    case "spotlight":
      return "专场加码";
    default:
      return "任务";
  }
}

export function missionDisplayTitle(taskId: string, serverTitle: string): string {
  return MISSION_TITLE_ZH[taskId] ?? serverTitle;
}

export function missionTierLabelZh(tier: string | undefined): string {
  switch (tier) {
    case "daily":
      return "每日";
    case "weekly":
      return "每周";
    case "season":
      return "赛季";
    default:
      return "赛季";
  }
}

export function missionClaimErrorMessage(code: string | undefined): string {
  switch (code) {
    case "unknown_task":
      return "未知任务";
    case "not_completed":
      return "进度未满，暂不可领";
    case "already_claimed":
      return "奖励已领取";
    case "no_active_season":
      return "当前无赛季上下文，赛季任务暂不可领";
    case "no_auth":
      return "请先登录";
    case "no_player":
      return "未找到玩家档案，请先完成登录同步";
    case "claim_failed":
      return "领取失败，请重试";
    default:
      return code ? `任务：${code}` : "领取失败";
  }
}

export interface MissionRewardChipSource {
  rewardCoins?: number;
  rewardSeasonXp?: number;
  rewardVouchers?: number;
  rewardSeasonChallengePoints?: number;
}

/** 任务卡片展示用四态（与后端 completed / claimed 一致） */
export type MissionRowPhase = "not_started" | "in_progress" | "ready" | "claimed";

export function missionRowPhase(m: {
  progress: number;
  target: number;
  completed: boolean;
  claimed?: boolean;
}): MissionRowPhase {
  if (m.claimed === true) return "claimed";
  if (m.completed) return "ready";
  if (m.progress <= 0) return "not_started";
  return "in_progress";
}

export function missionStatusLabelZh(phase: MissionRowPhase): string {
  switch (phase) {
    case "not_started":
      return "未开始";
    case "in_progress":
      return "进行中";
    case "ready":
      return "可领取";
    case "claimed":
      return "已完成";
    default:
      return "";
  }
}

/** 从任务模板生成奖励角标文案（与 Pass grant 风格一致） */
export function missionRewardChipsFromTemplate(t: MissionRewardChipSource | undefined): string[] {
  if (!t) return [];
  const chips: string[] = [];
  if (t.rewardCoins && t.rewardCoins > 0) chips.push(`金币 +${t.rewardCoins}`);
  if (t.rewardSeasonXp && t.rewardSeasonXp > 0) chips.push(`赛季 XP +${t.rewardSeasonXp}`);
  if (t.rewardVouchers && t.rewardVouchers > 0) chips.push(`赛季券 +${t.rewardVouchers}`);
  if (t.rewardSeasonChallengePoints && t.rewardSeasonChallengePoints > 0) {
    chips.push(`赛季点 +${t.rewardSeasonChallengePoints}`);
  }
  return chips;
}
