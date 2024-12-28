import { SkillManager } from "../../SkillManager";
import { Attributes, Effect, Equipment } from "./CharacterAttributes";
interface ResourceStats {
    hp: { current: number; max: number };
    mp: { current: number; max: number };
    stamina: { current: number; max: number };
}

interface NumericStats {
    attack: number;
    defense: number;
    speed: number;
    crit_rate: number;
    evasion: number;
}

// 将 Stats 定义为组合类型
interface Stats extends ResourceStats, NumericStats { }


export abstract class Character {
    _id: string;
    name: string;
    level: number;
    attributes: Attributes;
    stats: Stats;
    activeEffects: Effect[] = [];
    skillCooldowns: { [skill_id: string]: number } = {};
    public skillManager!: SkillManager;
    equipment: {
        weapon?: Equipment;
        armor?: Equipment;
        accessories: Equipment[];
    };


    constructor(id: string, name: string, level: number, attributes: Attributes, equipment: { weapon?: Equipment; armor?: Equipment; accessories: Equipment[] }) {
        this._id = id;
        this.name = name;
        this.level = level;
        this.attributes = attributes;
        this.equipment = equipment;
        this.stats = this.initializeStats(); // 动态生成 stats
    }

    private applyEquipmentBonuses(): Partial<Stats> {
        const numericBonuses: Partial<NumericStats> = {};
        const resourceBonuses: Partial<ResourceStats> = {};

        const allEquipment = [
            this.equipment.weapon,
            this.equipment.armor,
            ...this.equipment.accessories
        ];

        allEquipment.forEach((equip) => {
            if (equip) {
                Object.keys(equip.bonusAttributes).forEach((attr) => {
                    const statKey = attr as keyof Stats;
                    const bonusValue = equip.bonusAttributes[statKey];

                    // 处理数值类型属性
                    if (typeof bonusValue === "number" && statKey in numericBonuses) {
                        numericBonuses[statKey as keyof NumericStats] = (numericBonuses[statKey as keyof NumericStats] || 0) + bonusValue;
                    }
                    // 处理对象类型属性 (ResourceStats)
                    else if (bonusValue && typeof bonusValue === "object" && "current" in bonusValue && "max" in bonusValue) {
                        if (!resourceBonuses[statKey as keyof ResourceStats]) {
                            resourceBonuses[statKey as keyof ResourceStats] = { current: 0, max: 0 };
                        }

                        const existingStat = resourceBonuses[statKey as keyof ResourceStats]!;
                        existingStat.current = Math.min(existingStat.current + bonusValue.current, existingStat.max + bonusValue.max);
                        existingStat.max += bonusValue.max;
                    }
                });
            }
        });

        // 合并数值类型和资源类型的加成结果
        return { ...numericBonuses, ...resourceBonuses } as Partial<Stats>;
    }

    private initializeStats(): Stats {
        return {
            hp: this.calculateHp(),
            mp: this.calculateMp(),
            stamina: this.calculateStamina(),
            attack: this.calculateAttack(),
            defense: this.calculateDefense(),
            speed: this.calculateSpeed(),
            crit_rate: this.calculateCritRate(),
            evasion: this.calculateEvasion(),
        };
    }

    // 单独计算 hp 的方法
    private calculateHp(): { current: number; max: number } {
        const { constitution } = this.attributes;
        const hpMax = constitution * 10 + this.level * 5;
        return { current: hpMax, max: hpMax };
    }

    // 单独计算 mp 的方法
    private calculateMp(): { current: number; max: number } {
        const { intelligence } = this.attributes;
        const mpMax = intelligence * 5 + this.level * 3;
        return { current: mpMax, max: mpMax };
    }

    // 单独计算 stamina 的方法
    private calculateStamina(): { current: number; max: number } {
        const { constitution, dexterity } = this.attributes;
        const staminaMax = constitution * 2 + dexterity * 3;
        return { current: staminaMax, max: staminaMax };
    }

