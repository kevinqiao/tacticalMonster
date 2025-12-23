/**
 * Tactical Monster 技能管理器
 * 负责技能的使用、执行、可用性检查和被动技能触发
 */

import { Engine } from 'json-rules-engine';
import { Effect, EffectType, Skill } from '../types/CharacterTypes';
import { GameModel, MonsterSprite } from '../types/CombatTypes';
import { applyEffect, calculateEffectValue } from '../utils/effectUtils';
import { calculateHexDistance } from '../utils/hexUtil';
import { SeededRandom } from '../utils/seededRandom';

export class SkillManager {
    private character: MonsterSprite;
    private triggerEngine: Engine;  // 被动技能触发引擎
    private availabilityEngine: Engine;  // 技能可用性检查引擎
    private game: GameModel;

    constructor(character: MonsterSprite, game: GameModel) {
        this.character = character;
        this.game = game;
        this.character.stats = this.character.stats || {};
        this.character.skillCooldowns = this.character.skillCooldowns || {};
        this.character.statusEffects = this.character.statusEffects || [];
        this.triggerEngine = new Engine();
        this.availabilityEngine = new Engine();
        this.initializeRules();
    }

    /**
     * 初始化规则引擎
     */
    private initializeRules(): void {
        // 初始化被动技能触发规则
        this.character.skills?.forEach(skill => {
            if (skill.type === 'passive' && skill.triggerConditions) {
                skill.triggerConditions.forEach(condition => {
                    this.triggerEngine.addRule({
                        conditions: condition.conditions,
                        event: {
                            type: 'triggerSkill',
                            params: {
                                skillId: skill.id,
                                triggerType: condition.trigger_type
                            }
                        }
                    });
                });
            }
        });

        // 初始化主动技能可用性规则
        this.character.skills?.forEach(skill => {
            if (skill.type === 'active' && skill.availabilityConditions) {
                this.availabilityEngine.addRule({
                    conditions: skill.availabilityConditions,
                    event: {
                        type: 'skillAvailable',
                        params: {
                            skillId: skill.id,
                        }
                    },
                    priority: skill.priority || 0
                });
            }
        });
    }

    /**
     * 检查技能是否在冷却中
     */
    isSkillOnCooldown(skillId: string): boolean {
        const cooldown = this.character.skillCooldowns?.[skillId];
        return cooldown !== undefined && cooldown > 0;
    }

    /**
     * 检查是否有足够的资源使用技能
     */
    hasSufficientResources(skill: Skill): boolean {
        if (!skill.resource_cost) return true;

        const stats = this.character.stats;
        if (skill.resource_cost.mp && (stats?.mp?.current ?? 0) < skill.resource_cost.mp) {
            return false;
        }
        if (skill.resource_cost.hp && (stats?.hp?.current ?? 0) < skill.resource_cost.hp) {
            return false;
        }
        if (skill.resource_cost.stamina && (stats?.stamina ?? 0) < skill.resource_cost.stamina) {
            return false;
        }
        return true;
    }

    /**
     * 应用资源消耗
     */
    private applyResourceCost(skill: Skill): void {
        if (!skill.resource_cost || !this.character.stats) return;

        if (skill.resource_cost.mp && this.character.stats.mp) {
            this.character.stats.mp.current = Math.max(0, this.character.stats.mp.current - skill.resource_cost.mp);
        }
        if (skill.resource_cost.hp && this.character.stats.hp) {
            this.character.stats.hp.current = Math.max(0, this.character.stats.hp.current - skill.resource_cost.hp);
        }
        if (skill.resource_cost.stamina !== undefined && this.character.stats.stamina !== undefined) {
            this.character.stats.stamina = Math.max(0, this.character.stats.stamina - skill.resource_cost.stamina);
        }
    }

    /**
     * 检查技能可用性（使用规则引擎）
     */
    async checkSkillAvailability(skillId: string, target?: MonsterSprite): Promise<boolean> {
        const skill = this.character.skills?.find(s => s.id === skillId);
        if (!skill) return false;

        // 基础检查
        if (this.isSkillOnCooldown(skillId)) return false;
        if (!this.hasSufficientResources(skill)) return false;

        // 如果有可用性条件，使用规则引擎检查
        if (skill.availabilityConditions) {
            const facts = this.buildFactsForAvailability(target);
            const { events } = await this.availabilityEngine.run(facts);
            return events.some(e => e.params?.skillId === skillId);
        }

        return true;
    }

