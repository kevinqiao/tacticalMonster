import { TopLevelCondition } from "json-rules-engine";

export type SkillEffectType =
    | "damage"
    | "heal"
    | "buff"
    | "debuff"
    | "dot"
    | "hot"
    | "poison"
    | "burn"
    | "stun";

export interface SkillEffect {
    effect_id?: string;
    effect_type: SkillEffectType; // 类型，例如 "damage" 或 "heal"
    value: string | number;      // 效果值，支持字符串 (动态计算) 或直接的数值
    remaining_duration?: number; // 效果持续时间（可选）
    name?: string;               // 效果名称（例如 "Burn" 或 "Poison"）
    target_attribute?: keyof Stats; // 目标的属性（例如 "hp", "attack"）
}

export type TriggerCondition = {
    conditions: { [key: string]: any }; // JSON Rule Engine 支持的条件结构
    effects: SkillEffect[];           // 满足条件时触发的效果
};

// export interface Skill {
//     id: string;                       // 技能唯一标识符
//     name: string;                     // 技能名称
//     type: "active" | "passive";       // 技能类型（主动或被动）
//     resourceCost?: { mana: number };  // 资源消耗，例如法力值
//     cooldown?: number;                // 冷却时间（回合数，仅限主动技能）
//     target?: "self" | "ally" | "enemy"; // 技能目标类型
//     unlockConditions?: {              // 技能解锁条件
//         level?: number;               // 解锁所需等级
//         questsCompleted?: string[];   // 解锁所需完成的任务
//     };
//     effects?: SkillEffect[];          // 主动技能的效果列表
//     triggerConditions?: TriggerCondition[]; // 被动技能的触发条件列表
// }

export interface Skill {
    id: string; // Unique identifier for the skill
    name: string; // Skill name
    type: "active" | "passive"; // Whether the skill is active or passive
    unlockConditions?: {
        level?: number; // Level required to unlock the skill
        questsCompleted?: string[]; // Quests required to unlock the skill
    };
    resourceCost?: { mana: number }; // Resource cost for active skills
    cooldown?: number; // Cooldown time for active skills
    effects?: SkillEffect[]; // Effects of the skill
    triggerConditions?: {
        conditions: TopLevelCondition; // Trigger conditions for passive skills
        effects: SkillEffect[]; // Effects triggered by the conditions
    }[];
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

// export interface Effect {
//     effect_id: string;                          // 唯一标识符
//     name: string;                               // 效果名称，如"Poison", "Burn"
//     // source: "equipment" | "status";             // 来源，标识是装备效果还是状态效果
//     effect_type: "damage" | "heal" | "buff" | "debuff" | "dot" | "hot" | "poison" | "burn" | "stun"; // 效果类型
//     target_attribute: keyof Stats;                   // 影响的属性，例如"hp", "attack", "defense"
//     value: number;                              // 效果的值，正数表示增益，负数表示减益
//     remaining_duration: number;                 // 当前剩余回合数
// }


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
    questsCompleted: string[];
    skills: string[];
    statusEffects: SkillEffect[];
    cooldowns: { [skillId: string]: number };
}

