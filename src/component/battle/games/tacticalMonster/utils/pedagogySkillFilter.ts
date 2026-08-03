import { getStageRuleConfig } from "../config/stageRuleConfigs";

/**
 * 按关卡 pedagogy.allowedSkillIds 过滤技能（未配置则原样返回）
 */
export function filterSkillIdsForPedagogy(ruleId: string | undefined, skillIds: string[]): string[] {
    if (!ruleId || skillIds.length === 0) return skillIds;
    const cfg = getStageRuleConfig(ruleId);
    const allowed = cfg?.pedagogy?.allowedSkillIds;
    if (!allowed || allowed.length === 0) return skillIds;
    const set = new Set(allowed);
    return skillIds.filter((id) => set.has(id));
}
