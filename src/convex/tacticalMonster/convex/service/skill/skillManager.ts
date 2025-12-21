/**
 * 技能管理器 (SkillManager)
 * 基于 skillConfigs.ts 中的类型定义实现
 * 负责技能的解锁检查、可用性验证、资源消耗、冷却管理等
 */

import {
    MonsterSkill,
    SkillEffect,
    SkillEffectType,
    getSkillConfig,
    skillExists
} from "../../data/skillConfigs";
import { GameMonster } from "../../types/monsterTypes";

/**
 * 技能解锁检查结果
 */
export interface SkillUnlockResult {
    unlocked: boolean;
    reason?: string;
}

/**
 * 技能可用性检查结果
 */
export interface SkillAvailabilityResult {
    available: boolean;
    reason?: string;
}

/**
 * 技能使用结果
 */
export interface SkillUseResult {
    success: boolean;
    message?: string;
    cooldownSet?: number;
    resourcesConsumed?: {
        mp?: number;
        hp?: number;
        stamina?: number;
    };
    effects?: Array<{
        effect: SkillEffect;
        targetId?: string;
        applied: boolean;
    }>;
}

/**
 * 技能管理器类
 */
export class SkillManager {
    /**
     * 检查技能是否已解锁
     * @param skillId 技能ID
     * @param monster 怪物实例
     * @param completedQuests 已完成的任务ID列表（可选）
     * @returns 解锁检查结果
     */
    static checkSkillUnlock(
        skillId: string,
        monster: GameMonster,
        completedQuests?: string[]
    ): SkillUnlockResult {
        const skill = getSkillConfig(skillId);
        if (!skill) {
            return {
                unlocked: false,
                reason: `技能 ${skillId} 不存在`,
            };
        }

        // 检查解锁条件
        const unlockConditions = skill.unlockConditions;
        if (!unlockConditions) {
            // 没有解锁条件，默认已解锁
            return { unlocked: true };
        }

        // 检查等级要求
        if (unlockConditions.level && monster.level < unlockConditions.level) {
            return {
                unlocked: false,
                reason: `需要等级 ${unlockConditions.level}，当前等级 ${monster.level}`,
            };
        }

        // 检查任务完成要求
        if (unlockConditions.questsCompleted && unlockConditions.questsCompleted.length > 0) {
            if (!completedQuests) {
                return {
                    unlocked: false,
                    reason: `需要完成以下任务: ${unlockConditions.questsCompleted.join(", ")}`,
                };
            }

            const missingQuests = unlockConditions.questsCompleted.filter(
                (questId) => !completedQuests.includes(questId)
            );
            if (missingQuests.length > 0) {
                return {
                    unlocked: false,
                    reason: `需要完成以下任务: ${missingQuests.join(", ")}`,
                };
            }
        }

        return { unlocked: true };
    }

    /**
     * 检查技能是否可用（资源、冷却、条件）
     * @param skillId 技能ID
     * @param monster 怪物实例
     * @param context 上下文信息（用于条件检查，可选）
     * @returns 可用性检查结果
     */
    static checkSkillAvailability(
        skillId: string,
        monster: GameMonster,
        context?: Record<string, any>
    ): SkillAvailabilityResult {
        const skill = getSkillConfig(skillId);
        if (!skill) {
            return {
                available: false,
                reason: `技能 ${skillId} 不存在`,
            };
        }

        // 检查技能是否已解锁
        const unlockedSkills = monster.unlockSkills || [];
        if (!unlockedSkills.includes(skillId)) {
            const unlockResult = this.checkSkillUnlock(skillId, monster, context?.completedQuests);
            if (!unlockResult.unlocked) {
                return {
                    available: false,
                    reason: unlockResult.reason || "技能未解锁",
                };
            }
        }

        // 检查冷却时间
        const cooldowns = monster.skillCooldowns || {};
        const cooldown = cooldowns[skillId];
        if (cooldown !== undefined && cooldown > 0) {
            return {
                available: false,
                reason: `技能冷却中，剩余 ${cooldown} 回合`,
            };
        }

        // 检查资源消耗
        const resourceCheck = this.checkResourceAvailability(skill, monster);
        if (!resourceCheck.available) {
            return resourceCheck;
        }

        // 检查可用性条件（使用 json-rules-engine，这里简化处理）
        if (skill.availabilityConditions) {
            // TODO: 如果需要，可以集成 json-rules-engine 进行复杂条件检查
            // 目前简化处理，假设条件满足
        }

        return { available: true };
    }

