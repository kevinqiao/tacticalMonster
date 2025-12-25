/**
 * 技能配置库
 * 所有技能统一在此定义，Monster 通过 skillId 引用
 * 采用方案二：完全独立的技能配置系统
 * 
 * 注意：技能配置不存入数据库，直接从配置文件读取
 */

/**
 * 技能范围定义
 */
export interface SkillRange {
    area_type: "single" | "circle" | "line";  // 范围类型
    distance?: number;                        // 最大距离（用于 single 和 line）
    min_distance?: number;                    // 最小距离（用于 line）
    max_distance?: number;                    // 最大距离（用于 circle）
}

/**
 * 效果类型枚举
 */
export enum SkillEffectType {
    BUFF = 'buff',
    DEBUFF = 'debuff',
    DOT = 'dot',              // 持续伤害
    HOT = 'hot',              // 持续治疗
    STUN = 'stun',            // 眩晕
    SHIELD = 'shield',        // 护盾
    MP_DRAIN = 'mp_drain',    // 法力吸取
    MP_RESTORE = 'mp_restore', // 法力恢复
    DAMAGE = 'damage',        // 直接伤害
    HEAL = 'heal',            // 直接治疗
    MOVEMENT = 'movement',    // 移动效果
    TELEPORT = 'teleport',    // 传送效果
}

/**
 * 伤害衰减定义
 */
export interface DamageFalloff {
    full_damage_range: number;      // 全额伤害范围
    min_damage_percent: number;      // 最小伤害百分比（0-1）
}

/**
 * 技能效果定义
 */
export interface SkillEffect {
    id: string;                      // 效果ID
    name: string;                    // 效果名称
    type: SkillEffectType;           // 效果类型
    duration?: number;               // 持续时间（回合数，0表示立即生效）
    remaining_duration?: number;     // 剩余持续时间（运行时使用）

    // 数值修改
    modifiers?: {                   // 属性修改器
        [key: string]: number;      // 如 { "attack": 20, "defense": -10 }
    };
    modifier_type?: 'add' | 'multiply';  // 修改类型：加法或乘法

    // 直接数值
    value?: number;                 // 直接数值（伤害值、治疗值等）

    // UI相关
    icon?: string;                  // 效果图标路径

    // 范围相关
    damage_falloff?: DamageFalloff; // 伤害衰减
    area_type?: 'single' | 'circle' | 'line';  // 作用范围类型
    area_size?: number;             // 作用范围大小

    // 伤害类型
    damage_type?: 'physical' | 'magical';  // 伤害类型

    // 目标属性
    target_attribute?: string;      // 目标属性（如 "attack", "defense", "hp", "mp"）
}

/**
 * 技能解锁条件
 */
export interface SkillUnlockConditions {
    level?: number;                 // 解锁所需等级
    questsCompleted?: string[];     // 解锁所需完成的任务ID列表
}

/**
 * 技能资源消耗
 */
export interface SkillResourceCost {
    mp?: number;                    // 法力值消耗
    hp?: number;                    // 生命值消耗
    stamina?: number;               // 体力消耗
}

/**
 * 技能触发条件（用于被动技能）
 */
export interface SkillTriggerCondition {
    trigger_type: string;            // 触发类型（如 "on_attack", "on_hit", "on_kill", "round_start", "round_end"）
    conditions?: any;               // 触发条件（使用 json-rules-engine 的 TopLevelCondition）
    effects: SkillEffect[];         // 触发时生效的效果列表
}

/**
 * 技能动画配置（前端使用）
 */
export interface SkillAnimation {
    name?: string;        // 施法者动画名称（如 "melee", "cast", "cast_fire"）
    target?: string;      // 目标动画名称（如 "hurt", "stand"），可选，通常可自动推断
    type?: "attack" | "cast" | "special";  // 动画类型提示（可选，用于回退）
}

/**
 * 怪物技能定义
 */
export interface MonsterSkill {
    id: string;                      // 技能唯一标识符
    name: string;                    // 技能名称
    type: "master" | "active" | "passive";  // 技能类型
    description?: string;            // 技能描述
    animation?: SkillAnimation;      // 动画配置对象（可选，前端使用）

    // 战斗相关
    canTriggerCounter?: boolean;     // 是否可以触发反击
    priority?: number;               // 技能优先级（数值越大优先级越高）

