import { Engine } from 'json-rules-engine';
import { Character } from '../../characters/Character';
import { Effect, Skill } from '../../characters/CharacterAttributes';

export abstract class SkillManager {
    protected character!: Character;
    protected skills: Skill[];

    constructor(character: Character) {
        this.character = character;
        this.skills = [];
    }

    // 执行技能触发检查，处理触发事件
    abstract checkPassiveSkills(eventType: string, target?: Character): void;

    // 执行技能效果
    abstract executeSkill(skillId: string, target?: Character): void;
    abstract useSkill(skillId: string, target?: Character): void;

    // 更新技能冷却时间
    abstract updateCooldowns(): void;

    // 检查技能是否满足资源消耗条件
    protected hasSufficientResources(skill: Skill): boolean {
        const { mp = 0, hp = 0, stamina = 0 } = skill.resource_cost;
        const { stats } = this.character;
        return (
            stats.mp.current >= mp &&
            stats.hp.current >= hp &&
            stats.stamina.current >= stamina
        );
    }

    // 检查技能是否在冷却中
    protected isSkillOnCooldown(skillId: string): boolean {
        const cooldown = this.character.skillCooldowns[skillId];
        return cooldown !== undefined && cooldown > 0;
    }

    // 扣除技能的资源消耗
    protected applyResourceCost(skill: Skill) {
        const { mp = 0, hp = 0, stamina = 0 } = skill.resource_cost;
        this.character.stats.mp.current -= mp;
        this.character.stats.hp.current -= hp;
        this.character.stats.stamina.current -= stamina;
    }
}

export class DefaultSkillManager extends SkillManager {
    private engine: Engine;

    constructor(character: Character, skillFilePath: string) {
        super(character);
        this.engine = new Engine();
        this.initializeSkills(skillFilePath);
    }

    // 初始化技能，从指定 JSON 文件路径加载技能数据
    private async initializeSkills(skillFilePath: string) {
        await this.loadSkillsFromJSON(skillFilePath);
        this.loadSkillRules();
    }

    // 从 JSON 文件中加载技能数据
    private async loadSkillsFromJSON(filePath: string) {
        try {
            const response = await fetch(filePath);
            const skillsData: Skill[] = await response.json();
            this.skills = skillsData;
        } catch (error) {
            console.error(`Failed to load skills from ${filePath}:`, error);
        }
    }

    // 加载技能触发规则
    private loadSkillRules() {
        this.skills.forEach(skill => {
            skill.trigger_conditions?.forEach(trigger => {
                this.engine.addRule({
                    conditions: {
                        all: [
                            { fact: 'eventType', operator: 'equal', value: trigger.trigger_type },
                            { fact: 'probability', operator: 'greaterThanInclusive', value: Math.random() }
                        ]
                    },
                    event: {
                        type: 'triggerSkill',
                        params: { skillId: skill.skill_id }
                    }
                });
            });
        });
    }

    // 检查并执行被动技能的触发条件
    async checkPassiveSkills(eventType: string, target?: Character) {
        const facts = {
            eventType,
            probability: Math.random()
        };
        const { events } = await this.engine.run(facts);
        events.forEach(event => this.executeSkill(event.params?.skillId, target));
    }

    // 主动使用技能的方法
    useSkill(skillId: string, target?: Character) {
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

        // 扣除资源消耗
        this.applyResourceCost(skill);

        // 执行技能效果
        skill.effects.forEach((effect: Effect) => {
            this.applyEffect(effect, target);
        });

        // 设置技能冷却
        this.character.skillCooldowns[skill.skill_id] = skill.cooldown;

        console.log(`${this.character.name} used skill: ${skill.name}`);
    }

    // 执行技能效果
    executeSkill(skillId: string, target?: Character) {
        const skill = this.skills.find(s => s.skill_id === skillId);

        if (skill) {
            // 执行技能效果，无需检查资源和冷却（用于被动技能触发）
            skill.effects.forEach((effect: Effect) => {
                this.applyEffect(effect, target);
            });

            console.log(`${this.character.name} executed skill: ${skill.name}`);
        }
    }

    // 应用效果到目标角色
    private applyEffect(effect: Effect, target?: Character) {
        const recipient = target || this.character;
        switch (effect.effect_type) {
            case 'damage':
                // 考虑攻击力和防御力
                {
                    const damage = Math.max(0, effect.value + this.calculateAttackPower() - this.calculateDefense(recipient));
                    recipient.stats.hp.current -= damage;
                    console.log(`${recipient.name} took ${damage} damage.`);
                }
                break;
            case 'heal':
                {
                    const healAmount = effect.value + this.character.attributes.wisdom;
                    recipient.stats.hp.current = Math.min(
                        recipient.stats.hp.current + healAmount,
                        recipient.stats.hp.max
                    );
                    console.log(`${recipient.name} healed for ${healAmount} HP.`);
                }
                break;
            case 'buff':
            case 'debuff':
                recipient.activeEffects.push({ ...effect, remaining_duration: effect.remaining_duration });
                console.log(`${recipient.name} is affected by ${effect.name} for ${effect.remaining_duration} turns.`);
                break;
            default:
                console.warn(`Unknown effect type: ${effect.effect_type}`);
                break;
        }
    }

    // 计算攻击力
    private calculateAttackPower(): number {
        return this.character.attributes.strength + this.character.stats.attack;
    }

    // 计算防御力
    private calculateDefense(target: Character): number {
        return target.attributes.constitution + target.stats.defense;
    }

    // 更新技能冷却时间
    updateCooldowns() {
        Object.keys(this.character.skillCooldowns).forEach(skillId => {
            if (this.character.skillCooldowns[skillId] > 0) {
                this.character.skillCooldowns[skillId] -= 1;
            }
        });

        this.character.activeEffects = this.character.activeEffects.filter(effect => {
            effect.remaining_duration -= 1;
            return effect.remaining_duration > 0;
        });
    }
}
