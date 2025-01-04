import { Engine } from 'json-rules-engine';
// import { getTargetsInRange } from '../../utils/SkillRangeUtils';
import { SkillEffect as Effect, Skill } from '../types/CharacterTypes';
import { GameCharacter, GameModel } from '../types/CombatTypes';

export class SkillManager {
    private character: GameCharacter;
    private triggerEngine: Engine;
    private availabilityEngine: Engine;
    private game: GameModel;
 

    constructor(character: GameCharacter,game:GameModel) {
        this.character = character;
        this.game = game;       
        this.character.stats = this.character.stats || {};
        this.character.skillCooldowns = this.character.skillCooldowns || {};
        this.character.activeEffects = this.character.activeEffects || [];
        this.triggerEngine = new Engine();
        this.availabilityEngine = new Engine();
         this.initializeRules();
    }



    private initializeRules(): void {
        // console.log("initializeRules",this.character.skills)    
        this.character.skills?.forEach(skill => {
            if (skill.triggerConditions) {
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
         this.character.skills?.forEach(skill => {
            if (skill.availabilityConditions) {
                this.availabilityEngine.addRule({
                    conditions: skill.availabilityConditions,
                    event: {
                        type: 'skillAvailable',
                        params: {
                            skillId: skill.id,
                        }
                    },
                    priority: skill.priority??0
                });
            }
        });
    }

    async checkTriggerConditions(eventType: string, target?: GameCharacter): Promise<void> {
        if (!this.character.stats?.hp) return;

        const facts = {
            eventType,
            characterHP: this.character.stats.hp.current / this.character.stats.hp.max,
            targetHP: target?.stats?.hp ? target.stats.hp.current / target.stats.hp.max : null,
            probability: Math.random(),
            ...this.character.stats
        };

        const { events } = await this.triggerEngine.run(facts);
        
        for (const event of events) {
            if (event.type === 'triggerSkill' && 
                event.params?.triggerType === eventType) {
                const skill = this.character.skills?.find(s => s.id === event.params?.skillId);
                if (skill) {
                     this.executeSkill(skill, target);
                }
            }
        }
    }

   


    // 主动使用技能
    async useSkill(skillId: string, target?: GameCharacter): Promise<void> {
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
    private  executeSkill(skill: Skill, target?: GameCharacter) {
        console.log(`${this.character.name} 执行技能: ${skill.name}`);
        
        for (const effect of skill.effects) {
            this.applyEffect(effect, target);
        }
    }

    // 应用技能效果
    private applyEffect(effect: Effect, target?: GameCharacter): void {
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

    private calculateNewPosition(character: GameCharacter, direction: number) {
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
    private calculateDefense(target: GameCharacter | undefined): number {
        return target?.stats?.defense ?? 0;
    }

    private async checkCounterAttack(target: GameCharacter, attacker: GameCharacter, triggerType: string): Promise<void> {
        if (!target?.stats?.hp?.current) return;
        
        console.log(`${target.name} 检查反击触发条件...`);
        const targetSkillManager = new SkillManager(target, this.game);
        await targetSkillManager.checkTriggerConditions(triggerType, attacker);
    }

    async attack(attacker: GameCharacter, target: GameCharacter | undefined): Promise<void> {
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

    async getAvailableSkills(): Promise<Skill[]| undefined> {
        // 获取所有主动技能
             // console.log("getAvailableSkills",this.character.skills) 
            const availableSkills:Skill[]= this.character.skills?.filter(skill => skill.type === 'active'&&!skill.availabilityConditions)??[];
            // console.log("available skills",availableSkills)  
            const nearbyEnemies = this.countNearbyEnemies();
            const facts = {
                targetDistance: 2,
                nearbyEnemies,            
            };
             console.log("nearbyEnemies",nearbyEnemies)
            const { events } = await this.availabilityEngine.run(facts);
            // console.log("events",events)    
            const skills:Skill[] = events.filter(event => event.type === 'skillAvailable').map(event => this.character.skills?.find(s => s.id === event.params?.skillId) as Skill);
            if(skills){
                availableSkills.push(...skills);
            }
            return availableSkills;

    }

    private countNearbyEnemies(): number {
        return this.game.characters.filter(char => 
            char.uid !== this.character.uid && 
            this.calculateDistance(this.character, char) === 1
        ).length;
    }



    private calculateDistance(char1: GameCharacter, char2: GameCharacter): number {
        const q1 = char1.q ?? 0;
        const r1 = char1.r ?? 0;
        const q2 = char2.q ?? 0;
        const r2 = char2.r ?? 0;
        const distance = Math.abs(q1 - q2) + Math.abs(r1 - r2);
        console.log("calculateDistance",char1.name,char2.name,distance)
        return distance;
    }

  
}
