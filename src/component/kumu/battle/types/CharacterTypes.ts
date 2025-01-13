import { TopLevelCondition } from "json-rules-engine";

export enum ASSET_TYPE {
   SPINE = 0,
   FBX = 1,

}
export interface TriggerCondition {
    trigger_type: string;
    conditions: TopLevelCondition;
}

// SkillRange: 技能范围的定义
export interface SkillRange {
    area_type: "single" | "circle" | "line";
    distance?: number;  // 射程
    min_distance?: number;  // 最小射程
    max_distance?: number;   // 最大射程（原distance改名）
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
    effects: Effect[]; // 技能的直接效果（主动技能生效时触发）
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
    mp?: { current: number; max: number };
    stamina?: number;
    attack?: number;
    defense?: number;
    speed?: number;
    crit_rate?: number;
    evasion?: number;
    shield?: { current: number; max: number };
    intelligence?: number;
    status_resistance?: number;  // 添加状态抗性属性
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
    asset?:{type:ASSET_TYPE,resource:{[key:string]:string}}
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

export enum EffectType {
    BUFF = 'buff',
    DEBUFF = 'debuff',
    DOT = 'dot',
    HOT = 'hot',
    STUN = 'stun',
    SHIELD = 'shield',
    MP_DRAIN = 'mp_drain',
    MP_RESTORE = 'mp_restore'
}

export interface Effect {
    id: string;
    name: string;
    type: EffectType;
    duration: number;
    remaining_duration?: number;
    modifiers?: {
        [key: string]: number;
    };
    modifier_type?: 'add' | 'multiply';
    value?: number;
    icon?: string;
    damage_falloff?: DamageFalloff;
    area_type?: 'single' | 'circle' | 'line';  // 添加范围类型
    area_size?: number;  // 范围大小（半径或长度）
    damage_type?: 'physical' | 'magical';  // 添加这一行
}