    /**
     * 检查资源是否足够
     * @param skill 技能配置
     * @param monster 怪物实例
     * @returns 资源可用性检查结果
     */
    static checkResourceAvailability(
        skill: MonsterSkill,
        monster: GameMonster
    ): SkillAvailabilityResult {
        const resourceCost = skill.resource_cost;
        if (!resourceCost) {
            return { available: true };
        }

        const stats = monster.stats || {};

        // 检查 MP
        if (resourceCost.mp) {
            const currentMp = stats.mp?.current ?? 0;
            if (currentMp < resourceCost.mp) {
                return {
                    available: false,
                    reason: `MP 不足，需要 ${resourceCost.mp}，当前 ${currentMp}`,
                };
            }
        }

        // 检查 HP
        if (resourceCost.hp) {
            const currentHp = stats.hp?.current ?? 0;
            if (currentHp < resourceCost.hp) {
                return {
                    available: false,
                    reason: `HP 不足，需要 ${resourceCost.hp}，当前 ${currentHp}`,
                };
            }
        }

        // 检查 Stamina
        if (resourceCost.stamina) {
            const currentStamina = stats.stamina ?? 0;
            if (currentStamina < resourceCost.stamina) {
                return {
                    available: false,
                    reason: `体力不足，需要 ${resourceCost.stamina}，当前 ${currentStamina}`,
                };
            }
        }

        return { available: true };
    }

    /**
     * 应用资源消耗
     * @param skill 技能配置
     * @param monster 怪物实例（会被修改）
     * @returns 消耗的资源信息
     */
    static applyResourceCost(
        skill: MonsterSkill,
        monster: GameMonster
    ): { mp?: number; hp?: number; stamina?: number } {
        const resourceCost = skill.resource_cost;
        const consumed: { mp?: number; hp?: number; stamina?: number } = {};

        if (!resourceCost || !monster.stats) {
            return consumed;
        }

        // 消耗 MP
        if (resourceCost.mp && monster.stats.mp) {
            const currentMp = monster.stats.mp.current ?? 0;
            const newMp = Math.max(0, currentMp - resourceCost.mp);
            monster.stats.mp.current = newMp;
            consumed.mp = resourceCost.mp;
        }

        // 消耗 HP
        if (resourceCost.hp && monster.stats.hp) {
            const currentHp = monster.stats.hp.current ?? 0;
            const newHp = Math.max(0, currentHp - resourceCost.hp);
            monster.stats.hp.current = newHp;
            consumed.hp = resourceCost.hp;
        }

        // 消耗 Stamina
        if (resourceCost.stamina && monster.stats.stamina !== undefined) {
            const currentStamina = monster.stats.stamina ?? 0;
            const newStamina = Math.max(0, currentStamina - resourceCost.stamina);
            monster.stats.stamina = newStamina;
            consumed.stamina = resourceCost.stamina;
        }

        return consumed;
    }

    /**
     * 设置技能冷却时间
     * @param skillId 技能ID
     * @param monster 怪物实例（会被修改）
     * @param cooldown 冷却时间（回合数），如果不提供则使用技能配置的 cooldown
     */
    static setSkillCooldown(
        skillId: string,
        monster: GameMonster,
        cooldown?: number
    ): void {
        const skill = getSkillConfig(skillId);
        if (!skill) {
            return;
        }

        if (!monster.skillCooldowns) {
            monster.skillCooldowns = {};
        }

        const cooldownValue = cooldown !== undefined ? cooldown : skill.cooldown;
        monster.skillCooldowns[skillId] = cooldownValue;
    }

