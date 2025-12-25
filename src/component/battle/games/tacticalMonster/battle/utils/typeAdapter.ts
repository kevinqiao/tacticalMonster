/**
 * 类型适配器
 * 用于前后端类型转换，统一数据格式
 */

import { GameMonster, GameBoss, GameMinion, StatusEffect } from "../../../../../../convex/tacticalMonster/convex/types/monsterTypes";
import { MonsterSkill, SkillEffect } from "../../../../../../convex/tacticalMonster/convex/data/skillConfigs";
import { CharacterIdentifier } from "../../../../../../convex/tacticalMonster/convex/service/game/gameService";
import { Skill, Effect } from "../types/CharacterTypes";
import { MonsterSprite } from "../types/CombatTypes";

// 重新导出后端类型，方便使用
export type { CharacterIdentifier };

/**
 * 将后端的 SkillEffect 转换为前端的 Effect（StatusEffect）
 * 由于 Effect 继承 StatusEffect，而 StatusEffect 继承 SkillEffect，
 * 我们需要确保 remaining_duration 字段存在
 */
export function convertSkillEffectToEffect(skillEffect: SkillEffect): Effect {
    // 确保 remaining_duration 存在（StatusEffect 的必需字段）
    return {
        ...skillEffect,
        remaining_duration: skillEffect.remaining_duration ?? skillEffect.duration ?? 0,
    } as Effect;
}

/**
 * 将后端的 MonsterSkill 转换为前端的 Skill
 * effects 字段从 SkillEffect[] 转换为 Effect[]（StatusEffect[]）
 */
export function convertMonsterSkillToSkill(monsterSkill: MonsterSkill): Skill {
    return {
        id: monsterSkill.id,
        name: monsterSkill.name,
        type: monsterSkill.type,
        description: monsterSkill.description,
        animation: monsterSkill.animation,  // 传递动画配置
        canTriggerCounter: monsterSkill.canTriggerCounter,
        priority: monsterSkill.priority,
        availabilityConditions: monsterSkill.availabilityConditions,
        range: monsterSkill.range,
        unlockConditions: monsterSkill.unlockConditions,
        resource_cost: monsterSkill.resource_cost,
        cooldown: monsterSkill.cooldown,
        // effects 从 SkillEffect[] 转换为 Effect[]（StatusEffect[]）
        effects: monsterSkill.effects.map(convertSkillEffectToEffect),
        triggerConditions: monsterSkill.triggerConditions?.map(tc => ({
            trigger_type: tc.trigger_type,
            conditions: tc.conditions,
        })),
    };
}

/**
 * 将后端Monster转换为前端MonsterSprite
 * 添加UI字段、character_id，并转换技能和效果列表
 */
export function toMonsterSprite(
    monster: GameMonster | GameBoss | GameMinion,
    existingSprite?: MonsterSprite
): MonsterSprite {
    // 确定 character_id
    let character_id: string;
    if ('bossId' in monster && monster.bossId) {
        character_id = monster.bossId;
    } else if ('minionId' in monster && monster.minionId) {
        character_id = monster.minionId;
    } else {
        character_id = monster.monsterId;
    }

    // 转换技能列表（MonsterSkill[] -> Skill[]）
    const skills: Skill[] = [];
    if (monster.skills) {
        if (Array.isArray(monster.skills)) {
            if (monster.skills.length > 0 && typeof monster.skills[0] === 'string') {
                // Boss技能：string[]，需要从配置加载（这里暂时留空，由调用方处理）
                // skills 保持为空数组，后续通过技能配置加载
            } else {
                // 玩家技能：MonsterSkill[]
                skills.push(...(monster.skills as MonsterSkill[]).map(convertMonsterSkillToSkill));
            }
        }
    }

    // statusEffects 直接继承自 GameMonster，不需要转换
    // 创建MonsterSprite（继承GameMonster的所有字段，包括statusEffects）
    const sprite: MonsterSprite = {
        ...monster,        // 继承所有GameMonster字段，包括statusEffects
        character_id,      // 添加character_id
        skills,            // 添加转换后的skills
        // statusEffects 已经通过 ...monster 继承，类型为 StatusEffect[]
        // 保留现有UI相关字段
        ...(existingSprite && {
            container: existingSprite.container,
            standEle: existingSprite.standEle,
            attackEle: existingSprite.attackEle,
            skeleton: existingSprite.skeleton,
            animator: existingSprite.animator,
            scaleX: existingSprite.scaleX,
            facing: existingSprite.facing,
            walkables: existingSprite.walkables,
            attackables: existingSprite.attackables,
        }),
    };

    return sprite;
}

/**
 * 将前端的 MonsterSprite 转换为后端的 CharacterIdentifier
 */
export function convertMonsterToCharacterIdentifier(monster: MonsterSprite): CharacterIdentifier {
    // 根据 character_id 判断类型
    // 注意：这里需要根据游戏状态判断，暂时使用简单规则
    // 实际使用时，需要传入游戏状态来判断是 bossId 还是 minionId
    
    // 简单规则：如果 uid 是 "boss"，可能是 bossId 或 minionId
    // 这里返回一个通用的标识符，调用方需要根据实际情况设置正确的字段
    if (monster.uid === "boss") {
        // 无法确定是 bossId 还是 minionId，返回空对象
        // 调用方需要根据游戏状态设置正确的字段
        return {};
    }
    
    // 玩家角色：使用 monsterId
    return {
        monsterId: monster.character_id,
    };
}


/**
 * 根据游戏状态和 character_id 确定 CharacterIdentifier
 * 需要传入游戏状态来判断是 bossId 还是 minionId
 */
export function determineCharacterIdentifier(
    characterId: string,
    uid: string,
    gameState?: {
        boss?: { bossId?: string; minions?: Array<{ minionId?: string }> };
    }
): CharacterIdentifier {
    if (uid === "boss") {
        // 检查是否是Boss主体
        if (gameState?.boss?.bossId === characterId) {
            return { bossId: characterId };
        }
        // 检查是否是小怪
        if (gameState?.boss?.minions?.some(m => m.minionId === characterId)) {
            return { minionId: characterId };
        }
        // 无法确定，返回空（调用方需要处理）
        return {};
    }
    
    // 玩家角色
    return { monsterId: characterId };
}

/**
 * 从 CharacterIdentifier 获取 character_id（用于查找前端角色）
 */
export function getCharacterIdFromIdentifier(identifier: CharacterIdentifier): string | null {
    return identifier.monsterId || identifier.bossId || identifier.minionId || null;
}

