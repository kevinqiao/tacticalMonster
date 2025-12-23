/**
 * Tactical Monster 角色类型定义
 */

import { TopLevelCondition } from "json-rules-engine";
import { SkillEffectType } from "../../../../../../convex/tacticalMonster/convex/data/skillConfigs";
import { StatusEffect } from "../../../../../../convex/tacticalMonster/convex/types/monsterTypes";

export enum ASSET_TYPE {
    SPINE = 0,
    FBX = 1,
    GLTF = 2,  // GLTF格式支持
}

export interface TriggerCondition {
    trigger_type: string;
    conditions: TopLevelCondition;
}

export interface SkillRange {
    area_type: "single" | "circle" | "line";
    distance?: number;
    min_distance?: number;
    max_distance?: number;
}

/**
 * 技能动画配置
 */
export interface SkillAnimation {
    name?: string;        // 施法者动画名称（如 "melee", "cast", "cast_fire"）
    target?: string;      // 目标动画名称（如 "hurt", "stand"），可选，通常可自动推断
    type?: "attack" | "cast" | "special";  // 动画类型提示（可选，用于回退）
}

export interface Skill {
    id: string;
    name: string;
    type: "master" | "active" | "passive";
    description?: string;
    animation?: SkillAnimation;  // 动画配置对象
    canTriggerCounter?: boolean;
    priority?: number;
    availabilityConditions?: TopLevelCondition;
    range?: SkillRange;
    unlockConditions?: {
        level?: number;
        questsCompleted?: string[];
    };
    resource_cost: { mp?: number; hp?: number; stamina?: number };
    cooldown: number;
    effects: Effect[];
    triggerConditions?: TriggerCondition[];
}

export interface Attributes {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
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
    status_resistance?: number;
}

export interface Equipment {
    equipment_id: string;
    type: "weapon" | "armor" | "accessory";
    name: string;
    bonusAttributes: Partial<Stats>;
    customAttributes?: { [key: string]: number };
}

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
    asset?: { type: ASSET_TYPE; resource: { [key: string]: string } };
    isFlying?: boolean;  // 是否为飞行单位
    flightHeight?: number;  // 飞行高度（用于3D渲染，单位：米或单位长度，建议默认值 1.0-2.0）
}

export enum CharacterAnimState {
    IDLE = "stand",
    WALK = "walk",
    ATTACK = "melee"
}

export interface DamageFalloff {
    full_damage_range: number;
    min_damage_percent: number;
}

// 使用后端的 SkillEffectType，为了向后兼容保留 EffectType 别名
export { SkillEffectType as EffectType };

/**
 * Effect - 前端效果类型
 * 直接继承后端的 StatusEffect，确保类型一致性
 */
export interface Effect extends StatusEffect {
    // StatusEffect 已经包含了所有需要的字段：
    // - id, name, type (SkillEffectType)
    // - duration (可选), remaining_duration (必需)
    // - modifiers, modifier_type, value
    // - icon, damage_falloff, area_type, area_size
    // - damage_type, target_attribute
    // 如果需要前端特有字段，可以在这里添加
}