    /**
     * 减少技能冷却时间（每回合调用）
     * @param monster 怪物实例（会被修改）
     */
    static reduceCooldowns(monster: GameMonster): void {
        if (!monster.skillCooldowns) {
            return;
        }

        for (const skillId in monster.skillCooldowns) {
            if (monster.skillCooldowns[skillId] > 0) {
                monster.skillCooldowns[skillId]--;
            }
        }
    }

    /**
     * 使用技能（主动技能）
     * @param skillId 技能ID
     * @param monster 怪物实例（会被修改）
     * @param targets 目标列表（可选，如果不提供则返回效果信息供调用者处理）
     * @param context 上下文信息（可选）
     * @returns 使用结果，包含应用的效果信息
     */
    static useSkill(
        skillId: string,
        monster: GameMonster,
        targets?: GameMonster[],
        context?: Record<string, any>
    ): SkillUseResult {
        // 1. 检查技能是否存在
        if (!skillExists(skillId)) {
            return {
                success: false,
                message: `技能 ${skillId} 不存在`,
            };
        }

        const skill = getSkillConfig(skillId);
        if (!skill) {
            return {
                success: false,
                message: `无法获取技能配置 ${skillId}`,
            };
        }

        // 2. 检查技能类型（只能使用主动技能）
        if (skill.type !== "active" && skill.type !== "master") {
            return {
                success: false,
                message: `技能 ${skill.name} 不是主动技能，无法使用`,
            };
        }

        // 3. 检查可用性（资源、冷却等）
        const availability = this.checkSkillAvailability(skillId, monster, context);
        if (!availability.available) {
            return {
                success: false,
                message: availability.reason || "技能不可用",
            };
        }

        // 4. 验证目标有效性（在消耗资源之前）
        // 检查技能是否需要目标
        const effects = skill.effects || [];
        const needsTarget = effects.some(effect => {
            // 伤害、治疗、Debuff等效果通常需要目标
            return effect.type === SkillEffectType.DAMAGE ||
                effect.type === SkillEffectType.HEAL ||
                effect.type === SkillEffectType.DEBUFF ||
                effect.type === SkillEffectType.STUN ||
                effect.type === SkillEffectType.MP_DRAIN;
        });

        if (needsTarget) {
            // 需要目标的技能：验证目标是否存在且有效
            if (!targets || targets.length === 0) {
                return {
                    success: false,
                    message: `技能 ${skill.name} 需要至少一个目标`,
                };
            }

            // 验证所有目标是否有效（至少有一个有效目标）
            const validTargets = targets.filter(target =>
                target && target.stats && target.stats.hp && target.stats.hp.current > 0
            );

            if (validTargets.length === 0) {
                return {
                    success: false,
                    message: `技能 ${skill.name} 的所有目标都无效或已死亡`,
                };
            }

            // 对于单体技能，确保至少有一个有效目标
            const hasSingleTargetEffect = effects.some(effect =>
                !effect.area_type || effect.area_type === "single"
            );
            if (hasSingleTargetEffect && validTargets.length === 0) {
                return {
                    success: false,
                    message: `技能 ${skill.name} 需要至少一个有效目标`,
                };
            }
        }

        // 5. 应用资源消耗（在确认目标有效后）
        const resourcesConsumed = this.applyResourceCost(skill, monster);

        // 6. 设置冷却时间（在确认目标有效后）
        this.setSkillCooldown(skillId, monster);

        // 7. 应用效果到目标
        const appliedEffects: Array<{
            effect: SkillEffect;
            targetId?: string;
            applied: boolean;
        }> = [];

        if (targets && targets.length > 0) {
            // 过滤有效目标（只处理存活的目标）
            const validTargets = targets.filter(target =>
                target && target.stats && target.stats.hp && target.stats.hp.current > 0
            );

            for (const effect of effects) {
                // 判断是单体还是群体效果
                const isAreaEffect = effect.area_type && effect.area_type !== "single";

                if (isAreaEffect) {
                    // 群体效果：应用到所有有效目标
                    for (const target of validTargets) {
                        const applied = this.applyEffectToTarget(effect, target, monster);
                        appliedEffects.push({
                            effect,
                            targetId: target.monsterId,
                            applied,
                        });
                    }
                } else {
                    // 单体效果：应用到第一个有效目标
                    if (validTargets.length > 0) {
                        const target = validTargets[0];
                        const applied = this.applyEffectToTarget(effect, target, monster);
                        appliedEffects.push({
                            effect,
                            targetId: target.monsterId,
                            applied,
                        });
                    }
                }
            }
        } else if (!needsTarget) {
            // 不需要目标的技能（如给自己加BUFF），直接应用效果
            for (const effect of effects) {
                // 对于不需要目标的技能，可以应用到施法者自己
                const applied = this.applyEffectToTarget(effect, monster, monster);
                appliedEffects.push({
                    effect,
                    targetId: monster.monsterId,
                    applied,
                });
            }
        }

        return {
            success: true,
            message: `成功使用技能 ${skill.name}`,
            cooldownSet: skill.cooldown,
            resourcesConsumed,
            effects: appliedEffects,
        };
    }