    /**
     * 构建可用性检查的事实对象
     */
    private buildFactsForAvailability(target?: MonsterSprite): any {
        const facts: any = {
            characterHP: this.character.stats?.hp ?
                this.character.stats.hp.current / this.character.stats.hp.max : 1,
            characterMP: this.character.stats?.mp?.current ?? 0,
            characterStamina: this.character.stats?.stamina ?? 0,
            probability: Math.random(),
        };

        if (target) {
            const distance = calculateHexDistance(
                { q: this.character.q ?? 0, r: this.character.r ?? 0 },
                { q: target.q ?? 0, r: target.r ?? 0 }
            );
            facts.targetDistance = distance;
            facts.isTargetAdjacent = distance === 1;
            facts.targetHP = target.stats?.hp ?
                target.stats.hp.current / target.stats.hp.max : 1;
        }

        // PVE模式：计算附近Boss角色数量（Boss本体 + 小怪，uid="boss"）
        const nearbyEnemies = this.game.characters.filter(c =>
            c.uid !== this.character.uid &&
            calculateHexDistance(
                { q: this.character.q ?? 0, r: this.character.r ?? 0 },
                { q: c.q ?? 0, r: c.r ?? 0 }
            ) <= 2
        ).length;
        facts.nearbyEnemies = nearbyEnemies;

        return facts;
    }

    /**
     * 主动使用技能
     * @param rng 可选的确定性随机数生成器，用于乐观更新
     */
    async useSkill(skillId: string, target?: MonsterSprite, rng?: SeededRandom): Promise<void> {
        const skill = this.character.skills?.find(s => s.id === skillId);
        if (!skill) {
            console.error(`Skill with ID ${skillId} not found.`);
            return;
        }

        // 检查冷却和资源
        if (this.isSkillOnCooldown(skillId) || !this.hasSufficientResources(skill)) {
            return;
        }

        // 消耗资源
        this.applyResourceCost(skill);

        // 执行技能效果（传入 RNG）
        this.executeSkill(skill, target, rng);

        // 设置冷却时间
        this.character.skillCooldowns = this.character.skillCooldowns || {};
        this.character.skillCooldowns[skill.id] = skill.cooldown;

        // 处理反击
        if (skill.canTriggerCounter && target) {
            await this.checkCounterAttack(target, this.character, 'onSkillAttacked');
        }
    }

    /**
     * 执行技能效果（内部方法）
     * @param rng 可选的确定性随机数生成器，用于乐观更新
     */
    executeSkill(skill: Skill, target?: MonsterSprite, rng?: SeededRandom): void {
        console.log(`${this.character.name} 执行技能: ${skill.name}`);

        for (const effect of skill.effects) {
            if (effect.area_type && effect.area_type !== 'single') {
                // 处理群体效果
                const targets = this.getTargetsInRange(effect, target || this.character);
                targets.forEach(t => {
                    const distance = calculateHexDistance(
                        { q: this.character.q ?? 0, r: this.character.r ?? 0 },
                        { q: t.q ?? 0, r: t.r ?? 0 }
                    );
                    const finalEffect = calculateEffectValue(this.character, t, effect, distance, rng);
                    applyEffect(t, finalEffect);
                });
            } else {
                // 处理单体效果
                const recipient = this.determineEffectTarget(effect, target);
                if (recipient) {
                    const distance = calculateHexDistance(
                        { q: this.character.q ?? 0, r: this.character.r ?? 0 },
                        { q: recipient.q ?? 0, r: recipient.r ?? 0 }
                    );
                    const finalEffect = calculateEffectValue(this.character, recipient, effect, distance, rng);
                    applyEffect(recipient, finalEffect);
                }
            }
        }
    }

    /**
     * 确定效果目标
     */
    private determineEffectTarget(effect: Effect, target?: MonsterSprite): MonsterSprite | undefined {
        // 如果是群体效果，返回undefined让外层处理
        if (effect.area_type && effect.area_type !== 'single') {
            return undefined;
        }

        // 根据效果类型确定目标
        switch (effect.type) {
            case EffectType.BUFF:
            case EffectType.HOT:
            case EffectType.MP_RESTORE:
            case EffectType.SHIELD:
                // 增益效果默认作用于自身
                return this.character;

            case EffectType.DEBUFF:
            case EffectType.DOT:
            case EffectType.MP_DRAIN:
            case EffectType.STUN:
                // 减益效果作用于目标
                return target;

            default:
                // 伤害效果作用于目标
                return target || this.character;
        }
    }

