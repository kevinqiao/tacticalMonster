import { Engine } from 'json-rules-engine';
import { SkillEffect as Effect } from '../types/CharacterTypes';
import { CharacterUnit } from '../types/CombatTypes';

// 数据模型定义

interface Skill {
    skill_id: string;
    name: string;
    type: 'active' | 'passive';
    trigger_conditions?: Array<{
        trigger_type: string;
        conditions: any;
    }>;
    effects: Effect[];
    resource_cost: { mp?: number; hp?: number; stamina?: number };
    cooldown: number;
}

interface SkillEvent {
    type: string;
    params: {
        skillId: string;
    };
}

export abstract class SkillManager {
    protected character!: CharacterUnit;
    protected skills: Skill[];
    protected engine: Engine;

    constructor(character: CharacterUnit) {
        this.character = character;
        this.character.stats = this.character.stats || {};
        this.character.skillCooldowns = this.character.skillCooldowns || {};
        this.character.activeEffects = this.character.activeEffects || [];
        this.skills = [];
        this.engine = new Engine();
    }

    // 加载技能数据
    async loadSkills(skillFilePath: string): Promise<void> {
        try {
            const response = await fetch(skillFilePath);
            const skillsData: Skill[] = await response.json();
            this.skills = skillsData;
            this.initializeRules();
        } catch (error) {
            console.error(`Failed to load skills from ${skillFilePath}:`, error);
        }
    }

    // 初始化规则引擎
    private initializeRules(): void {
        this.skills.forEach(skill => {
            if (skill.trigger_conditions) {
                skill.trigger_conditions.forEach(condition => {
                    this.engine.addRule({
                        conditions: condition.conditions,
                        event: {
                            type: 'triggerSkill',
                            params: { skillId: skill.skill_id }
                        }
                    });
                });
            }
        });
    }

    // 检查并触发被动技能
    async checkPassiveSkills(eventType: string, target?: CharacterUnit): Promise<void> {
        const passiveSkills = this.skills.filter(skill => skill.type === 'passive');
        if(this.character.stats?.hp?.current === undefined||this.character.stats?.hp?.max === undefined) return;

        const facts = {
            characterHP: this.character.stats?.hp?.current / this.character.stats?.hp?.max,
            targetHP: target?.stats?.hp?.current  ? target.stats?.hp?.current / target.stats?.hp?.max : null,
            eventType,
            probability: Math.random(),
            ...this.character.stats,
        };

        const { events } = await this.engine.run(facts);

        for (const event of events as SkillEvent[]) {
            if (event.type === 'triggerSkill') {
                const skill = passiveSkills.find(s => s.skill_id === event.params.skillId);
                if (skill) {
                    this.executeSkill(skill.skill_id, target);
                }
            }
        }
    }

    // 主动使用技能
    useSkill(skillId: string, target?: CharacterUnit): void {
        const skill = this.skills.find(s => s.skill_id === skillId);

        if (!skill) {
            console.error(`Skill with ID ${skillId} not found.`);
            return;
        }

        if (this.isSkillOnCooldown(skillId)) {
            console.log(`Skill ${skill.name} is on cooldown.`);
            return;
        }

        if (!this.hasSufficientResources(skill)) {
            console.log(`${this.character.name} does not have enough resources to use ${skill.name}.`);
            return;
        }

        this.applyResourceCost(skill);

        skill.effects.forEach(effect => {
            this.applyEffect(effect, target);
        });

        this.character.skillCooldowns[skill.skill_id] = skill.cooldown;

        console.log(`${this.character.name} used skill: ${skill.name}`);
    }

    // 执行技能效果
    executeSkill(skillId: string, target?: CharacterUnit): void {
        const skill = this.skills.find(s => s.skill_id === skillId);

        if (skill) {
            skill.effects.forEach(effect => {
                this.applyEffect(effect, target);
            });

            console.log(`${this.character.name} executed skill: ${skill.name}`);
        }
    }

    // 应用技能效果
    private applyEffect(effect: Effect, target?: CharacterUnit): void {
        const recipient = target || this.character;
        recipient.activeEffects = recipient.activeEffects || [];
        const effectValue = Number(effect.value);
        
        switch (effect.effect_type) {
            case 'damage':
                const damage = Math.max(0, effectValue + this.calculateAttackPower() - this.calculateDefense(recipient));
                if (recipient.stats?.hp) {
                    recipient.stats.hp.current -= damage;
                }
                break;
            case 'heal':
                if (recipient.stats?.hp) {
                    recipient.stats.hp.current = Math.min(
                        recipient.stats.hp.current + effectValue, 
                        recipient.stats.hp.max
                    );
                }
                break;
            case 'buff':
            case 'debuff':
                recipient.activeEffects.push({ ...effect });
                console.log(`${recipient.name} is affected by ${effect.effect_type} for ${effect.remaining_duration || 0} turns.`);
                break;
            default:
                console.warn(`Unknown effect type: ${effect.effect_type}`);
                break;
        }
    }

    // 检查资源是否足够
    private hasSufficientResources(skill: Skill): boolean {
        const { mp = 0, hp = 0, stamina = 0 } = skill.resource_cost;
        const stats = this.character.stats || {};
        return (
            (stats.mp ?? 0) >= mp &&
            (stats.hp?.current ?? 0) >= hp &&
            (stats.stamina ?? 0) >= stamina
        );
    }

    // 扣除资源消耗
    private applyResourceCost(skill: Skill): void {
        const { mp = 0, hp = 0, stamina = 0 } = skill.resource_cost;
        const stats = this.character.stats || {};
        if (stats.mp !== undefined) stats.mp -= mp;
        if (stats.hp?.current !== undefined) stats.hp.current -= hp;
        if (stats.stamina !== undefined) stats.stamina -= stamina;
    }

    // 检查技能是否在冷却中
    private isSkillOnCooldown(skillId: string): boolean {
        const cooldown = this.character.skillCooldowns[skillId];
        return cooldown !== undefined && cooldown > 0;
    }

    // 更新冷却时间
    updateCooldowns(): void {
        Object.keys(this.character.skillCooldowns).forEach(skillId => {
            if (this.character.skillCooldowns[skillId] > 0) {
                this.character.skillCooldowns[skillId] -= 1;
            }
        });

        if (this.character.activeEffects) {
            this.character.activeEffects = this.character.activeEffects.filter(effect => {
                if (effect.remaining_duration !== undefined) {
                    effect.remaining_duration -= 1;
                    return effect.remaining_duration > 0;
                }
                return true;
            });
        }
    }

    // 计算攻击力
    private calculateAttackPower(): number {
        return this.character.stats?.attack ?? 0;
    }

    // 计算防御力
    private calculateDefense(target: CharacterUnit | undefined): number {
        return target?.stats?.defense ?? 0;
    }
}