    // 可用性条件（使用 json-rules-engine）
    availabilityConditions?: any;    // 技能可用条件（TopLevelCondition）

    // 范围定义
    range?: SkillRange;              // 技能作用范围

    // 解锁条件
    unlockConditions?: SkillUnlockConditions;  // 技能解锁条件

    // 资源消耗
    resource_cost: SkillResourceCost;  // 技能资源消耗

    // 冷却时间
    cooldown: number;                // 技能冷却时间（回合数）

    // 效果列表（多个效果会同时生效）
    effects: SkillEffect[];          // 技能效果列表

    // 触发条件（用于被动技能）
    triggerConditions?: SkillTriggerCondition[];  // 触发条件列表
}

/**
 * 通用技能库（所有怪物可共享的技能）
 */
export const COMMON_SKILLS: Record<string, MonsterSkill> = {
    // ========== 基础攻击技能 ==========
    basic_attack: {
        id: "basic_attack",
        name: "基础攻击",
        type: "active",
        description: "对目标造成物理伤害",
        priority: 1,
        range: {
            area_type: "single",
            distance: 1,
        },
        resource_cost: {},
        cooldown: 0,
        effects: [
            {
                id: "damage_effect",
                name: "物理伤害",
                type: SkillEffectType.DAMAGE,
                value: 100, // 基础值，实际伤害会根据怪物属性计算
                damage_type: "physical",
                target_attribute: "hp",
            },
        ],
    },

    ranged_attack: {
        id: "ranged_attack",
        name: "远程攻击",
        type: "active",
        description: "对目标造成远程物理伤害",
        priority: 1,
        range: {
            area_type: "single",
            distance: 3,
        },
        resource_cost: {},
        cooldown: 0,
        effects: [
            {
                id: "ranged_damage_effect",
                name: "远程物理伤害",
                type: SkillEffectType.DAMAGE,
                value: 80,
                damage_type: "physical",
                target_attribute: "hp",
            },
        ],
    },

    // ========== 治疗技能 ==========
    heal: {
        id: "heal",
        name: "治疗",
        type: "active",
        description: "恢复目标生命值",
        priority: 2,
        range: {
            area_type: "single",
            distance: 2,
        },
        unlockConditions: {
            level: 3,
        },
        resource_cost: { mp: 20 },
        cooldown: 2,
        effects: [
            {
                id: "heal_effect",
                name: "生命恢复",
                type: SkillEffectType.HEAL,
                value: 150,
                target_attribute: "hp",
            },
        ],
    },

    group_heal: {
        id: "group_heal",
        name: "群体治疗",
        type: "active",
        description: "恢复范围内所有友方单位生命值",
        priority: 3,
        range: {
            area_type: "circle",
            max_distance: 2,
        },
        unlockConditions: {
            level: 10,
        },
        resource_cost: { mp: 40 },
        cooldown: 3,
        effects: [
            {
                id: "group_heal_effect",
                name: "群体生命恢复",
                type: SkillEffectType.HEAL,
                value: 100,
                area_type: "circle",
                area_size: 2,
                target_attribute: "hp",
            },
        ],
    },

    // ========== 护盾技能 ==========
    shield: {
        id: "shield",
        name: "护盾",
        type: "active",
        description: "为目标添加护盾",
        priority: 2,
        range: {
            area_type: "single",
            distance: 2,
        },
        unlockConditions: {
            level: 5,
        },
        resource_cost: { mp: 25 },
        cooldown: 4,
        effects: [
            {
                id: "shield_effect",
                name: "护盾",
                type: SkillEffectType.SHIELD,
                value: 200,
                duration: 3,
                target_attribute: "shield",
            },
        ],
    },

    // ========== Buff/Debuff 技能 ==========
    attack_boost: {
        id: "attack_boost",
        name: "攻击强化",
        type: "active",
        description: "提升目标攻击力",
        priority: 2,
        range: {
            area_type: "single",
            distance: 2,
        },
        unlockConditions: {
            level: 7,
        },
        resource_cost: { mp: 15 },
        cooldown: 3,
        effects: [
            {
                id: "attack_boost_effect",
                name: "攻击力提升",
                type: SkillEffectType.BUFF,
                modifiers: {
                    attack: 0.2,
                },
                modifier_type: "multiply",
                duration: 3,
            },
        ],
    },

    defense_boost: {
        id: "defense_boost",
        name: "防御强化",
        type: "active",
        description: "提升目标防御力",
        priority: 2,
        range: {
            area_type: "single",
            distance: 2,
        },
        unlockConditions: {
            level: 7,
        },
        resource_cost: { mp: 15 },
        cooldown: 3,
        effects: [
            {
                id: "defense_boost_effect",
                name: "防御力提升",
                type: SkillEffectType.BUFF,
                modifiers: {
                    defense: 0.2,
                },
                modifier_type: "multiply",
                duration: 3,
            },
        ],
    },

    weaken: {
        id: "weaken",
        name: "虚弱",
        type: "active",
        description: "降低目标攻击力",
        priority: 2,
        range: {
            area_type: "single",
            distance: 2,
        },
        unlockConditions: {
            level: 8,
        },
        resource_cost: { mp: 20 },
        cooldown: 3,
        effects: [
            {
                id: "weaken_effect",
                name: "攻击力降低",
                type: SkillEffectType.DEBUFF,
                modifiers: {
                    attack: -0.15,
                },
                modifier_type: "multiply",
                duration: 2,
            },
        ],
    },

    // ========== 被动技能 ==========
    combat_reflexes: {
        id: "combat_reflexes",
        name: "战斗反射",
        type: "passive",
        description: "受到攻击时有概率反击",
        unlockConditions: {
            level: 5,
        },
        resource_cost: {},
        cooldown: 0,
        effects: [],
        triggerConditions: [
            {
                trigger_type: "on_hit",
                effects: [
                    {
                        id: "counter_attack",
                        name: "反击",
                        type: SkillEffectType.DAMAGE,
                        value: 50,
                        damage_type: "physical",
                        target_attribute: "hp",
                    },
                ],
            },
        ],
    },

    regeneration: {
        id: "regeneration",
        name: "再生",
        type: "passive",
        description: "每回合恢复生命值",
        unlockConditions: {
            level: 10,
        },
        resource_cost: {},
        cooldown: 0,
        effects: [],
        triggerConditions: [
            {
                trigger_type: "round_start",
                effects: [
                    {
                        id: "regen_effect",
                        name: "生命恢复",
                        type: SkillEffectType.HOT,
                        value: 30,
                        duration: 1,
                        target_attribute: "hp",
                    },
                ],
            },
        ],
    },
};

