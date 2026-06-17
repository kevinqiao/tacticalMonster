/**
 * 成就模板（永久荣誉；默认不发大额币）。
 */

export type CasualAchievementEventKind =
  | "peak_league_tier"
  | "weekly_promote_count"
  | "multiplayer_win"
  | "total_match_wins"
  | "triathlon_complete";

export interface CasualAchievementTemplate {
  achievementId: string;
  title: string;
  description: string;
  eventKind: CasualAchievementEventKind;
  /** 事件阈值（如 tier 序数、累计次数） */
  threshold: number;
  /** 可选皮肤 token（经 achievement source 发放） */
  skinToken?: string;
}

const TIER_ORDER: Record<string, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
  diamond: 4,
};

export function leagueTierOrder(tierId: string): number {
  return TIER_ORDER[tierId] ?? 0;
}

export const CASUAL_ACHIEVEMENT_TEMPLATES: CasualAchievementTemplate[] = [
  {
    achievementId: "peak_league_silver",
    title: "联赛 · 白银",
    description: "周联赛历史最高段位达到白银",
    eventKind: "peak_league_tier",
    threshold: leagueTierOrder("silver"),
  },
  {
    achievementId: "peak_league_gold",
    title: "联赛 · 黄金",
    description: "周联赛历史最高段位达到黄金",
    eventKind: "peak_league_tier",
    threshold: leagueTierOrder("gold"),
  },
  {
    achievementId: "peak_league_platinum",
    title: "联赛 · 铂金",
    description: "周联赛历史最高段位达到铂金",
    eventKind: "peak_league_tier",
    threshold: leagueTierOrder("platinum"),
  },
  {
    achievementId: "peak_league_diamond",
    title: "联赛 · 钻石",
    description: "周联赛历史最高段位达到钻石",
    eventKind: "peak_league_tier",
    threshold: leagueTierOrder("diamond"),
    skinToken: "platform_avatar_deluxe",
  },
  {
    achievementId: "weekly_promote_1",
    title: "首次晋级",
    description: "周联赛首次进入晋级区",
    eventKind: "weekly_promote_count",
    threshold: 1,
  },
  {
    achievementId: "weekly_promote_5",
    title: "周赛常客",
    description: "累计 5 次周联赛晋级",
    eventKind: "weekly_promote_count",
    threshold: 5,
  },
  {
    achievementId: "weekly_promote_20",
    title: "周赛老将",
    description: "累计 20 次周联赛晋级",
    eventKind: "weekly_promote_count",
    threshold: 20,
  },
  {
    achievementId: "multiplayer_win_10",
    title: "十胜",
    description: "异步多人赛累计 10 次第一名",
    eventKind: "multiplayer_win",
    threshold: 10,
  },
  {
    achievementId: "multiplayer_win_50",
    title: "五十胜",
    description: "异步多人赛累计 50 次第一名",
    eventKind: "multiplayer_win",
    threshold: 50,
  },
  {
    achievementId: "total_wins_25",
    title: "初露锋芒",
    description: "累计赢得 25 场有效结算",
    eventKind: "total_match_wins",
    threshold: 25,
  },
  {
    achievementId: "total_wins_100",
    title: "百战老兵",
    description: "累计赢得 100 场有效结算",
    eventKind: "total_match_wins",
    threshold: 100,
  },
  {
    achievementId: "triathlon_complete_1",
    title: "三场合战",
    description: "完成首次三场合战结算",
    eventKind: "triathlon_complete",
    threshold: 1,
  },
  {
    achievementId: "triathlon_complete_10",
    title: "全能选手",
    description: "累计完成 10 次三场合战",
    eventKind: "triathlon_complete",
    threshold: 10,
  },
];

export function getAchievementTemplate(achievementId: string): CasualAchievementTemplate | undefined {
  return CASUAL_ACHIEVEMENT_TEMPLATES.find((t) => t.achievementId === achievementId);
}
