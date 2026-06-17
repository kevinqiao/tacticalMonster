/**
 * CasualTown 建筑目录（对齐重新设计文档）。
 *
 * 核心原则：
 * - 所有建筑只能通过竞技成就解锁，0 个可直接购买。
 * - 建筑是成就的永久物化，不是装饰品。
 * - Town 不重置；赛季重置不影响建筑解锁状态。
 */

export type TownBuildingKind =
  | "plaza"      // 广场/中心地标
  | "arena"      // 竞技相关
  | "museum"     // 历史记录
  | "gallery"    // 展览展示
  | "monument"   // 纪念碑
  | "hall";      // 殿堂

/** 解锁条件（服务端以真实数据校验；前端仅展示） */
export type TownUnlockCondition =
  | { kind: "registration" }
  | { kind: "tournament_wins"; count: number }
  | { kind: "rank_reached"; rank: "gold" | "diamond" }
  | { kind: "total_match_wins"; count: number }
  | { kind: "game_wins_each"; count: number; games: string[] }
  | { kind: "skin_owned"; count: number }
  | { kind: "win_streak"; count: number }
  | { kind: "unique_opponents"; count: number }
  | { kind: "composite"; tournament_wins: number; rank: "diamond" };

export interface TownBuildingDef {
  buildingId: string;
  name: string;
  kind: TownBuildingKind;
  /** 一句话展示描述（访客可见） */
  tagline: string;
  /** 建筑功能详情 */
  description: string;
  /** 图标（emoji / icon name） */
  icon: string;
  /** 解锁条件 */
  unlockCondition: TownUnlockCondition;
  /** 人类可读的解锁说明 */
  unlockHint: string;
  /** 哪个 Town 阶段才会出现在简图中 */
  visibleFromStage: number; // Town level
  /** 是否为全服稀缺（特殊外观） */
  isLegendary?: boolean;
}