/**
 * 专属技能库（怪物特定技能）
 */
export const UNIQUE_SKILLS: Record<string, MonsterSkill> = {
    // ========== 格里芬专属技能 ==========
    griffin_claw_attack: {
        id: "griffin_claw_attack",
        name: "利爪攻击",
        type: "active",
        description: "格里芬的利爪攻击，造成额外伤害",
        priority: 2,
        range: {
            area_type: "single",
            distance: 2,
        },
        unlockConditions: {
            level: 5,
        },
        resource_cost: { mp: 15 },
        cooldown: 3,
        effects: [
            {
                id: "claw_damage",
                name: "利爪伤害",
                type: SkillEffectType.DAMAGE,
                value: 200,
                damage_type: "physical",
                target_attribute: "hp",
            },
        ],
    },

    griffin_flying_advantage: {
        id: "griffin_flying_advantage",
        name: "飞行优势",
        type: "passive",
        description: "攻击时增加20%伤害",
        unlockConditions: {
            level: 5,
        },
        resource_cost: {},
        cooldown: 0,
        effects: [],
        triggerConditions: [
            {
                trigger_type: "on_attack",
                effects: [
                    {
                        id: "flying_damage_boost",
                        name: "伤害加成",
                        type: SkillEffectType.BUFF,
                        modifiers: {
                            attack: 0.2,
                        },
                        modifier_type: "multiply",
                        duration: 1,
                    },
                ],
            },
        ],
    },

    // ========== 原始巨龙专属技能 ==========
    dragon_breath: {
        id: "dragon_breath",
        name: "龙息",
        type: "active",
        description: "对前方扇形区域造成火焰伤害",
        priority: 3,
        range: {
            area_type: "line",
            min_distance: 1,
            distance: 3,
        },
        unlockConditions: {
            level: 10,
        },
        resource_cost: { mp: 30 },
        cooldown: 4,
        effects: [
            {
                id: "fire_damage",
                name: "火焰伤害",
                type: SkillEffectType.DAMAGE,
                value: 180,
                damage_type: "magical",
                area_type: "line",
                area_size: 3,
                target_attribute: "hp",
            },
            {
                id: "burn_effect",
                name: "灼烧",
                type: SkillEffectType.DOT,
                value: 30,
                duration: 3,
                damage_type: "magical",
                target_attribute: "hp",
            },
        ],
    },

    dragon_scale_armor: {
        id: "dragon_scale_armor",
        name: "龙鳞护甲",
        type: "passive",
        description: "受到物理攻击时减少20%伤害",
        unlockConditions: {
            level: 7,
        },
        resource_cost: {},
        cooldown: 0,
        effects: [],
        triggerConditions: [
            {
                trigger_type: "on_hit",
                effects: [
                    {
                        id: "physical_damage_reduction",
                        name: "物理伤害减免",
                        type: SkillEffectType.BUFF,
                        modifiers: {
                            defense: 0.2,
                        },
                        modifier_type: "multiply",
                        duration: 1,
                    },
                ],
            },
        ],
    },

    // ========== 混沌领主专属技能 ==========
    chaos_strike: {
        id: "chaos_strike",
        name: "混沌打击",
        type: "active",
        description: "造成混乱伤害，有概率附加眩晕",
        priority: 3,
        range: {
            area_type: "single",
            distance: 2,
        },
        unlockConditions: {
            level: 8,
        },
        resource_cost: { mp: 25 },
        cooldown: 4,
        effects: [
            {
                id: "chaos_damage",
                name: "混沌伤害",
                type: SkillEffectType.DAMAGE,
                value: 220,
                damage_type: "magical",
                target_attribute: "hp",
            },
            {
                id: "stun_chance",
                name: "眩晕",
                type: SkillEffectType.STUN,
                duration: 1,
            },
        ],
    },

    // ========== 神圣守护者专属技能 ==========
    divine_protection: {
        id: "divine_protection",
        name: "神圣守护",
        type: "active",
        description: "为范围内所有友方单位添加护盾",
        priority: 4,
        range: {
            area_type: "circle",
            max_distance: 2,
        },
        unlockConditions: {
            level: 12,
        },
        resource_cost: { mp: 50 },
        cooldown: 5,
        effects: [
            {
                id: "divine_shield",
                name: "神圣护盾",
                type: SkillEffectType.SHIELD,
                value: 300,
                duration: 4,
                area_type: "circle",
                area_size: 2,
                target_attribute: "shield",
            },
        ],
    },

    holy_light: {
        id: "holy_light",
        name: "圣光",
        type: "active",
        description: "对范围内所有友方单位进行治疗",
        priority: 3,
        range: {
            area_type: "circle",
            max_distance: 3,
        },
        unlockConditions: {
            level: 10,
        },
        resource_cost: { mp: 40 },
        cooldown: 4,
        effects: [
            {
                id: "holy_heal",
                name: "圣光治疗",
                type: SkillEffectType.HEAL,
                value: 200,
                area_type: "circle",
                area_size: 3,
                target_attribute: "hp",
            },
        ],
    },
};

/**
 * 技能配置映射（合并通用和专属）
 */
export const SKILL_CONFIGS: Record<string, MonsterSkill> = {
    ...COMMON_SKILLS,
    ...UNIQUE_SKILLS,
};

/**
 * 根据技能ID获取技能配置
 */
export function getSkillConfig(skillId: string): MonsterSkill | undefined {
    return SKILL_CONFIGS[skillId];
}

/**
 * 根据技能ID列表获取技能配置列表
 */
export function getSkillConfigs(skillIds: string[]): MonsterSkill[] {
    return skillIds
        .map(id => getSkillConfig(id))
        .filter((skill): skill is MonsterSkill => skill !== undefined);
}

/**
 * 获取所有技能配置
 */
export function getAllSkillConfigs(): MonsterSkill[] {
    return Object.values(SKILL_CONFIGS);
}

/**
 * 根据类型筛选技能
 */
export function getSkillsByType(type: "master" | "active" | "passive"): MonsterSkill[] {
    return getAllSkillConfigs().filter(skill => skill.type === type);
}

/**
 * 检查技能是否存在
 */
export function skillExists(skillId: string): boolean {
    return skillId in SKILL_CONFIGS;
}

