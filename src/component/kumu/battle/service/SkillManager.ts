import { Engine } from 'json-rules-engine';
// import { getTargetsInRange } from '../../utils/SkillRangeUtils';
import { Effect, EffectType, Skill } from '../types/CharacterTypes';
import { GameCharacter, GameModel } from '../types/CombatTypes';
import { applyEffect, calculateEffectValue, removeEffect, updateEffects } from '../utils/effectUtils';
import { calculateHexDistance } from '../utils/hexUtil';
// 支持：
// 单体/群体技能
// 物理/魔法伤害
// 持续伤害(DOT)
// 距离衰减
// 暴击系统
// 护盾机制
// BUFF/DEBUFF系统
// 状态效果（眩晕等）
// MP/HP/护盾管理
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

        if (this.isSkillOnCooldown(skillId) || !this.hasSufficientResources(skill)) {
            return;
        }

        this.applyResourceCost(skill);
        this.executeSkill(skill, target);
        
        // 设置冷却时间
        this.character.skillCooldowns = this.character.skillCooldowns || {};
        this.character.skillCooldowns[skill.id] = skill.cooldown;

        // 处理反击
        if (skill.canTriggerCounter && target) {
            await this.checkCounterAttack(target, this.character, 'onSkillAttacked');
        }
    }

    // 执行技能效果
    private executeSkill(skill: Skill, target?: GameCharacter) {
        console.log(`${this.character.name} 执行技能: ${skill.name}`);
        
        for (const effect of skill.effects) {
            if (effect.area_type && effect.area_type !== 'single') {
                // 处理群体效果
                const targets = this.getTargetsInRange(effect, target || this.character);
                targets.forEach(t => {
                    const finalEffect = this.calculateEffectValue(effect, t);
                    applyEffect(t, finalEffect);
                });
            } else {
                // 处理单体效果
                const recipient = this.determineEffectTarget(effect, target);
                if (recipient) {
                    const finalEffect = this.calculateEffectValue(effect, recipient);
                    applyEffect(recipient, finalEffect);
                }
            }
        }
    }

    // 计算效果值（考虑距离衰减等）
    private calculateEffectValue(effect: Effect, target: GameCharacter): Effect {
        const distance = calculateHexDistance(
            { q: this.character.q ?? 0, r: this.character.r ?? 0 },
            { q: target.q ?? 0, r: target.r ?? 0 }
        );
        return calculateEffectValue(this.character, target, effect, distance);
    }

    // 确定效果目标
    private determineEffectTarget(effect: Effect, target?: GameCharacter): GameCharacter | undefined {
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
                // 负面效果需要指定目标
                if (!target) {
                    console.warn(`需要目标的效果 ${effect.name} 没有指定目标`);
                    return undefined;
                }
                return target;

            default:
                console.warn(`未知的效果类型: ${effect.type}`);
                return undefined;
        }
    }

    // 检查资源是否足够
    private hasSufficientResources(skill: Skill): boolean {
        const { mp = 0, hp = 0, stamina = 0 } = skill.resource_cost;
        const stats = this.character.stats || {};
        return (
            (stats.mp?.current ?? 0) >= mp &&
            (stats.hp?.current ?? 0) >= hp &&
            (stats.stamina ?? 0) >= stamina
        );
    }

    // 扣除资源消耗
    private applyResourceCost(skill: Skill): void {
        const { mp = 0, hp = 0, stamina = 0 } = skill.resource_cost;
        const stats = this.character.stats || {};
        if (stats.mp?.current !== undefined) stats.mp.current -= mp;
        if (stats.hp?.current !== undefined) stats.hp.current -= hp;
        if (stats.stamina !== undefined) stats.stamina -= stamina;
    }

    // 检查技能是否在冷却中
    private isSkillOnCooldown(skillId: string): boolean {
        return (this.character.skillCooldowns?.[skillId] ?? 0) > 0;
    }

    // 更新冷却时间
    updateCooldowns(): void {
        // 更新技能冷却
        if (this.character.skillCooldowns) {
            Object.keys(this.character.skillCooldowns).forEach(skillId => {
                if (this.character.skillCooldowns![skillId] > 0) {
                    this.character.skillCooldowns![skillId] -= 1;
                }
            });
        }

        // 更新效果
        if (this.character.activeEffects) {
            updateEffects(this.character);
        }
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
    private async checkCounterAttack(target: GameCharacter, attacker: GameCharacter, triggerType: string): Promise<void> {
        if (!target?.stats?.hp?.current) return;
        
        console.log(`${target.name} 检查反击触发条件...`);
        const targetSkillManager = new SkillManager(target, this.game);
        await targetSkillManager.checkTriggerConditions(triggerType, attacker);
    }
    private countNearbyEnemies(): number {
        let count = 0;
        
        for(const char of this.game.characters){
            if(char.uid === this.character.uid)continue;
            const from = {q:this.character.q??0,r:this.character.r??0}
            const to = {q:char.q??0,r:char.r??0}
            const distance = calculateHexDistance(from, to);
            console.log("countNearbyEnemies",this.character.name,char.name,distance)
            if(distance === 1){
                count++;
            }
        }
        return count;
    }

    // 添加清除效果的方法
    removeCharacterEffect(effectId: string): void {
        const effect = this.character.activeEffects?.find(e => e.id === effectId);
        if (effect) {
            removeEffect(this.character, effect);
        }
    }

    // 清除所有效果
    clearAllEffects(): void {
        this.character.activeEffects?.forEach(effect => {
            removeEffect(this.character, effect);
        });
        this.character.activeEffects = [];
    }

    private getTargetsInRange(effect: Effect, center: GameCharacter): GameCharacter[] {
        if (!effect.area_type || effect.area_type === 'single') {
            return [];
        }

        const targets: GameCharacter[] = [];
        const centerPos = { q: center.q ?? 0, r: center.r ?? 0 };
        const range = effect.area_size ?? 1;

        this.game.characters.forEach(char => {
            if (char.uid === this.character.uid) return; // 跳过自己

            const targetPos = { q: char.q ?? 0, r: char.r ?? 0 };
            const distance = calculateHexDistance(centerPos, targetPos);

            switch (effect.area_type) {
                case 'circle':
                    if (distance <= range) {
                        targets.push(char);
                    }
                    break;
                case 'line':
                    // 判断目标是否在直线范围内
                    // 这里需要根据你的具体需求实现直线判定逻辑
                    break;
            }
        });

        return targets;
    }

}
