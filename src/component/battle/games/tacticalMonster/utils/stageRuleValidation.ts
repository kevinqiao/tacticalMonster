import { getTournamentConfig, resolveTournamentMode } from "@/convex/tournament/convex/data/tournamentConfigs";
import type { StageModeType, StageRuleConfig } from "../types/stageRuleTypes";

/**
 * 校验 modeType 与 teamPreset 的组合约束（与后端验收一致）
 * modeType 以 Convex 锦标赛种子 `tournamentConfigs` 为准；可显式传入覆盖。
 */
export function validateStageRuleModeConstraints(rule: StageRuleConfig, modeType?: StageModeType): string[] {
    const errs: string[] = [];
    const mode = modeType ?? resolveTournamentMode(getTournamentConfig(rule.ruleId));
    const preset = rule.teamPreset;

    if (!mode) {
        return errs;
    }

    if (mode === "tutorial") {
        if (preset?.mode !== "override") {
            errs.push(`${rule.ruleId}: tutorial 须配置 teamPreset.mode = "override"`);
        }
    }
    if (mode === "multiplayer_tournament") {
        if (preset && preset.mode !== "none") {
            errs.push(`${rule.ruleId}: multiplayer_tournament 须 teamPreset.mode = "none"`);
        }
    }
    return errs;
}