    /**
     * 应用效果到目标
     * @param effect 技能效果
     * @param target 目标怪物（会被修改）
     * @param caster 施法者怪物（用于计算效果值）
     * @returns 是否成功应用
     */
    static applyEffectToTarget(
        effect: SkillEffect,
        target: GameMonster,
        caster: GameMonster
    ): boolean {
        if (!target.stats) {
            return false;
        }

        // 初始化 statusEffects
        if (!target.statusEffects) {
            target.statusEffects = [];
        }

        // 根据效果类型应用
        switch (effect.type) {
            case SkillEffectType.DAMAGE:
                // 伤害效果
                if (effect.value !== undefined && effect.target_attribute === "hp") {
                    const damage = this.calculateDamage(effect.value, caster, target, effect);
                    const currentHp = target.stats.hp?.current ?? 0;
                    target.stats.hp.current = Math.max(0, currentHp - damage);

                    // 添加效果到 statusEffects（用于显示和后续处理）
                    const effectCopy = { ...effect, remaining_duration: effect.duration || 0 };
                    target.statusEffects.push(effectCopy);
                    return true;
                }
                break;

            case SkillEffectType.HEAL:
                // 治疗效果
                if (effect.value !== undefined && effect.target_attribute === "hp") {
                    const heal = effect.value; // 可以基于施法者属性计算
                    const currentHp = target.stats.hp?.current ?? 0;
                    const maxHp = target.stats.hp?.max ?? 0;
                    target.stats.hp.current = Math.min(maxHp, currentHp + heal);

                    const effectCopy = { ...effect, remaining_duration: effect.duration || 0 };
                    target.statusEffects.push(effectCopy);
                    return true;
                }
                break;

            case SkillEffectType.BUFF:
            case SkillEffectType.DEBUFF:
                // Buff/Debuff 效果
                if (effect.modifiers) {
                    const effectCopy = { ...effect, remaining_duration: effect.duration || 0 };
                    target.statusEffects.push(effectCopy);
                    // 实际属性修改在每回合更新时处理
                    return true;
                }
                break;

            case SkillEffectType.SHIELD:
                // 护盾效果
                if (effect.value !== undefined) {
                    const shieldValue = effect.value;
                    if (!target.stats.shield) {
                        target.stats.shield = { current: 0, max: 0 };
                    }
                    target.stats.shield.current += shieldValue;
                    target.stats.shield.max = Math.max(target.stats.shield.max, target.stats.shield.current);

                    const effectCopy = { ...effect, remaining_duration: effect.duration || 0 };
                    target.statusEffects.push(effectCopy);
                    return true;
                }
                break;

            case SkillEffectType.STUN:
                // 眩晕效果
                if (effect.duration !== undefined && effect.duration > 0) {
                    target.status = "stunned";
                    const effectCopy = { ...effect, remaining_duration: effect.duration };
                    target.statusEffects.push(effectCopy);
                    return true;
                }
                break;

            case SkillEffectType.DOT:
            case SkillEffectType.HOT:
                // 持续伤害/治疗效果
                if (effect.value !== undefined && effect.duration !== undefined) {
                    const effectCopy = { ...effect, remaining_duration: effect.duration };
                    target.statusEffects.push(effectCopy);
                    return true;
                }
                break;

            case SkillEffectType.MP_RESTORE:
                // 法力恢复
                if (effect.value !== undefined && target.stats.mp) {
                    const currentMp = target.stats.mp.current ?? 0;
                    const maxMp = target.stats.mp.max ?? 0;
                    target.stats.mp.current = Math.min(maxMp, currentMp + effect.value);
                    return true;
                }
                break;

            case SkillEffectType.MP_DRAIN:
                // 法力吸取
                if (effect.value !== undefined && target.stats.mp) {
                    const currentMp = target.stats.mp.current ?? 0;
                    target.stats.mp.current = Math.max(0, currentMp - effect.value);
                    return true;
                }
                break;
        }

        return false;
    }

