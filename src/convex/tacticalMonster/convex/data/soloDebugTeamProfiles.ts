/**
 * 调试编队表：由 StageRuleConfig.debugTeamProfileKey 引用。
 * Solo Challenge 可配置此项以在 createGame 中注入试用队；不配则使用玩家库队伍（mr_player_monsters）。
 * 勿与 teamPreset.override 同关混用；见 teamPresetService / gameLifecycleService。
 */
import type { TeamPresetSlot } from "../types/stageRuleTypes";

export const SOLO_DEBUG_TEAM_PROFILES: Record<string, TeamPresetSlot[]> = {
    /** 默认 2 人队：与常见 solo 测试一致，可在本文件内改等级/技能做热更 */
    default: [
        { monsterId: "monster_001", level: 5, stars: 2, q: 0, r: 0, unlockSkills: ["basic_attack", "griffin_claw_attack"] },
        { monsterId: "monster_004", level: 4, stars: 2, q: 1, r: 0, unlockSkills: ["basic_attack", "shield"] },
    ],
};
