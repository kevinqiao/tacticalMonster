/**
 * 技能管理器 (SkillManager)
 * 基于 skillConfigs.ts 中的类型定义实现
 * 负责技能的解锁检查、可用性验证、资源消耗、冷却管理等
 */

import { Engine } from "json-rules-engine";
import { getSkillConfig, skillExists } from "../../data/skillConfigs";
import { GameMonster } from "../../types/monsterTypes";
import { MonsterSkill, SkillEffect, SkillEffectType } from "../../types/skillTypes";
import { EffectHandlerRegistry } from "./effects/EffectHandlerRegistry";

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
    static async checkSkillAvailability(
        skillId: string,
        monster: GameMonster,
        context?: Record<string, any>
    ): Promise<SkillAvailabilityResult> {
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

        // 检查可用性条件（使用 json-rules-engine）
        if (skill.availabilityConditions) {
            const facts = this.buildAvailabilityFacts(monster, context);
            const engine = new Engine();
            engine.addRule({
                conditions: skill.availabilityConditions,
                event: { type: "skillAvailable", params: {} },
                priority: skill.priority ?? 0,
            });
            const { events } = await engine.run(facts);
            const passed = events.some((e) => e.type === "skillAvailable");
            if (!passed) {
                return {
                    available: false,
                    reason: "不满足技能可用条件",
                };
            }
        }

        return { available: true };
    }

    /**
     * 构建 availabilityConditions 所需的 facts
     */
    private static buildAvailabilityFacts(
        monster: GameMonster,
        context?: Record<string, any>
    ): Record<string, any> {
        const stats = monster.stats || {};
        const hp = stats.hp;
        const mp = stats.mp;
        const characterHP =
            hp && hp.max > 0 ? (hp.current ?? 0) / hp.max : 1;
        const characterMP =
            mp && mp.max > 0 ? (mp.current ?? 0) / mp.max : 1;

        return {
            characterHP,
            characterMP,
            roundNumber: context?.roundNumber ?? 0,
            targetDistance: context?.targetDistance ?? 0,
            hasValidTarget: context?.hasValidTarget ?? false,
            completedQuests: context?.completedQuests ?? [],
            ...stats,
        };
    }

    /**
     * 构建被动技能触发条件（triggerConditions.conditions）所需的 facts
     * 供 json-rules-engine 使用，支持概率、血量阈值、攻击者/技能身份、状态效果等
     */
    private static buildTriggerFacts(
        monster: GameMonster,
        context?: Record<string, any>
    ): Record<string, any> {
        const stats = monster.stats || {};
        const hp = stats.hp;
        const mp = stats.mp;
        const characterHP =
            hp && hp.max > 0 ? (hp.current ?? 0) / hp.max : 1;
        const characterMP =
            mp && mp.max > 0 ? (mp.current ?? 0) / mp.max : 1;
        const statusEffectIds = (monster.statusEffects || []).map((e) => e.id);

        const caster = context?.caster as GameMonster | undefined;
        const attackerId =
            (caster as any)?.character_id ?? (caster as any)?.bossId ?? (caster as any)?.minionId ?? caster?.monsterId;

        return {
            characterHP,
            characterMP,
            roundNumber: context?.roundNumber ?? 0,
            triggeringSkillId: context?.triggeringSkillId ?? "",
            attackerId: attackerId ?? "",
            attackerIsBoss: caster?.uid === "boss",
            triggerChance: context?.triggerChance ?? 1,
            passiveAlreadyTriggeredThisRound: context?.passiveAlreadyTriggeredThisRound ?? false,
            triggerType: context?.triggerType ?? "",
            statusEffectIds,
            ...stats,
        };
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

        // 检查 Energy（必杀技）
        if (resourceCost.energy) {
            const currentEnergy = stats.energy?.current ?? 0;
            if (currentEnergy < resourceCost.energy) {
                return {
                    available: false,
                    reason: `能量不足，需要 ${resourceCost.energy}，当前 ${currentEnergy}`,
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
    ): { mp?: number; hp?: number; stamina?: number; energy?: number } {
        const resourceCost = skill.resource_cost;
        const consumed: { mp?: number; hp?: number; stamina?: number; energy?: number } = {};

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

        // 消耗 Energy（必杀技）
        if (resourceCost.energy && monster.stats.energy) {
            const currentEnergy = monster.stats.energy.current ?? 0;
            const newEnergy = Math.max(0, currentEnergy - resourceCost.energy);
            monster.stats.energy.current = newEnergy;
            consumed.energy = resourceCost.energy;
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
    static async useSkill(
        skillId: string,
        monster: GameMonster,
        targets?: GameMonster[],
        context?: Record<string, any>
    ): Promise<SkillUseResult> {
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

        // 3. 检查可用性（资源、冷却、availabilityConditions）
        const availability = await this.checkSkillAvailability(skillId, monster, context);
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
            // 伤害、治疗、Debuff等效果通常需要目标；SUMMON 不需要目标
            if (effect.type === SkillEffectType.SUMMON) return false;
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
                // SUMMON 效果不在此处理，由 GameActionService 调用 SummonService
                if (effect.type === SkillEffectType.SUMMON) continue;

                // 判断是单体还是群体效果
                const isAreaEffect = effect.area_type && effect.area_type !== "single";

                const damageMultipliers = (context?.damageMultipliers as Record<string, number>) || {};
                if (isAreaEffect) {
                    // 群体效果：应用到所有有效目标；targetId 用实例 id 以支持同 monsterId 多目标（如召唤）
                    for (const target of validTargets) {
                        const targetId = (target as any).character_id ?? (target as any).minionId ?? target.monsterId;
                        const mult = damageMultipliers[targetId];
                        const applied = this.applyEffectToTarget(effect, target, monster, mult);
                        appliedEffects.push({
                            effect,
                            targetId,
                            applied,
                        });
                    }
                } else {
                    // 单体效果：应用到第一个有效目标
                    if (validTargets.length > 0) {
                        const target = validTargets[0];
                        const targetId = (target as any).character_id ?? (target as any).minionId ?? target.monsterId;
                        const mult = damageMultipliers[targetId];
                        const applied = this.applyEffectToTarget(effect, target, monster, mult);
                        appliedEffects.push({
                            effect,
                            targetId,
                            applied,
                        });
                    }
                }
            }
        } else if (!needsTarget) {
            // 不需要目标的技能（如给自己加BUFF、召唤），直接应用效果
            for (const effect of effects) {
                // SUMMON 效果不在此处理，由 GameActionService 调用 SummonService
                if (effect.type === SkillEffectType.SUMMON) continue;

                // 对于不需要目标的技能，可以应用到施法者自己
                const applied = this.applyEffectToTarget(effect, monster, monster);
                appliedEffects.push({
                    effect,
                    targetId: (monster as any).character_id ?? monster.monsterId,
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
     * 应用效果到目标（委托给 EffectHandlerRegistry 中的处理器）
     * @param effect 技能效果
     * @param target 目标怪物（会被修改）
     * @param caster 施法者怪物（用于计算效果值）
     * @param damageMultiplier 伤害倍率（Block 时 0.5，可选）
     * @returns 是否成功应用
     */
    static applyEffectToTarget(
        effect: SkillEffect,
        target: GameMonster,
        caster: GameMonster,
        damageMultiplier?: number
    ): boolean {
        if (!target.stats) {
            return false;
        }
        if (!target.statusEffects) {
            target.statusEffects = [];
        }

        let effectiveEffect = effect;
        if (effect.type === SkillEffectType.DAMAGE && damageMultiplier != null && effect.value != null) {
            effectiveEffect = { ...effect, value: Math.round(effect.value * damageMultiplier) };
        }

        const handler = EffectHandlerRegistry.getHandler(effect.type);
        if (!handler) return false;

        const result = handler.apply(effectiveEffect, target, caster);
        if (result.applied && result.statusEffect) {
            target.statusEffects.push(result.statusEffect);
        }
        return result.applied;
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
     * @param context 上下文信息（可选）：caster, triggeringSkillId, roundNumber, triggerChance, passiveAlreadyTriggeredThisRound 等
     * @returns 是否应该触发
     */
    static async shouldTriggerPassiveSkill(
        skillId: string,
        monster: GameMonster,
        triggerType: string,
        context?: Record<string, any>
    ): Promise<boolean> {
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

        const triggerContext = { ...context, triggerType };

        // 查找匹配的触发条件
        for (const triggerCondition of skill.triggerConditions) {
            if (triggerCondition.trigger_type === triggerType) {
                if (!triggerCondition.conditions) {
                    return true;
                }
                const facts = this.buildTriggerFacts(monster, triggerContext);
                const engine = new Engine();
                engine.addRule({
                    conditions: triggerCondition.conditions,
                    event: { type: "passiveTrigger", params: {} },
                    priority: 0,
                });
                const { events } = await engine.run(facts);
                if (events.some((e) => e.type === "passiveTrigger")) {
                    return true;
                }
                return false;
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
    static async getAvailableSkills(
        monster: GameMonster,
        allSkillIds: string[],
        context?: Record<string, any>
    ): Promise<MonsterSkill[]> {
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
            const availability = await this.checkSkillAvailability(skillId, monster, context);
            if (availability.available) {
                availableSkills.push(skill);
            }
        }

        // 按优先级排序（优先级高的在前）
        return availableSkills.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
}

