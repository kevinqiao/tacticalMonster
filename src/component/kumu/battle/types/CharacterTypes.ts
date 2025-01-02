import { TopLevelCondition } from "json-rules-engine";

// SkillEffectType: 使用分组方式改进效果类型
export type SkillEffectType =
    // Direct effects (立即生效)
    | "damage"
    | "heal"
    // Buff/Debuff effects (状态增益/减益)
    | "buff"
    | "debuff"
    // Persistent effects (持续性)
    | "dot" // Damage over Time
    | "hot" // Heal over Time
    // Special status effects
    | "poison"
    | "burn"
    | "stun"
    | "move";

// SkillEffect: 技能效果的统一结构
export interface SkillEffect {
    effect_id?: string; // 效果的唯一标识符（可选，用于跟踪）
    effect_type: SkillEffectType; // 效果类型，例如 "damage" 或 "heal"
    value: string | number; // 效果值，可直接指定数值或通过函数动态计算
    range?: {
        area_type: "single" | "aoe"; // 范围类型：单体或范围攻击
        distance: number; // 技能效果有效距离
    };
    remaining_duration?: number; // 持续时间（以回合计，可选）
    name?: string; // 效果名称，例如 "Burn" 或 "Poison"
    target_attribute?: keyof Stats; // 目标属性，例如 "hp", "attack"（可选）
    trigger_phase?: "immediate" | "turn_start" | "turn_end"; // 触发时机
    trigger_event?: string; // 指定的触发事件（用于 `event` 类型触发效果）
    damage_falloff?: DamageFalloff;  // 添加伤害衰减配置
}

// TriggerCondition: 触发条件与关联效果
export interface TriggerCondition {
    trigger_type: string;
    conditions: TopLevelCondition;
}

// SkillRange: 技能范围的定义
export interface SkillRange {
    area_type: "single" | "circle" | "line";
    min_distance?: number;  // 最小射程
    max_distance: number;   // 最大射程（原distance改名）
}

// Skill: 技能的定义
export interface Skill {
    id: string; // 技能的唯一标识符
    name: string; // 技能名称
    type: "master" | "active" | "passive"; // 技能类型（主动、被动、终极技能）
    description?: string; // 技能描述，提供玩家可读的信息
    canTriggerCounter?: boolean;  // 添加此属性
    priority?: number;  // 技能优先级   
    availabilityConditions?: TopLevelCondition;  // 使用 json-rules-engine 的类型
    range?: SkillRange;
    unlockConditions?: {
        level?: number; // 解锁所需等级
        questsCompleted?: string[]; // 解锁所需完成的任务
    };
    resource_cost: { mp?: number; hp?: number; stamina?: number }; // 技能资源消耗（如法力值）
    cooldown: number; // 技能冷却时间（以回合计）
    effects: SkillEffect[]; // 技能的直接效果（主动技能生效时触发）
    triggerConditions?: TriggerCondition[]; // 技能的触发条件及其关联效果（被动技能）
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
    hp?: { current: number; max: number };
    mp?: number;
    stamina?: number;
    attack?: number;
    defense?: number;
    speed?: number;
    crit_rate?: number;
    evasion?: number;
}
export interface Equipment {
    equipment_id: string;
    type: "weapon" | "armor" | "accessory";
    name: string;
    bonusAttributes: Partial<Stats>; // 直接影响 stats 的加成属性
    customAttributes?: { [key: string]: number }; // 其他自定义属性加成
}

// 角色接口
export interface Character {
    character_id: string;
    name?: string;
    class?: string;
    race?: string;
    level: number;
    experience?: number;
    attributes?: Attributes;
    move_range?: number;
    attack_range?: { min: number; max: number };
    stats?: Stats;
    unlockSkills?: string[];
    skills?: Skill[];
    activeEffects?: SkillEffect[];
    cooldowns?: { [skillId: string]: number };
}

export enum CharacterAnimState {
    IDLE = "stand",
    WALK = "walk",
    ATTACK = "melee"
}

export interface DamageFalloff {
    full_damage_range: number;     // 全伤害范围
    min_damage_percent: number;    // 最小伤害百分比
}

