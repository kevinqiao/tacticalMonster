/** 排行榜 Tab：无数据或离线时的界面演示数据 */

export const MOCK_LEADERBOARD_SELF_RANK = 9;

const now = Date.now();

export const MOCK_TOURNAMENT_LEADERBOARD: Array<{
  rank: number;
  uid: string;
  score: number;
  submittedAt: number;
}> = [
  { rank: 1, uid: "lb_m1", score: 198_420, submittedAt: now - 1_800_000 },
  { rank: 2, uid: "lb_m2", score: 187_300, submittedAt: now - 2_400_000 },
  { rank: 3, uid: "lb_m3", score: 176_050, submittedAt: now - 3_100_000 },
  { rank: 4, uid: "lb_m4", score: 165_200, submittedAt: now - 5_000_000 },
  { rank: 5, uid: "lb_m5", score: 158_900, submittedAt: now - 6_200_000 },
  { rank: 6, uid: "lb_m6", score: 151_400, submittedAt: now - 8_000_000 },
  { rank: 7, uid: "lb_m7", score: 144_000, submittedAt: now - 9_500_000 },
  { rank: 8, uid: "lb_m8", score: 136_800, submittedAt: now - 12_000_000 },
  { rank: 9, uid: "lb_self_slot", score: 128_400, submittedAt: now - 14_000_000 },
  { rank: 10, uid: "lb_m10", score: 121_000, submittedAt: now - 20_000_000 },
  { rank: 11, uid: "lb_m11", score: 115_600, submittedAt: now - 22_000_000 },
  { rank: 12, uid: "lb_m12", score: 108_200, submittedAt: now - 26_000_000 },
];

export const MOCK_MAIN_SEASON_LEADERBOARD: Array<{ rank: number; uid: string; points: number }> = [
  { rank: 1, uid: "lb_s1", points: 12_800 },
  { rank: 2, uid: "lb_s2", points: 11_950 },
  { rank: 3, uid: "lb_s3", points: 11_200 },
  { rank: 4, uid: "lb_s4", points: 10_400 },
  { rank: 5, uid: "lb_s5", points: 9_880 },
  { rank: 6, uid: "lb_s6", points: 9_200 },
  { rank: 7, uid: "lb_s7", points: 8_650 },
  { rank: 8, uid: "lb_s8", points: 8_100 },
  { rank: 9, uid: "lb_self_slot", points: 7_420 },
  { rank: 10, uid: "lb_s10", points: 6_900 },
];

export const MOCK_C_ARENA_LEADERBOARD: Array<{ rank: number; uid: string; points: number }> = [
  { rank: 1, uid: "lb_c1", points: 2_860 },
  { rank: 2, uid: "lb_c2", points: 2_720 },
  { rank: 3, uid: "lb_c3", points: 2_580 },
  { rank: 4, uid: "lb_c4", points: 2_410 },
  { rank: 5, uid: "lb_c5", points: 2_280 },
  { rank: 6, uid: "lb_c6", points: 2_100 },
  { rank: 7, uid: "lb_c7", points: 1_950 },
  { rank: 8, uid: "lb_c8", points: 1_820 },
  { rank: 9, uid: "lb_self_slot", points: 1_680 },
  { rank: 10, uid: "lb_c10", points: 1_540 },
];

const MOCK_DISPLAY_NAMES: Record<string, string> = {
  lb_m1: "霓虹疾风",
  lb_m2: "方块学徒",
  lb_m3: "CoffeeRun",
  lb_m4: "夜猫子阿乐",
  lb_m5: "Lucky_7",
  lb_m6: "静音模式",
  lb_m7: "海风 17",
  lb_m8: "T-REX",
  lb_m10: "小透明",
  lb_m11: "周末战士",
  lb_m12: "练习号",
  lb_s1: "赛季主宰",
  lb_s2: "积分猎人",
  lb_s3: "稳健上分",
  lb_s4: "追分少年",
  lb_s5: "路过打酱油",
  lb_s6: "任务党",
  lb_s7: "早起鸟",
  lb_s8: "晚班车",
  lb_s10: "佛系玩家",
  lb_c1: "C 场之王",
  lb_c2: "连击机器",
  lb_c3: "守擂者",
  lb_c4: "快攻流",
  lb_c5: "控场大师",
  lb_c6: "新人王",
  lb_c7: "双排队友",
  lb_c8: "单排上分",
  lb_c10: "观战学习",
};

export function leaderboardDisplayName(uid: string): string {
  if (uid === "lb_self_slot") return "我";
  const nick = MOCK_DISPLAY_NAMES[uid];
  if (nick) return nick;
  return `玩家 ${uid.slice(0, 8)}…`;
}

export function formatSubmittedRelative(submittedAt: number): string {
  const d = Math.max(0, Date.now() - submittedAt);
  const m = Math.floor(d / 60_000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} 小时前`;
  const days = Math.floor(h / 24);
  return `${days} 天前`;
}
