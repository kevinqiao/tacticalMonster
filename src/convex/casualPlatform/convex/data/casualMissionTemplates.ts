/** 轻量任务模板：日/周/赛季 + `periodKey`；与 `casual_tasks` 进度合并展示 */

export type MissionTier = "daily" | "weekly" | "season";

/** 进度由服务端事件驱动递增（见 `casualTaskService.notifyScoreSubmitted` 等） */
export type MissionObjectiveKind =
  | "login_daily"
  | "join_tournament_once"
  | "submit_any_score"
  | "submit_async_score"
  | "submit_spotlight_score"
  | "earn_spotlight_season_board_points";

export interface CasualMissionTemplate {
  taskId: string;
  title: string;
  target: number;
  tier: MissionTier;
  objectiveKind: MissionObjectiveKind;
  /** 领取时发放（日周赛季券按蓝图克制投放） */
  rewardVouchers?: number;
  rewardSeasonXp?: number;
  rewardCoins?: number;
}

export const CASUAL_MISSION_TEMPLATES: CasualMissionTemplate[] = [
  {
    taskId: "daily_sign_in",
    title: "每日签到",
    target: 1,
    tier: "daily",
    objectiveKind: "login_daily",
    rewardCoins: 15,
    rewardSeasonXp: 10,
  },
  {
    taskId: "daily_async_1",
    title: "完成 1 次异步锦标（A/B/C）",
    target: 1,
    tier: "daily",
    objectiveKind: "submit_async_score",
    rewardSeasonXp: 40,
  },
  {
    taskId: "daily_spotlight_1",
    title: "完成 1 次赛季专场",
    target: 1,
    tier: "daily",
    objectiveKind: "submit_spotlight_score",
    rewardVouchers: 1,
    rewardSeasonXp: 30,
  },
  {
    taskId: "daily_runs_3",
    title: "当日累计完成 3 局有效结算（任意模式）",
    target: 3,
    tier: "daily",
    objectiveKind: "submit_any_score",
    rewardSeasonXp: 60,
  },
  {
    taskId: "weekly_async_8",
    title: "本周完成异步锦标结算 8 次",
    target: 8,
    tier: "weekly",
    objectiveKind: "submit_async_score",
    rewardSeasonXp: 250,
  },
  {
    taskId: "weekly_spotlight_3",
    title: "本周完成赛季专场结算 3 次",
    target: 3,
    tier: "weekly",
    objectiveKind: "submit_spotlight_score",
    rewardVouchers: 3,
  },
  {
    taskId: "weekly_spotlight_season_pts_20",
    title: "本周专场对局累计获得 20 赛季分（仅正分计入）",
    target: 20,
    tier: "weekly",
    objectiveKind: "earn_spotlight_season_board_points",
    rewardSeasonXp: 80,
  },
  {
    taskId: "weekly_runs_15",
    title: "本周累计有效结算 15 局（任意模式）",
    target: 15,
    tier: "weekly",
    objectiveKind: "submit_any_score",
    rewardVouchers: 2,
    rewardSeasonXp: 120,
  },
  {
    taskId: "season_join_tournament_1",
    title: "本赛季首次加入任意锦标赛",
    target: 1,
    tier: "season",
    objectiveKind: "join_tournament_once",
    rewardVouchers: 1,
    rewardSeasonXp: 20,
  },
  {
    taskId: "season_spotlight_10",
    title: "本赛季累计完成赛季专场结算 10 次",
    target: 10,
    tier: "season",
    objectiveKind: "submit_spotlight_score",
    rewardVouchers: 3,
    rewardSeasonXp: 200,
  },
  {
    taskId: "season_spotlight_season_pts_80",
    title: "本赛季专场对局累计获得 80 赛季分（仅正分计入）",
    target: 80,
    tier: "season",
    objectiveKind: "earn_spotlight_season_board_points",
    rewardVouchers: 5,
    rewardSeasonXp: 400,
  },
  {
    taskId: "season_runs_60",
    title: "本赛季累计有效结算 60 局（任意模式）",
    target: 60,
    tier: "season",
    objectiveKind: "submit_any_score",
    rewardSeasonXp: 500,
  },
];
