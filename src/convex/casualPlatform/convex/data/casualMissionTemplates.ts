/** 轻量任务模板：日/周/赛季 + `periodKey`；与 `casual_tasks` 进度合并展示 */

export type MissionTier = "daily" | "weekly" | "season";

/** 多游戏平台 Pass 任务池（见 docs/casual-platform-multi-game-pass-design.md §5） */
export type MissionPool = "platform" | "theme" | "explorer" | "pvp" | "spotlight";

/** 进度由服务端事件驱动递增（见 `casualTaskService.notifyScoreSubmitted` 等） */
export type MissionObjectiveKind =
  | "login_daily"
  | "join_tournament_once"
  | "submit_any_score"
  | "submit_async_score"
  | "submit_spotlight_score"
  | "earn_spotlight_season_board_points"
  | "submit_spotlight_game_score"
  | "submit_spotlight_game_top3"
  | "submit_non_primary_score"
  | "submit_distinct_games"
  | "submit_pvp_settled"
  | "submit_pvp_win";

export interface CasualMissionTemplate {
  taskId: string;
  title: string;
  target: number;
  tier: MissionTier;
  objectiveKind: MissionObjectiveKind;
  missionPool: MissionPool;
  /** 领取时发放（日周赛季券按蓝图克制投放） */
  rewardVouchers?: number;
  rewardSeasonXp?: number;
  rewardCoins?: number;
  /** `submit_distinct_games` / `season_platform_polyglot`：每 game 至少 N 局 */
  minRunsPerGame?: number;
}

export const CASUAL_MISSION_TEMPLATES: CasualMissionTemplate[] = [
  // --- 板 A：平台通用 ---
  {
    taskId: "daily_sign_in",
    title: "每日签到",
    target: 1,
    tier: "daily",
    objectiveKind: "login_daily",
    missionPool: "platform",
    rewardCoins: 15,
    rewardSeasonXp: 10,
  },
  {
    taskId: "daily_platform_async_1",
    title: "任意游戏完成 1 次异步锦标（A/B/C）",
    target: 1,
    tier: "daily",
    objectiveKind: "submit_async_score",
    missionPool: "platform",
    rewardSeasonXp: 40,
  },
  {
    taskId: "daily_platform_runs_3",
    title: "任意游戏累计完成 3 局有效结算",
    target: 3,
    tier: "daily",
    objectiveKind: "submit_any_score",
    missionPool: "platform",
    rewardSeasonXp: 60,
  },
  {
    taskId: "weekly_platform_async_8",
    title: "任意游戏完成异步锦标结算 8 次",
    target: 8,
    tier: "weekly",
    objectiveKind: "submit_async_score",
    missionPool: "platform",
    rewardSeasonXp: 250,
  },
  {
    taskId: "weekly_platform_runs_15",
    title: "任意游戏累计有效结算 15 局",
    target: 15,
    tier: "weekly",
    objectiveKind: "submit_any_score",
    missionPool: "platform",
    rewardVouchers: 2,
    rewardSeasonXp: 120,
  },
  {
    taskId: "season_first_tournament",
    title: "本赛季首次加入任意锦标赛",
    target: 1,
    tier: "season",
    objectiveKind: "join_tournament_once",
    missionPool: "platform",
    rewardVouchers: 1,
    rewardSeasonXp: 20,
  },
  {
    taskId: "season_platform_runs_60",
    title: "任意游戏累计有效结算 60 局",
    target: 60,
    tier: "season",
    objectiveKind: "submit_any_score",
    missionPool: "platform",
    rewardSeasonXp: 500,
  },
  // --- 板 B：主题游戏周 ---
  {
    taskId: "weekly_spotlight_game_3",
    title: "本周主题游戏完成 3 局",
    target: 3,
    tier: "weekly",
    objectiveKind: "submit_spotlight_game_score",
    missionPool: "theme",
    rewardSeasonXp: 100,
  },
  {
    taskId: "weekly_spotlight_top3_1",
    title: "本周主题游戏异步 A/B 名次进入前 3 一次",
    target: 1,
    tier: "weekly",
    objectiveKind: "submit_spotlight_game_top3",
    missionPool: "theme",
    rewardSeasonXp: 80,
  },
  // --- 板 C：平台探索（可选） ---
  {
    taskId: "weekly_non_primary_1",
    title: "非主游戏完成 1 局有效结算",
    target: 1,
    tier: "weekly",
    objectiveKind: "submit_non_primary_score",
    missionPool: "explorer",
    rewardSeasonXp: 80,
  },
  {
    taskId: "weekly_two_distinct_games",
    title: "2 个不同游戏各完成至少 1 局",
    target: 2,
    tier: "weekly",
    objectiveKind: "submit_distinct_games",
    missionPool: "explorer",
    rewardSeasonXp: 120,
    minRunsPerGame: 1,
  },
  {
    taskId: "season_game_explorer_5",
    title: "非主游戏累计有效结算 5 局",
    target: 5,
    tier: "season",
    objectiveKind: "submit_non_primary_score",
    missionPool: "explorer",
    rewardSeasonXp: 200,
  },
  {
    taskId: "season_platform_polyglot",
    title: "3 个不同游戏各累计至少 5 局",
    target: 3,
    tier: "season",
    objectiveKind: "submit_distinct_games",
    missionPool: "explorer",
    rewardVouchers: 2,
    rewardSeasonXp: 400,
    minRunsPerGame: 5,
  },
  // --- 板 D：PVP（上线后生效） ---
  {
    taskId: "weekly_pvp_any_3",
    title: "任意 PVP 完成 3 局",
    target: 3,
    tier: "weekly",
    objectiveKind: "submit_pvp_settled",
    missionPool: "pvp",
    rewardSeasonXp: 100,
  },
  {
    taskId: "season_pvp_win_10",
    title: "PVP 累计获得 10 胜",
    target: 10,
    tier: "season",
    objectiveKind: "submit_pvp_win",
    missionPool: "pvp",
    rewardSeasonXp: 300,
  },
  // --- 专场高参与（可选） ---
  {
    taskId: "season_spotlight_10",
    title: "本赛季累计完成赛季专场结算 10 次",
    target: 10,
    tier: "season",
    objectiveKind: "submit_spotlight_score",
    missionPool: "spotlight",
    rewardVouchers: 3,
    rewardSeasonXp: 200,
  },
  {
    taskId: "season_spotlight_season_pts_80",
    title: "本赛季专场对局累计获得 80 赛季分（仅正分计入）",
    target: 80,
    tier: "season",
    objectiveKind: "earn_spotlight_season_board_points",
    missionPool: "spotlight",
    rewardVouchers: 5,
    rewardSeasonXp: 400,
  },
];

/** @deprecated 旧 taskId → 新 taskId（进度不迁移，仅 UI 兼容） */
export const LEGACY_MISSION_TASK_ID_ALIASES: Record<string, string> = {
  daily_async_1: "daily_platform_async_1",
  daily_runs_3: "daily_platform_runs_3",
  weekly_async_8: "weekly_platform_async_8",
  weekly_runs_15: "weekly_platform_runs_15",
  season_join_tournament_1: "season_first_tournament",
  season_runs_60: "season_platform_runs_60",
};

export function missionPoolLabelZh(pool: MissionPool): string {
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