    // 计算 attack，包含装备加成
    private calculateAttack(): number {
        const { strength } = this.attributes;
        return strength * 2 + (this.equipment.weapon?.bonusAttributes.attack || 0);
    }

    // 计算 defense，包含装备加成
    private calculateDefense(): number {
        const { constitution } = this.attributes;
        return constitution * 1.5 + (this.equipment.armor?.bonusAttributes.defense || 0);
    }

    // 计算 speed
    private calculateSpeed(): number {
        const { dexterity } = this.attributes;
        return dexterity + Math.floor(this.level / 2);
    }

    // 计算暴击率 crit rate
    private calculateCritRate(): number {
        const { dexterity } = this.attributes;
        return dexterity / 100 + 0.05;
    }

    // 计算闪避率 evasion
    private calculateEvasion(): number {
        const { dexterity } = this.attributes;
        return dexterity / 200 + 0.02;
    }


    // 更新角色的生命值
    updateHealth(newHp: number) {
        this.stats.hp.current = Math.max(0, Math.min(newHp, this.stats.hp.max));
        if (this.stats.hp.current === 0) {
            console.log(`${this.name} 已经倒下！`);
        }
    }

    // 更新体力和法力的方法（视游戏需求添加）

    // 应用效果
    applyEffect(effect: Effect) {
        // 获取目标属性
        const targetAttribute = this.stats[effect.target_attribute as keyof Stats];

        // 检查是否是 `current` 和 `max` 属性的对象（例如 `hp`, `mp`, `stamina`）
        if (targetAttribute && typeof targetAttribute === "object" && "current" in targetAttribute && "max" in targetAttribute) {
            // 使用断言，将目标属性视为带有 `current` 和 `max` 的对象类型
            const attribute = targetAttribute as { current: number; max: number };

            if (effect.effect_type === "damage") {
                this.updateHealth(attribute.current - effect.value);
                console.log(`${this.name} 受到了 ${effect.value} 点伤害，当前 ${effect.target_attribute} 为 ${attribute.current}`);
            } else if (effect.effect_type === "heal") {
                this.updateHealth(attribute.current + effect.value);
                console.log(`${this.name} 恢复了 ${effect.value} 点${effect.target_attribute}，当前值为 ${attribute.current}`);
            }
        }
        // 否则处理简单数值属性（如 `attack`, `defense`, `speed`）
        else if (typeof targetAttribute === "number") {
            // 这里使用类型断言来确认 `targetAttribute` 是数值类型
            if (effect.effect_type === "buff") {
                this.stats[effect.target_attribute as keyof Stats] = (targetAttribute + effect.value) as any;
                console.log(`${this.name} 的 ${effect.target_attribute} 增加了 ${effect.value} 点`);
            } else if (effect.effect_type === "debuff") {
                this.stats[effect.target_attribute as keyof Stats] = (targetAttribute - effect.value) as any;
                console.log(`${this.name} 的 ${effect.target_attribute} 减少了 ${effect.value} 点`);
            }
        } else {
            console.warn(`未知的效果类型或无效的 target_attribute: ${effect.target_attribute}`);
        }

        // 将效果添加到活跃效果列表中，以便后续管理
        this.activeEffects.push({ ...effect, remaining_duration: effect.remaining_duration });
    }

    // 在每回合结束时更新效果的持续时间
    updateEffects() {
        this.activeEffects = this.activeEffects.filter(effect => {
            effect.remaining_duration = (effect.remaining_duration || effect.remaining_duration) - 1;
            if (effect.remaining_duration > 0) {
                return true;
            } else {
                console.log(`${this.name} 的效果 ${effect.name} 已结束`);
                return false;
            }
        });
    }

    // 回合开始时的行为，例如技能冷却更新
    startTurn() {
        console.log(`${this.name} 的回合开始`);

        // 更新技能冷却时间
        this.skillManager.updateCooldowns();

        // 更新角色的增益/减益效果
        this.updateEffects();

        // 检查并触发回合开始的被动技能
        this.skillManager.checkPassiveSkills('onTurnStart');
    }

}

