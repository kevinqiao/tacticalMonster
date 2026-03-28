import type { StageRuleConfig } from "../types/stageRuleTypes";
import { getModeTypeForRuleId } from "../utils/tournamentModeType";

/** 与前端 utils/stageRuleValidation 保持一致 */
export function validateStageRuleModeConstraints(rule: StageRuleConfig): string[] {
    const errs: string[] = [];
    const mode = getModeTypeForRuleId(rule.ruleId);
    const preset = rule.teamPreset;

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
