// 技能效果接口


// 技能升级路径接口
export interface SkillUpgrade {
    level: number;                      // 技能等级
    upgrade_description: string;        // 等级提升描述
    upgraded_effects: Effect[];    // 每一级的效果变化
}
export interface TriggerCondition {
    trigger_type: string;
    probability: number;
}
// 技能接口
export interface Skill {
    skill_id: string;                    // 技能ID，唯一标识
    name: string;                        // 技能名称
    description: string;                 // 技能描述，简要介绍技能效果和用途
    type: string;                        // 技能类型，如"攻击", "防御", "支援", "治疗"
    range: {
        area_type: string;               // 技能作用范围类型，如"单体", "范围", "直线", "自身"
        distance: number;                // 技能施放距离，单位为格
    };
    effects: Effect[];              // 技能效果数组，包含多个技能效果（如伤害、状态效果等）
    requirements: {                      // 技能使用需求和限制条件
        min_level: number;               // 使用技能所需的角色最低等级
        required_class: string;          // 使用技能所需的职业（若有限制）
        required_skills: string[];       // 使用技能所需的其他技能（如技能树中的前置技能）
    };
    resource_cost: {                     // 技能消耗资源
        mp: number;                      // 使用技能所需的魔法值（MP）消耗
        hp: number;                      // 使用技能可能消耗的生命值（HP）
        stamina?: number;                // 体力（耐力）消耗
    };
    cooldown: number;                    // 技能冷却时间（以回合为单位）
    upgrade_path: SkillUpgrade[];        // 技能升级路径，用于TRPG中的技能成长设计
    is_passive: boolean;                 // 是否为被动技能（被动技能不需要主动使用）
    trigger_conditions: TriggerCondition[];             // 触发几率（0到1[];
    tags: string[];                      // 技能标签，用于分类或筛选（如AOE、控制、增益等）
}

// 装备接口
export interface Equipment {
    equipment_id: string;                // 装备ID
    type: "weapon" | "armor" | "accessory"; // 装备类型
    durability?: number;                 // 装备耐久度
    effects: Effect[];
    custom_attributes?: { [k: string]: number };      // 自定义效果
}

export interface Attributes {
    strength: number;  // 影响攻击力
    dexterity: number; // 影响速度和回避
    constitution: number; // 影响生命值上限
    intelligence: number; // 影响魔法值上限和技能效果
    wisdom: number;    // 影响魔法防御和状态抗性
    charisma: number;  // 影响NPC互动
}

export interface Stats {
    hp: { current: number; max: number }; // 基于constitution的最大值，但会随时改变
    mp: { current: number; max: number }; // 基于intelligence的最大值
    stamina: { current: number; max: number };
    attack: number;     // 基于strength的攻击力，随装备和状态增减
    defense: number;    // 基于constitution等派生的防御力
    speed: number;      // 基于dexterity等派生的速度
    crit_rate: number;  // 暴击率
    evasion: number;    // 回避率
}

export interface Effect {
    effect_id: string;                          // 唯一标识符
    name: string;                               // 效果名称，如"Poison", "Burn"
    source: "equipment" | "status";             // 来源，标识是装备效果还是状态效果
    effect_type: "damage" | "heal" | "buff" | "debuff" | "dot" | "hot" | "poison" | "burn" | "stun"; // 效果类型
    target_attribute: keyof Stats;                   // 影响的属性，例如"hp", "attack", "defense"
    value: number;                              // 效果的值，正数表示增益，负数表示减益
    duration: number;                           // 效果的初始持续回合数
    remaining_duration: number;                 // 当前剩余回合数
}


// 角色接口
export interface Character {
    character_id: string;
    name: string;
    class: string;
    race: string;
    level: number;
    experience: number;
    attributes: Attributes;
    move_arrange: number;
    attack_range: { min: number; max: number };
    stats: Stats;
    skills: string[]; // 技能ID数组，用于从技能数据库中查找详细信息
    equipment: {
        weapon?: string;                 // 引用武器ID
        armor?: string;                  // 引用护甲ID
        accessories: string[];           // 引用饰品ID数组
    };
    activeEffects: Effect[];
    skillCooldowns: { [skill_id: string]: number }; // 每个技能当前的冷却剩余回合数

}

