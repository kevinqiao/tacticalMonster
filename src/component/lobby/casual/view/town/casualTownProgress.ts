/**
 * Town 成长进度系统（Casual 原型 / 设计参考）。
 *
 * League-first（Portal / Mayfield）：主 meta 为 GC 周联赛 + Season Lv；
 * 不在 Town 路由落地独立 Town/Mayor 等级。见 `component/lobby/town/TownLeagueStatus`.
 *
 * - Town Level 1–20，跨赛季永久积累，不随赛季重置。
 * - 建设点（Town Points）是唯一货币，只能通过竞技赢得，不可购买。
 */

export type TownStageId = "village" | "town" | "city" | "metropolis" | "legendary";

export interface TownStage {
  id: TownStageId;
  name: string;
  levelRange: [number, number];
  icon: string;
  description: string;
}

export const TOWN_STAGES: TownStage[] = [
  {
    id: "village",
    name: "小村庄",
    levelRange: [1, 3],
    icon: "🏘️",
    description: "广场和木制告示板。每赢一场，向传奇之城迈进一步。",
  },
  {
    id: "town",
    name: "小镇",
    levelRange: [4, 7],
    icon: "🏠",
    description: "竞技场和荣誉长廊相继开放。「有历史的人」的起点。",
  },
  {
    id: "city",
    name: "城市",
    levelRange: [8, 12],
    icon: "🏙️",
    description: "游戏博物馆、皮肤展览馆、连胜纪念碑陆续解锁。个人风格鲜明。",
  },
  {
    id: "metropolis",
    name: "都市",
    levelRange: [13, 17],
    icon: "🏛️",
    description: "对手名人堂开放，江湖气浓厚。访客感受到明显的竞争压力。",
  },
  {
    id: "legendary",
    name: "传奇之城",
    levelRange: [18, 20],
    icon: "⭐",
    description: "传奇殿堂解锁。全服最稀缺，是平台最长的留存设计锚点。",
  },
];

export function getTownStageByLevel(level: number): TownStage {
  return TOWN_STAGES.find((s) => level >= s.levelRange[0] && level <= s.levelRange[1]) ?? TOWN_STAGES[0];
}

/** 建设点来源说明 */
export interface TownPointSource {
  id: string;
  name: string;
  detail: string;
  points: string;
  frequency: "daily" | "rank" | "tournament" | "season" | "achievement";
}

export const TOWN_POINT_SOURCES: TownPointSource[] = [
  {
    id: "daily_win",
    name: "日赛胜利",
    detail: "每赢一场 +5 点，每日上限 30 点（6 场）",
    points: "+5 / 场",
    frequency: "daily",
  },
  {
    id: "rank_up",
    name: "段位晋级",
    detail: "青铜→白银 +50，白银→黄金 +100，黄金→钻石 +200",
    points: "+50–200",
    frequency: "rank",
  },
  {
    id: "tournament",
    name: "锦标赛",
    detail: "每轮晋级 +20，获得冠军 +200",
    points: "+20–200",
    frequency: "tournament",
  },
  {
    id: "season_end",
    name: "赛季结算",
    detail: "黄金段位 +100，钻石段位 +300",
    points: "+100–300",
    frequency: "season",
  },
  {
    id: "achievement",
    name: "成就里程碑",
    detail: "赢 100 场、三游戏各 50 场等特定成就额外奖励",
    points: "一次性",
    frequency: "achievement",
  },
];

/** 各等级所需总建设点（累计） */
export const TOWN_LEVEL_THRESHOLDS: number[] = [
  0,    // L1 起点
  200,  // L2
  450,  // L3
  750,  // L4
  1100, // L5
  1500, // L6
  1950, // L7
  2450, // L8
  3000, // L9
  3600, // L10
  4250, // L11
  4950, // L12
  5700, // L13
  6500, // L14
  7350, // L15
  8250, // L16
  9200, // L17
  10000,// L18
  10900,// L19
  10000,// L20（满级）
];

export function townLevelProgress(totalPoints: number): {
  level: number;
  stage: TownStage;
  currentPoints: number;
  nextLevelPoints: number;
  pct: number;
} {
  let level = 1;
  for (let i = 1; i < TOWN_LEVEL_THRESHOLDS.length; i += 1) {
    if (totalPoints >= TOWN_LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  level = Math.min(level, 20);
  const currentFloor = TOWN_LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextFloor = TOWN_LEVEL_THRESHOLDS[level] ?? TOWN_LEVEL_THRESHOLDS[19];
  const span = nextFloor - currentFloor;
  const earned = totalPoints - currentFloor;
  return {
    level,
    stage: getTownStageByLevel(level),
    currentPoints: earned,
    nextLevelPoints: span,
    pct: span > 0 ? Math.min(100, Math.round((earned / span) * 100)) : 100,
  };
}