    /**
     * 获取范围内的目标（群体效果）
     */
    private getTargetsInRange(effect: Effect, center: MonsterSprite): MonsterSprite[] {
        const targets: MonsterSprite[] = [];
        const centerPos = { q: center.q ?? 0, r: center.r ?? 0 };
        const range = effect.area_size || effect.damage_falloff?.full_damage_range || 1;

        this.game.characters.forEach(char => {
            if (char.uid === this.character.uid && effect.type !== EffectType.BUFF) {
                return; // 跳过自己（除非是BUFF）
            }

            const distance = calculateHexDistance(
                centerPos,
                { q: char.q ?? 0, r: char.r ?? 0 }
            );

            if (effect.area_type === 'circle' && distance <= range) {
                targets.push(char);
            } else if (effect.area_type === 'line') {
                // 直线范围需要检查是否在同一直线上
                // 简化实现：距离在范围内即可
                if (distance <= range) {
                    targets.push(char);
                }
            }
        });

        return targets;
    }

    /**
     * 检查被动技能触发条件
     */
    async checkTriggerConditions(eventType: string, target?: MonsterSprite): Promise<void> {
        if (!this.character.stats?.hp) return;

        const facts = {
            eventType,
            characterHP: this.character.stats.hp.current / this.character.stats.hp.max,
            targetHP: target?.stats?.hp ? target.stats.hp.current / target.stats.hp.max : null,
            probability: Math.random(),
            hasDefensiveStance: this.character.statusEffects?.some(e => e.name === '防御提升') || false,
            ...this.character.stats
        };

        const { events } = await this.triggerEngine.run(facts);

        for (const event of events) {
            if (event.type === 'triggerSkill' &&
                event.params?.triggerType === eventType) {
                const skill = this.character.skills?.find(s => s.id === event.params?.skillId);
                if (skill) {
                    // 被动技能直接执行，不消耗资源
                    this.executeSkill(skill, target);
                }
            }
        }
    }

    /**
     * 检查反击
     */
    private async checkCounterAttack(target: MonsterSprite, attacker: MonsterSprite, eventType: string): Promise<void> {
        // 检查目标是否有反击被动技能
        const targetSkillManager = new SkillManager(target, this.game);
        await targetSkillManager.checkTriggerConditions(eventType, attacker);
    }

    /**
     * 更新冷却时间（每回合结束时调用）
     */
    updateCooldowns(): void {
        if (!this.character.skillCooldowns) return;

        Object.keys(this.character.skillCooldowns).forEach(skillId => {
            if (this.character.skillCooldowns![skillId] > 0) {
                this.character.skillCooldowns![skillId]--;
            }
        });
    }

    /**
     * 获取可用技能列表
     */
    async getAvailableSkills(target?: MonsterSprite): Promise<Skill[]> {
        const availableSkills: Skill[] = [];

        for (const skill of (this.character.skills || [])) {
            if (skill.type === 'active' || skill.type === 'master') {
                const isAvailable = await this.checkSkillAvailability(skill.id, target);
                if (isAvailable) {
                    availableSkills.push(skill);
                }
            }
        }

        return availableSkills;
    }

    /**
     * 升级技能（阶段3：技能升级系统）
     */
    upgradeSkill(skillId: string, targetLevel: number): boolean {
        const skill = this.character.skills?.find(s => s.id === skillId);
        if (!skill) return false;

        // 检查是否有升级路径
        // 注意：这里假设技能数据中有upgrade_path字段
        // 实际实现中需要从技能数据中读取升级信息
        const currentLevel = (skill as any).level || 1;
        if (targetLevel <= currentLevel) return false;

        // 应用升级效果
        // 这里需要根据实际的升级路径数据结构来实现
        // 示例：增加效果值、减少冷却时间等
        console.log(`升级技能 ${skill.name} 从 ${currentLevel} 到 ${targetLevel}`);

        return true;
    }

    /**
     * 获取技能当前等级
     */
    getSkillLevel(skillId: string): number {
        const skill = this.character.skills?.find(s => s.id === skillId);
        return (skill as any)?.level || 1;
    }
}

