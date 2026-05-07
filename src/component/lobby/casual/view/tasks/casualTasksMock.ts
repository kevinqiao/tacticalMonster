import type { MissionTier } from "@/convex/casualPlatform/convex/data/casualMissionTemplates";

/** 与 `listSeasonMissions` 合并行字段对齐，用于界面四态预览 */
export interface MockPreviewMission {
  taskId: string;
  title: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  tier: MissionTier;
  /** 当 taskId 不在模板表中时，用于展示奖励角标 */
  previewRewardChips?: string[];
}

/**
 * 四种任务状态各一行：未开始 / 进行中 / 可领取 / 已完成
 * 前 3 行绑定真实模板以便奖励角标与领取逻辑一致（预览模式下不请求接口）
 */
export const MOCK_TASK_FOUR_PHASES: MockPreviewMission[] = [
  {
    taskId: "daily_sign_in",
    title: "每日签到（示例）",
    target: 1,
    progress: 0,
    completed: false,
    claimed: false,
    tier: "daily",
  },
  {
    taskId: "season_runs_60",
    title: "累计对局（示例）",
    target: 60,
    progress: 12,
    completed: false,
    claimed: false,
    tier: "season",
  },
  {
    taskId: "season_join_tournament_1",
    title: "加入锦标赛（示例）",
    target: 1,
    progress: 1,
    completed: true,
    claimed: false,
    tier: "season",
  },
  {
    taskId: "mock_preview_mission_claimed",
    title: "赛季：累计邀请 3 位好友（示例）",
    target: 3,
    progress: 3,
    completed: true,
    claimed: true,
    tier: "weekly",
    previewRewardChips: ["赛季券 +2", "赛季 XP +30"],
  },
];
