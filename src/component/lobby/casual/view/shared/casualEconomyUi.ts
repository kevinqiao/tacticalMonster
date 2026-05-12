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
      return "当前设计不提供「花金币买金币」，请调整 SKU 或改用钻石购买金币包";
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
  daily_async_1: "完成 1 次异步锦标（A/B/C）",
  daily_spotlight_1: "完成 1 次赛季专场",
  daily_runs_3: "当日累计完成 3 局有效结算",
  weekly_async_8: "本周完成异步锦标结算 8 次",
  weekly_spotlight_3: "本周完成赛季专场结算 3 次",
  weekly_challenge_points_20: "本周通过专场累计获得 20 赛季点",
  weekly_runs_15: "本周累计有效结算 15 局",
  season_join_tournament_1: "本赛季首次加入任意锦标赛",
  season_spotlight_10: "本赛季累计完成赛季专场结算 10 次",
  season_challenge_points_80: "本赛季通过专场累计获得 80 赛季点",
  season_runs_60: "本赛季累计有效结算 60 局",
  mock_preview_mission_claimed: "赛季：累计邀请 3 位好友（示例）",
};

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
  rewardSeasonPoints?: number;
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
  if (t.rewardSeasonPoints && t.rewardSeasonPoints > 0) chips.push(`赛季积分 +${t.rewardSeasonPoints}`);
  if (t.rewardSeasonChallengePoints && t.rewardSeasonChallengePoints > 0) {
    chips.push(`赛季点 +${t.rewardSeasonChallengePoints}`);
  }
  return chips;
}