export const TOWN_BUILDINGS: TownBuildingDef[] = [
  {
    buildingId: "champion_plaza",
    name: "冠军广场",
    kind: "plaza",
    tagline: "Town 中心，每届冠军升起一根柱子",
    description:
      "Town 的核心地标，最显眼的位置。每赢一届锦标赛，广场中央升起一根刻有赛季编号的冠军柱。对手访问时第一眼就能看到。钱买不到的身份象征。",
    icon: "🏆",
    unlockCondition: { kind: "tournament_wins", count: 1 },
    unlockHint: "赢得首届锦标赛解锁",
    visibleFromStage: 1,
  },
  {
    buildingId: "arena",
    name: "竞技场",
    kind: "arena",
    tagline: "展示当前段位和历史最高荣耀",
    description:
      "展示玩家当前段位和历史最高段位。赛季结束后段位可能下降，但竞技场永久记录你曾达到的最高荣耀。访客可以在这里发起友谊赛挑战。",
    icon: "⚔️",
    unlockCondition: { kind: "rank_reached", rank: "gold" },
    unlockHint: "达到黄金段位解锁",
    visibleFromStage: 4,
  },
  {
    buildingId: "game_museum",
    name: "游戏博物馆",
    kind: "museum",
    tagline: "三款游戏的历史最高分与经典胜局",
    description:
      "分三个展厅，分别记录 Solitaire、Block Blast、Merge 的历史最高分和经典胜局。访客可以回放你最精彩的一局。竞技历史的永久档案馆。",
    icon: "🎮",
    unlockCondition: { kind: "game_wins_each", count: 50, games: ["solitaire", "blockBlast", "merge"] },
    unlockHint: "三款游戏各赢 50 场解锁",
    visibleFromStage: 8,
  },
  {
    buildingId: "honor_gallery",
    name: "荣誉长廊",
    kind: "gallery",
    tagline: "按时间轴展示所有赛季成就与段位记录",
    description:
      "按时间轴展示所有赛季成就徽章、段位记录、特殊事件奖励。Town 里信息密度最高的建筑——老玩家的长廊一眼就能看出和新玩家的差距。",
    icon: "🏅",
    unlockCondition: { kind: "total_match_wins", count: 100 },
    unlockHint: "累计赢得 100 场赛事解锁",
    visibleFromStage: 4,
  },
  {
    buildingId: "skin_exhibition",
    name: "皮肤展览馆",
    kind: "gallery",
    tagline: "收藏的限定皮肤在此永久展出",
    description:
      "展示玩家收藏的所有卡牌皮肤、头像框、棋盘主题。赛季限定皮肤在这里有「绝版」标签，强化稀缺感。对手访问时可见你设为展示的皮肤。",
    icon: "🎨",
    unlockCondition: { kind: "skin_owned", count: 5 },
    unlockHint: "拥有 5 套皮肤后解锁",
    visibleFromStage: 8,
  },
  {
    buildingId: "streak_monument",
    name: "连胜纪念碑",
    kind: "monument",
    tagline: "历史最长连胜刻在碑上，永不清零",
    description:
      "记录历史最长连胜纪录和当前连胜状态。碑上刻有具体数字，是 Town 里最有炫耀性的单一数据展示。连胜中断后数字变为历史记录，不会清零。",
    icon: "🔥",
    unlockCondition: { kind: "win_streak", count: 10 },
    unlockHint: "达成 10 连胜解锁",
    visibleFromStage: 8,
  },
  {
    buildingId: "rival_hall",
    name: "对手名人堂",
    kind: "hall",
    tagline: "宿敌系统 · 经典对局永久存档",
    description:
      "记录你对战过的最强对手、经典胜局、最激烈的比赛。可以标记「宿敌」——双方互相访问 Town 时会有特殊提示，强化持续竞争动机。",
    icon: "👥",
    unlockCondition: { kind: "unique_opponents", count: 50 },
    unlockHint: "对战过 50 名不同玩家解锁",
    visibleFromStage: 13,
  },
  {
    buildingId: "legend_hall",
    name: "传奇殿堂",
    kind: "hall",
    tagline: "全服最稀缺建筑，夜间有特殊照明",
    description:
      "全服最稀缺的建筑。外观在所有 Town 中独一无二，夜间有特殊照明效果（唯一有视觉特效的建筑）。拥有传奇殿堂的玩家在排行榜上有专属图标。",
    icon: "⭐",
    unlockCondition: { kind: "composite", tournament_wins: 3, rank: "diamond" },
    unlockHint: "达到钻石段位且赢得 3 届锦标赛解锁",
    visibleFromStage: 18,
    isLegendary: true,
  },
  // —— 广场基础建筑（注册即有）——
  {
    buildingId: "town_square",
    name: "Town 广场",
    kind: "plaza",
    tagline: "起点 · 第一面旗帜在这里升起",
    description:
      "初始建筑，注册即有。完成前 10 场赛事后，广场中心升起第一面旗帜。外观朴素，但每个访问你 Town 的对手都能看到你已经开始了。",
    icon: "🏘️",
    unlockCondition: { kind: "registration" },
    unlockHint: "注册即获得",
    visibleFromStage: 1,
  },
  {
    buildingId: "battle_board",
    name: "赛事公告板",
    kind: "arena",
    tagline: "展示近期赛事成绩与挑战入口",
    description:
      "展示近期赛事成绩，供访客发起异步挑战。Town 里主要的社交互动入口。",
    icon: "📋",
    unlockCondition: { kind: "total_match_wins", count: 10 },
    unlockHint: "赢得 10 场赛事解锁",
    visibleFromStage: 1,
  },
  {
    buildingId: "season_archive",
    name: "赛季档案室",
    kind: "museum",
    tagline: "历届赛季旗帜与通行证成就存档",
    description:
      "每个赛季结算后，对应的旗帜和通行证成就永久存入档案室。赛季越多，档案室越壮观。",
    icon: "📜",
    unlockCondition: { kind: "total_match_wins", count: 30 },
    unlockHint: "累计 30 场胜利解锁",
    visibleFromStage: 4,
  },
  {
    buildingId: "visitor_log",
    name: "访客留言墙",
    kind: "monument",
    tagline: "谁看过你的 Town，留下足迹",
    description:
      "记录近期访问你 Town 的玩家。谁在观察你？制造轻度社交存在感——看到熟悉的宿敌名字会让人想起来维护 Town。",
    icon: "👁️",
    unlockCondition: { kind: "unique_opponents", count: 20 },
    unlockHint: "对战过 20 名不同玩家解锁",
    visibleFromStage: 4,
  },
];

export function getTownBuilding(buildingId: string): TownBuildingDef | undefined {
  return TOWN_BUILDINGS.find((b) => b.buildingId === buildingId);
}

export function formatUnlockHint(condition: TownUnlockCondition): string {
  switch (condition.kind) {
    case "registration":
      return "注册即获得";
    case "tournament_wins":
      return `赢得 ${condition.count} 届锦标赛`;
    case "rank_reached":
      return `周联赛历史最高达到${condition.rank === "gold" ? "黄金" : "钻石"}段位`;
    case "total_match_wins":
      return `累计 ${condition.count} 场赛事胜利`;
    case "game_wins_each":
      return `三款游戏各赢 ${condition.count} 场`;
    case "skin_owned":
      return `拥有 ${condition.count} 套皮肤`;
    case "win_streak":
      return `达成 ${condition.count} 连胜`;
    case "unique_opponents":
      return `对战 ${condition.count} 名不同玩家`;
    case "composite":
      return `钻石段位 + ${condition.tournament_wins} 届锦标冠军`;
  }
}
