import { Engine } from 'json-rules-engine';
// import { getTargetsInRange } from '../../utils/SkillRangeUtils';
import { SkillEffect as Effect, Skill, SkillRange } from '../types/CharacterTypes';
import { CharacterUnit, GameModel } from '../types/CombatTypes';

export class SkillManager {
    private character: CharacterUnit;
    // private skills: Skill[];
    private engine: Engine;
    private game: GameModel;
 

    constructor(character: CharacterUnit,game:GameModel) {
        this.character = character;
        this.game = game;       
        this.character.stats = this.character.stats || {};
        this.character.skillCooldowns = this.character.skillCooldowns || {};
        this.character.activeEffects = this.character.activeEffects || [];
        // this.skills = [];
        this.engine = new Engine();
         this.initializeRules();
    }



    private initializeRules(): void {
        this.character.skills?.forEach(skill => {
            if (skill.triggerConditions) {
                skill.triggerConditions.forEach(condition => {
                    this.engine.addRule({
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
    }

    async checkTriggerConditions(eventType: string, target?: CharacterUnit): Promise<void> {
        if (!this.character.stats?.hp) return;

        const facts = {
            eventType,
            characterHP: this.character.stats.hp.current / this.character.stats.hp.max,
            targetHP: target?.stats?.hp ? target.stats.hp.current / target.stats.hp.max : null,
            probability: Math.random(),
            ...this.character.stats
        };

        const { events } = await this.engine.run(facts);
        
        for (const event of events) {
            if (event.type === 'triggerSkill' && 
                event.params?.triggerType === eventType) {
                const skill = this.character.skills?.find(s => s.id === event.params?.skillId);
                if (skill) {
                    await this.executeSkill(skill, target);
                }
            }
        }
    }

   


    // 主动使用技能
    async useSkill(skillId: string, target?: CharacterUnit): Promise<void> {
        const skill = this.character.skills?.find(s => s.id === skillId);

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

        this.character.skillCooldowns = this.character.skillCooldowns || {};
        this.character.skillCooldowns[skill.id] = skill.cooldown;

        console.log(`${this.character.name} used skill: ${skill.name}`);

        // 根据技能配置决定是否可以触发反击
        if (skill.canTriggerCounter && target) {
            await this.checkCounterAttack(target, this.character, 'onSkillAttacked');
        }
    }

    // 执行技能效果
    private async executeSkill(skill: Skill, target?: CharacterUnit): Promise<void> {
        console.log(`${this.character.name} 执行技能: ${skill.name}`);
        
        for (const effect of skill.effects) {
            await this.applyEffect(effect, target);
        }
    }

    // 应用技能效果
    private applyEffect(effect: Effect, target?: CharacterUnit): void {
        const recipient = target || this.character;
        recipient.activeEffects = recipient.activeEffects || [];
        const effectValue = typeof effect.value === 'string' ? parseFloat(effect.value) : effect.value;
        
        switch (effect.effect_type) {
            case 'damage':
                // 计算伤害衰减
                let finalValue = effectValue;
                if (effect.damage_falloff && target) {
                    const distance = this.calculateDistance(this.character, target);
                    if (distance > effect.damage_falloff.full_damage_range) {
                        finalValue *= effect.damage_falloff.min_damage_percent;
                    }
                }

                const damage = Math.max(0, finalValue + this.calculateAttackPower() - this.calculateDefense(recipient));
                if (recipient.stats?.hp) {
                    recipient.stats.hp.current -= damage;
                    console.log(`${recipient.name} 受到 ${damage} 点伤害 (距离: ${this.calculateDistance(this.character, recipient)})`);
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
            case 'move':
                const direction = Math.sign(effectValue); // 1 前进，-1 后退
                const newPosition = this.calculateNewPosition(recipient, direction);
                if (this.isValidPosition(newPosition)) {
                    recipient.q = newPosition.q;
                    recipient.r = newPosition.r;
                    console.log(`${recipient.name} ${direction > 0 ? '前进' : '后退'}了一步`);
                }
                break;
            default:
                console.warn(`Unknown effect type: ${effect.effect_type}`);
                break;
        }
    }

    private calculateNewPosition(character: CharacterUnit, direction: number) {
        const facing = character.facing || 0;
        const angle = facing * Math.PI / 3;
        const currentQ = character.q ?? 0;
        const currentR = character.r ?? 0;
        return {
            q: currentQ + Math.round(Math.cos(angle)) * direction,
            r: currentR + Math.round(Math.sin(angle)) * direction
        };
    }

    private isValidPosition(position: {q: number, r: number}): boolean {
        // 检查是否在地图边界内
        if (position.r < 0 || position.r >= this.game.map.rows || 
            position.q < 0 || position.q >= this.game.map.cols) {
            return false;
        }
        
        // 检查是否是障碍物
        const isObstacle = this.game.map.obstacles?.some(
            obs => obs.q === position.q && obs.r === position.r
        );
        
        // 检查是否是禁用格子
        const isDisabled = this.game.map.disables?.some(
            cell => cell.q === position.q && cell.r === position.r
        );
        
        return !isObstacle && !isDisabled;
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
        return (this.character.skillCooldowns?.[skillId] ?? 0) > 0;
    }

    // 更新冷却时间
    updateCooldowns(): void {
        if (this.character.skillCooldowns) {
            Object.keys(this.character.skillCooldowns).forEach(skillId => {
                if (this.character.skillCooldowns![skillId] > 0) {
                    this.character.skillCooldowns![skillId] -= 1;
                }
            });
        }

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

    private async checkCounterAttack(target: CharacterUnit, attacker: CharacterUnit, triggerType: string): Promise<void> {
        if (!target?.stats?.hp?.current) return;
        
        console.log(`${target.name} 检查反击触发条件...`);
        const targetSkillManager = new SkillManager(target, this.game);
        await targetSkillManager.checkTriggerConditions(triggerType, attacker);
    }

    async attack(attacker: CharacterUnit, target: CharacterUnit | undefined): Promise<void> {
        if (!target?.stats?.hp?.current) return;
        
        console.log(`${attacker.name} 攻击了 ${target.name}`);
        await this.checkTriggerConditions('onAttack', target);

        const attackerAttack = attacker.stats?.attack ?? 0;
        const targetDefense = target.stats?.defense ?? 0;
        const damage = Math.max(0, attackerAttack - targetDefense);

        target.stats.hp.current -= damage;
        console.log(`${target.name} 受到了 ${damage} 点伤害，剩余生命值：${target.stats.hp.current}`);

        if (target.stats.hp.current <= 0) {
            console.log(`${target.name} 被击败了！`);
            return;
        }

        // 检查普通攻击的反击
        await this.checkCounterAttack(target, attacker, 'onAttacked');
    }

    async getAvailableSkills(target: CharacterUnit, game: GameModel): Promise<{skills: Skill[]} | null> {
        // 获取所有主动技能
        const activeSkills = this.character.skills?.filter(skill => skill.type === 'active');
        const availableSkills: Skill[] = [];
        if(!activeSkills)return null;
        console.log("activeSkills",activeSkills)
        for (const skill of activeSkills) {
            // 基础检查：冷却和资源
            if (this.isSkillOnCooldown(skill.id) || !this.hasSufficientResources(skill)) {
                continue;
            }

            // 准备规则引擎需要的事实数据
            const facts = {
                // 目标相关
                targetDistance: this.calculateDistance(this.character, target),
                targetHP: target.stats?.hp ? target.stats.hp.current / target.stats.hp.max : 1,
                
                // 施法者相关
                casterHP: this.character.stats?.hp ? 
                    this.character.stats.hp.current / this.character.stats.hp.max : 1,
                resourceMP: this.character.stats?.mp ?? 0,
                
                // 战场环境相关
                nearbyEnemies: this.countNearbyEnemies(game.characters),
                isTargetAdjacent: this.calculateDistance(this.character, target) === 1,
                
                // 技能范围检查
                inRange: skill.range ? this.isTargetInRange(target, skill.range) : true
            };

            try {
                // 创建临时规则引擎实例
                const availabilityEngine = new Engine();
                
                // 添加技能可用性规则
                if (skill.availabilityConditions) {
                    availabilityEngine.addRule({
                        conditions: skill.availabilityConditions,
                        event: { type: 'skillAvailable' }
                    });

                    // 运行规则检查
                    const { events } = await availabilityEngine.run(facts);
                    if (events.some(e => e.type === 'skillAvailable')) {
                        availableSkills.push(skill);
                    }
                } else {
                    // 如果没有特殊条件，只要通过了基础检查就是可用的
                    availableSkills.push(skill);
                }
            } catch (error) {
                console.error(`Error checking availability for skill ${skill.id}:`, error);
            }
        }

        return { skills: availableSkills };
    }

    private countNearbyEnemies(characters: CharacterUnit[]): number {
        return characters.filter(char => 
            char.uid !== this.character.uid && 
            this.calculateDistance(this.character, char) === 1
        ).length;
    }

    private isTargetInRange(target: CharacterUnit, range: SkillRange): boolean {
        const distance = this.calculateDistance(this.character, target);
        return (
            distance <= range.max_distance && 
            (range.min_distance === undefined || distance >= range.min_distance)
        );
    }

    private calculateDistance(char1: CharacterUnit, char2: CharacterUnit): number {
        const q1 = char1.q ?? 0;
        const r1 = char1.r ?? 0;
        const q2 = char2.q ?? 0;
        const r2 = char2.r ?? 0;
        return Math.abs(q1 - q2) + Math.abs(r1 - r2);
    }

  
}