    /**
     * 计算伤害值（考虑攻击力、防御力等）
     * @param baseValue 基础伤害值
     * @param caster 施法者
     * @param target 目标
     * @param effect 效果配置
     * @returns 实际伤害值
     */
    private static calculateDamage(
        baseValue: number,
        caster: GameMonster,
        target: GameMonster,
        effect: SkillEffect
    ): number {
        // 基础伤害计算
        let damage = baseValue;

        // 根据伤害类型应用攻击力
        if (effect.damage_type === "physical") {
            // 物理伤害：基于攻击力
            damage = baseValue + (caster.stats?.attack ?? 0) * 0.5;
            // 减去目标防御
            const defense = target.stats?.defense ?? 0;
            damage = Math.max(1, damage - defense * 0.3);
        } else if (effect.damage_type === "magical") {
            // 魔法伤害：基于智力（如果有）或攻击力
            const intelligence = caster.stats?.intelligence ?? caster.stats?.attack ?? 0;
            damage = baseValue + intelligence * 0.5;
            // 魔法防御（如果有）或普通防御
            const magicDefense = target.stats?.status_resistance ?? target.stats?.defense ?? 0;
            damage = Math.max(1, damage - magicDefense * 0.2);
        }

        return Math.floor(damage);
    }

    /**
     * 获取怪物已解锁的技能列表
     * @param monster 怪物实例
     * @param allSkillIds 所有可用的技能ID列表（从 Monster.skillIds 获取）
     * @param completedQuests 已完成的任务ID列表（可选）
     * @returns 已解锁的技能配置列表
     */
    static getUnlockedSkills(
        monster: GameMonster,
        allSkillIds: string[],
        completedQuests?: string[]
    ): MonsterSkill[] {
        const unlockedSkills: MonsterSkill[] = [];
        const unlockedSkillIds = monster.unlockSkills || [];

        for (const skillId of allSkillIds) {
            // 如果已经在解锁列表中，直接添加
            if (unlockedSkillIds.includes(skillId)) {
                const skill = getSkillConfig(skillId);
                if (skill) {
                    unlockedSkills.push(skill);
                }
                continue;
            }

            // 检查是否满足解锁条件
            const unlockResult = this.checkSkillUnlock(skillId, monster, completedQuests);
            if (unlockResult.unlocked) {
                const skill = getSkillConfig(skillId);
                if (skill) {
                    unlockedSkills.push(skill);
                }
            }
        }

        return unlockedSkills;
    }

