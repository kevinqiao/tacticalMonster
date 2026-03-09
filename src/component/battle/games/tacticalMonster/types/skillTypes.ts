/**
 * 技能配置库
 * 所有技能统一在此定义，Monster 通过 skillId 引用
 * 采用方案二：完全独立的技能配置系统
 * 
 * 注意：技能配置不存入数据库，直接从配置文件读取
 */

import { UseSkillResponse } from "./backendResponseTypes";
import { MonsterSprite } from "./CombatTypes";

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
    SUMMON = 'summon',        // 召唤单位
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

    // 召唤专用配置（type 为 SUMMON 时使用）
    summonConfig?: {
        monsterId: string;
        side?: 'player' | 'boss';
        position_mode?: 'caster_adjacent' | 'skill_target' | 'fixed';
        q?: number;
        r?: number;
        dq?: number;
        dr?: number;
    };
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
 * 技能同步状态
 * 方案1：乐观UI + 悲观状态
 * 用于同步主动技能动画和后端响应的完成状态
 */
export type SkillSyncState = {
    animationCompleted: boolean;
    backendResponse: UseSkillResponse | null;
    activeSkillTimeline?: gsap.core.Timeline;  // 主动技能动画 timeline，也作为主 timeline 使用
    character?: MonsterSprite;
    target?: MonsterSprite;
    skillId?: string;
};



