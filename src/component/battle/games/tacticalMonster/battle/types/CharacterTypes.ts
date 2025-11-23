/**
 * Tactical Monster 角色类型定义
 */

import { TopLevelCondition } from "json-rules-engine";

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

export interface Skill {
    id: string;
    name: string;
    type: "master" | "active" | "passive";
    description?: string;
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
    area_type?: 'single' | 'circle' | 'line';
    area_size?: number;
    damage_type?: 'physical' | 'magical';
    target_attribute?: string;  // 目标属性（如 "attack", "defense", "hp", "mp"）
}