    /**
     * 检查被动技能是否应该触发
     * @param skillId 技能ID
     * @param monster 怪物实例
     * @param triggerType 触发类型（如 "on_attack", "on_hit", "round_start" 等）
     * @param context 上下文信息（可选）
     * @returns 是否应该触发
     */
    static shouldTriggerPassiveSkill(
        skillId: string,
        monster: GameMonster,
        triggerType: string,
        context?: Record<string, any>
    ): boolean {
        const skill = getSkillConfig(skillId);
        if (!skill || skill.type !== "passive") {
            return false;
        }

        // 检查技能是否已解锁
        const unlockedSkills = monster.unlockSkills || [];
        if (!unlockedSkills.includes(skillId)) {
            const unlockResult = this.checkSkillUnlock(skillId, monster, context?.completedQuests);
            if (!unlockResult.unlocked) {
                return false;
            }
        }

        // 检查触发条件
        if (!skill.triggerConditions || skill.triggerConditions.length === 0) {
            return false;
        }

        // 查找匹配的触发条件
        for (const triggerCondition of skill.triggerConditions) {
            if (triggerCondition.trigger_type === triggerType) {
                // TODO: 如果需要，可以使用 json-rules-engine 检查 conditions
                // 目前简化处理，如果 trigger_type 匹配就返回 true
                return true;
            }
        }

        return false;
    }

    /**
     * 获取被动技能的触发效果
     * @param skillId 技能ID
     * @param triggerType 触发类型
     * @returns 效果列表
     */
    static getPassiveSkillEffects(
        skillId: string,
        triggerType: string
    ): SkillEffect[] {
        const skill = getSkillConfig(skillId);
        if (!skill || skill.type !== "passive") {
            return [];
        }

        if (!skill.triggerConditions || skill.triggerConditions.length === 0) {
            return [];
        }

        for (const triggerCondition of skill.triggerConditions) {
            if (triggerCondition.trigger_type === triggerType) {
                return triggerCondition.effects || [];
            }
        }

        return [];
    }

    /**
     * 获取技能的所有效果
     * @param skillId 技能ID
     * @returns 效果列表
     */
    static getSkillEffects(skillId: string): SkillEffect[] {
        const skill = getSkillConfig(skillId);
        if (!skill) {
            return [];
        }

        return skill.effects || [];
    }

    /**
     * 检查技能是否在冷却中
     * @param skillId 技能ID
     * @param monster 怪物实例
     * @returns 是否在冷却中
     */
    static isSkillOnCooldown(skillId: string, monster: GameMonster): boolean {
        const cooldowns = monster.skillCooldowns || {};
        const cooldown = cooldowns[skillId];
        return cooldown !== undefined && cooldown > 0;
    }

    /**
     * 获取技能剩余冷却时间
     * @param skillId 技能ID
     * @param monster 怪物实例
     * @returns 剩余冷却时间（回合数），0 表示不在冷却中
     */
    static getSkillCooldown(skillId: string, monster: GameMonster): number {
        const cooldowns = monster.skillCooldowns || {};
        return cooldowns[skillId] ?? 0;
    }

    /**
     * 清除技能冷却时间
     * @param skillId 技能ID
     * @param monster 怪物实例（会被修改）
     */
    static clearSkillCooldown(skillId: string, monster: GameMonster): void {
        if (!monster.skillCooldowns) {
            return;
        }
        delete monster.skillCooldowns[skillId];
    }

    /**
     * 清除所有技能冷却时间
     * @param monster 怪物实例（会被修改）
     */
    static clearAllCooldowns(monster: GameMonster): void {
        monster.skillCooldowns = {};
    }

    /**
     * 获取可用技能列表（已解锁、不在冷却、资源足够）
     * @param monster 怪物实例
     * @param allSkillIds 所有可用的技能ID列表
     * @param context 上下文信息（可选）
     * @returns 可用技能配置列表
     */
    static getAvailableSkills(
        monster: GameMonster,
        allSkillIds: string[],
        context?: Record<string, any>
    ): MonsterSkill[] {
        const availableSkills: MonsterSkill[] = [];

        for (const skillId of allSkillIds) {
            const skill = getSkillConfig(skillId);
            if (!skill) {
                continue;
            }

            // 只返回主动技能
            if (skill.type !== "active" && skill.type !== "master") {
                continue;
            }

            // 检查可用性
            const availability = this.checkSkillAvailability(skillId, monster, context);
            if (availability.available) {
                availableSkills.push(skill);
            }
        }

        // 按优先级排序（优先级高的在前）
        return availableSkills.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
}

