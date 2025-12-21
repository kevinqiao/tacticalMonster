/**
 * 怪物技能辅助函数
 * 用于从 Monster 配置中获取技能相关信息
 * 
 * 注意：所有技能配置都从 skillConfigs.ts 读取（如果存在），否则返回空数组
 */

import { Monster } from "./monsterConfigs";

/**
 * 从 Monster 配置获取技能ID列表
 * 使用 skillIds 引用技能配置
 */
export function getMonsterSkillIds(monster: Monster): string[] {
    return monster.skillIds || [];
}

/**
 * 检查怪物是否拥有指定技能
 */
export function monsterHasSkill(monster: Monster, skillId: string): boolean {
    const skillIds = getMonsterSkillIds(monster);
    return skillIds.includes(skillId);
}

