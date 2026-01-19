/**
 * Tactical Monster 技能管理器（前端）
 * 统一使用后端 SkillManager 的 static 方法
 * 提供前端特有的功能：乐观更新支持、UI显示
 * 
 * 注意：被动技能触发现在由后端统一处理，确保状态一致性
 */

import { SkillManager as BackendSkillManager } from "../../../../../../convex/tacticalMonster/convex/service/skill/skillManager";
import { getSkillConfig } from "../config/skillConfigs";
import type { GameModel } from "../types/CombatTypes";
import { MonsterSprite } from "../types/CombatTypes";
import { GameMonster } from "../types/monsterTypes";
import { MonsterSkill, SkillEffect, SkillEffectType } from "../types/skillTypes";
import { applyEffect, calculateEffectValue } from '../utils/effectUtils';
import { calculateHexDistance } from '../utils/hexUtil';
import { SeededRandom } from '../utils/seededRandom';
import { getCharactersFromGameModel } from '../utils/typeAdapter';

/**
 * 前端 SkillManager - 统一使用后端 SkillManager
 * 提供前端特有的功能：乐观更新支持、UI显示
 * 
 * 注意：被动技能触发现在由后端统一处理，确保状态一致性
 */
export class SkillManager {
    /**
     * 检查技能是否在冷却中（使用后端方法）
     */
    static isSkillOnCooldown(skillId: string, monster: GameMonster): boolean {
        return BackendSkillManager.isSkillOnCooldown(skillId, monster);
    }

    /**
     * 检查技能可用性（使用后端方法）
     */
    static checkSkillAvailability(
        skillId: string,
        monster: GameMonster,
        context?: Record<string, any>
    ): { available: boolean; reason?: string } {
        return BackendSkillManager.checkSkillAvailability(skillId, monster, context);
    }

    /**
     * 使用技能（使用后端方法，添加前端扩展）
     * @param skillId 技能ID
     * @param monster 怪物实例（会被修改）
     * @param targets 目标列表（可选）
     * @param context 上下文信息（可选）
     * @param rng 可选的确定性随机数生成器，用于乐观更新
     * @returns 使用结果
     */
    static useSkill(
        skillId: string,
        monster: GameMonster,
        targets?: GameMonster[],
        context?: Record<string, any>,
        rng?: SeededRandom
    ): { success: boolean; message?: string; cooldownSet?: number; resourcesConsumed?: any; effects?: any[] } {
        // 使用后端 SkillManager
        // 注意：被动技能触发现在由后端统一处理，确保状态一致性
        const result = BackendSkillManager.useSkill(skillId, monster, targets, context);

        return result;
    }

    /**
     * 检查被动技能触发（已废弃）
     * 
     * @deprecated 被动技能触发现在由后端统一处理，确保状态一致性
     * 此方法保留仅用于向后兼容或特殊UI场景
     * 
     * @param monster 检查被动技能的角色
     * @param triggerTarget 触发目标（如攻击者）
     * @param triggerType 触发类型（如 "on_hit", "on_skill_attacked"）
     * @param rng 可选的确定性随机数生成器
     */
    static checkPassiveSkillTrigger(
        monster: GameMonster,
        triggerTarget: GameMonster,
        triggerType: string,
        rng?: SeededRandom
    ): void {
        // 注意：被动技能触发现在由后端统一处理
        // 此方法保留仅用于向后兼容或特殊UI场景
        // 不建议在业务逻辑中使用，因为会导致前后端状态不一致
        console.warn('checkPassiveSkillTrigger is deprecated. Passive skills are now handled by backend.');

        if (!monster.skills || !Array.isArray(monster.skills)) return;

        // 检查所有被动技能
        for (const skillId of monster.skills) {
            const skill = getSkillConfig(skillId);

            if (!skill || skill.type !== 'passive') continue;

            // 检查是否应该触发（使用后端方法）
            if (BackendSkillManager.shouldTriggerPassiveSkill(skillId, monster, triggerType)) {
                // 获取被动技能效果
                const effects = BackendSkillManager.getPassiveSkillEffects(skillId, triggerType);

                // 应用效果到触发目标
                for (const effect of effects) {
                    // 使用后端方法应用效果
                    BackendSkillManager.applyEffectToTarget(effect, triggerTarget, monster);
                }
            }
        }
    }

