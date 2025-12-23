/**
 * Tactical Monster 技能组合工具函数
 * 处理技能组合效果检测和加成计算
 */

import { Skill } from "../types/CharacterTypes";
import { MonsterSprite } from "../types/CombatTypes";

export interface SkillCombo {
    skillIds: string[];  // 组合中的技能ID列表
    comboName: string;    // 组合名称
    bonusMultiplier: number;  // 伤害/效果加成倍数
    additionalEffects?: any[];  // 额外效果
}

/**
 * 预定义的技能组合
 */
const PREDEFINED_COMBOS: SkillCombo[] = [
    {
        skillIds: ["heavy_strike", "charge"],
        comboName: "冲锋重击",
        bonusMultiplier: 1.3,
        additionalEffects: []
    },
    {
        skillIds: ["fireball", "ice_arrow"],
        comboName: "冰火两重天",
        bonusMultiplier: 1.5,
        additionalEffects: []
    }
];

/**
 * 检测技能组合
 */
export const detectSkillCombo = (
    usedSkills: string[],
    allCombos: SkillCombo[] = PREDEFINED_COMBOS
): SkillCombo | null => {
    for (const combo of allCombos) {
        // 检查是否使用了组合中的所有技能
        const hasAllSkills = combo.skillIds.every(skillId =>
            usedSkills.includes(skillId)
        );

        if (hasAllSkills) {
            return combo;
        }
    }

    return null;
};

/**
 * 计算组合加成
 */
export const calculateComboBonus = (
    baseValue: number,
    combo: SkillCombo
): number => {
    return Math.round(baseValue * combo.bonusMultiplier);
};

/**
 * 检查技能是否可以触发组合
 */
export const canTriggerCombo = (
    currentSkill: Skill,
    previousSkills: string[],
    allCombos: SkillCombo[] = PREDEFINED_COMBOS
): SkillCombo | null => {
    const testSkills = [...previousSkills, currentSkill.id];
    return detectSkillCombo(testSkills, allCombos);
};

/**
 * 获取技能组合信息
 */
export const getSkillComboInfo = (
    character: MonsterSprite,
    skillId: string
): SkillCombo[] => {
    const combos: SkillCombo[] = [];
    const characterSkills = character.skills?.map(s => s.id) || [];

    for (const combo of PREDEFINED_COMBOS) {
        if (combo.skillIds.includes(skillId) &&
            combo.skillIds.every(id => characterSkills.includes(id))) {
            combos.push(combo);
        }
    }

    return combos;
};

