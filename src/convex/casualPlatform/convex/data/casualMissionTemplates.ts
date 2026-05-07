/** 轻量任务模板：日/周/赛季 + `periodKey`；与 `casual_tasks` 进度合并展示 */

export type MissionTier = "daily" | "weekly" | "season";

/** 进度由服务端事件驱动递增（见 `casualTaskService.notifyScoreSubmitted` 等） */
export type MissionObjectiveKind =
  | "login_daily"
  | "join_tournament_once"
  | "submit_any_score"
  | "submit_async_score"
  | "submit_spotlight_score"
  | "earn_spotlight_challenge_points"
  | "submit_spotlight_rating_at_least";

export type SpotlightRating = "S" | "A" | "B" | "C";

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
  /** 领取时发放赛季挑战点（货架/解锁用 `seasonChallengePoints`） */
  rewardSeasonChallengePoints?: number;
  /** 专场档位阈值（仅 objectiveKind = submit_spotlight_rating_at_least 生效） */
  minSpotlightRating?: SpotlightRating;
}

export const CASUAL_MISSION_TEMPLATES: CasualMissionTemplate[] = [
  // —— 每日（含签到）——
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
  // —— 每周 ——
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
    taskId: "weekly_spotlight_rating_a_2",
    title: "本周专场结算达到 A 档及以上 2 次",
    target: 2,
    tier: "weekly",
    objectiveKind: "submit_spotlight_rating_at_least",
    minSpotlightRating: "A",
    rewardVouchers: 1,
    rewardSeasonXp: 100,
  },
  {
    taskId: "weekly_challenge_points_20",
    title: "本周通过专场累计获得 20 赛季点",
    target: 20,
    tier: "weekly",
    objectiveKind: "earn_spotlight_challenge_points",
    rewardSeasonChallengePoints: 6,
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
  // —— 赛季 ——
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
    rewardSeasonChallengePoints: 10,
  },
  {
    taskId: "season_spotlight_rating_s_3",
    title: "本赛季专场结算达到 S 档 3 次",
    target: 3,
    tier: "season",
    objectiveKind: "submit_spotlight_rating_at_least",
    minSpotlightRating: "S",
    rewardSeasonChallengePoints: 12,
    rewardVouchers: 2,
  },
  {
    taskId: "season_challenge_points_80",
    title: "本赛季通过专场累计获得 80 赛季点",
    target: 80,
    tier: "season",
    objectiveKind: "earn_spotlight_challenge_points",
    rewardVouchers: 5,
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
