/** 静态赛季任务模板；与 `casual_tasks` 进度合并展示 */

export interface CasualMissionTemplate {
  taskId: string;
  title: string;
  target: number;
}

export const CASUAL_MISSION_TEMPLATES: CasualMissionTemplate[] = [
  { taskId: "casual_play_block_blast_1", title: "Complete 1 Block Blast run", target: 1 },
  { taskId: "casual_join_tournament_1", title: "Join any tournament", target: 1 },
];