    /**
     * 执行技能效果（前端特有：支持 RNG 和距离计算）
     * @param skill 技能配置
     * @param caster 施法者
     * @param targets 目标列表
     * @param game 游戏状态（用于计算距离、范围等）
     * @param rng 可选的确定性随机数生成器
     */
    static executeSkillWithRNG(
        skill: MonsterSkill,
        caster: MonsterSprite,
        targets: MonsterSprite[],
        game: GameModel,
        rng?: SeededRandom
    ): void {
        console.log(`${caster.name} 执行技能: ${skill.name}`);

        for (const effect of skill.effects) {
            if (effect.area_type && effect.area_type !== 'single') {
                // 处理群体效果
                const areaTargets = this.getTargetsInRange(effect, targets[0] || caster, caster, game);
                areaTargets.forEach(target => {
                    const distance = calculateHexDistance(
                        { q: caster.q ?? 0, r: caster.r ?? 0 },
                        { q: target.q ?? 0, r: target.r ?? 0 }
                    );
                    const finalEffect = calculateEffectValue(caster, target, effect, distance, rng);
                    applyEffect(target, finalEffect);
                });
            } else {
                // 处理单体效果
                const recipient = this.determineEffectTarget(effect, targets[0], caster);
                if (recipient) {
                    const distance = calculateHexDistance(
                        { q: caster.q ?? 0, r: caster.r ?? 0 },
                        { q: recipient.q ?? 0, r: recipient.r ?? 0 }
                    );
                    const finalEffect = calculateEffectValue(caster, recipient, effect, distance, rng);
                    applyEffect(recipient, finalEffect);
                }
            }
        }
    }

    /**
     * 确定效果目标
     */
    private static determineEffectTarget(
        effect: SkillEffect,
        target: MonsterSprite | undefined,
        caster: MonsterSprite
    ): MonsterSprite | undefined {
        if (effect.area_type && effect.area_type !== 'single') {
            return undefined;
        }

        // 根据效果类型确定目标
        switch (effect.type) {
            case SkillEffectType.BUFF:
            case SkillEffectType.HOT:
            case SkillEffectType.MP_RESTORE:
            case SkillEffectType.SHIELD:
                return caster;

            case SkillEffectType.DEBUFF:
            case SkillEffectType.DOT:
            case SkillEffectType.MP_DRAIN:
            case SkillEffectType.STUN:
                return target;

            default:
                return target || caster;
        }
    }

    /**
     * 获取范围内的目标（群体效果）
     */
    private static getTargetsInRange(
        effect: SkillEffect,
        center: MonsterSprite,
        caster: MonsterSprite,
        game: GameModel
    ): MonsterSprite[] {
        const targets: MonsterSprite[] = [];
        const centerPos = { q: center.q ?? 0, r: center.r ?? 0 };
        const range = effect.area_size || effect.damage_falloff?.full_damage_range || 1;

        const characters = getCharactersFromGameModel(game.team, game.boss);
        characters.forEach(char => {
            if (char.uid === caster.uid && effect.type !== SkillEffectType.BUFF) {
                return; // 跳过自己（除非是BUFF）
            }

            const distance = calculateHexDistance(
                centerPos,
                { q: char.q ?? 0, r: char.r ?? 0 }
            );

            if (effect.area_type === 'circle' && distance <= range) {
                targets.push(char);
            } else if (effect.area_type === 'line') {
                // 简化实现：距离在范围内即可
                if (distance <= range) {
                    targets.push(char);
                }
            }
        });

        return targets;
    }

    /**
     * 更新冷却时间（每回合结束时调用）
     */
    static reduceCooldowns(monster: GameMonster): void {
        BackendSkillManager.reduceCooldowns(monster);
    }

    /**
     * 获取可用技能列表
     */
    static getAvailableSkills(
        monster: GameMonster,
        context?: Record<string, any>
    ): MonsterSkill[] {
        const availableSkills: MonsterSkill[] = [];

        if (!monster.skills || !Array.isArray(monster.skills)) {
            return availableSkills;
        }

        for (const skillId of monster.skills) {

            const skill = getSkillConfig(skillId);

            if (!skill) continue;

            if (skill.type === 'active' || skill.type === 'master') {
                const availability = this.checkSkillAvailability(skillId, monster, context);
                if (availability.available) {
                    availableSkills.push(skill);
                }
            }
        }

        return availableSkills;
    }
}
