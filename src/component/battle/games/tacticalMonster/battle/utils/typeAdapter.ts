/**
 * 类型适配器
 * 用于前后端类型转换，统一数据格式
 */

import { MonsterSkill } from "../../../../../../convex/tacticalMonster/convex/data/skillConfigs";
import { CharacterIdentifier } from "../../../../../../convex/tacticalMonster/convex/service/game/gameService";
import { GameBoss, GameMinion, GameMonster } from "../../../../../../convex/tacticalMonster/convex/types/monsterTypes";
import { MonsterSprite } from "../types/CombatTypes";

// 重新导出后端类型，方便使用
export type { CharacterIdentifier };

// 注意：不再需要转换函数，统一使用后端的 MonsterSkill 和 SkillEffect

/**
 * 将后端Monster转换为前端MonsterSprite
 * 添加UI字段、character_id，统一使用后端的 MonsterSkill[]（不再转换）
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

    // 统一使用后端的 MonsterSkill[]（不再转换）
    // 如果 skills 是 string[]（Boss技能），需要从配置加载
    let skills: MonsterSkill[] = [];
    if (monster.skills) {
        if (Array.isArray(monster.skills)) {
            if (monster.skills.length > 0 && typeof monster.skills[0] === 'string') {
                // Boss技能：string[]，需要从配置加载（这里暂时留空，由调用方处理）
                // skills 保持为空数组，后续通过技能配置加载
            } else {
                // 玩家技能：MonsterSkill[]，直接使用
                skills = monster.skills as MonsterSkill[];
            }
        }
    }

    // 创建MonsterSprite（继承GameMonster的所有字段，包括statusEffects）
    const sprite: MonsterSprite = {
        ...monster,        // 继承所有GameMonster字段，包括statusEffects
        character_id,      // 添加character_id
        skills,            // 统一使用 MonsterSkill[]
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

/**
 * 从后端的 team 和 boss 生成前端的 characters 数组（MonsterSprite[]）
 * 用于需要所有角色的场景（如渲染、查找等）
 */
export function getCharactersFromGameModel(
    team: GameMonster[],
    boss: GameBoss,
    existingSpritesMap?: Map<string, MonsterSprite>
): MonsterSprite[] {
    const characters: MonsterSprite[] = [];

    // 处理玩家队伍
    if (team && Array.isArray(team)) {
        team.forEach((monster: GameMonster) => {
            const existingSprite = existingSpritesMap?.get(monster.monsterId);
            const sprite = toMonsterSprite(monster, existingSprite);
            // 设置角色翻转方向：玩家角色 scaleX = 1
            sprite.scaleX = 1;
            characters.push(sprite);
        });
    }

    // 处理Boss（包括Boss本体和小怪，uid="boss"）
    if (boss) {
        // Boss本体
        const existingBossSprite = existingSpritesMap?.get(boss.bossId || boss.monsterId);
        const bossSprite = toMonsterSprite(boss, existingBossSprite);
        bossSprite.scaleX = -1; // Boss角色 scaleX = -1（面向玩家）
        characters.push(bossSprite);

        // Boss的小怪
        if (boss.minions && Array.isArray(boss.minions)) {
            boss.minions.forEach((minion: GameMonster) => {
                const minionId = (minion as any).minionId || minion.monsterId;
                const existingMinionSprite = existingSpritesMap?.get(minionId);
                const minionSprite = toMonsterSprite(minion, existingMinionSprite);
                minionSprite.scaleX = -1; // Boss小怪 scaleX = -1（面向玩家）
                characters.push(minionSprite);
            });
        }
    }

    return characters;
}

