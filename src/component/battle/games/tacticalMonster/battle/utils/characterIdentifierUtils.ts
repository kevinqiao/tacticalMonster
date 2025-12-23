/**
 * 角色标识符工具
 * 用于前后端角色标识符的转换和管理
 */

import { CharacterIdentifier } from "../../../../../../convex/tacticalMonster/convex/service/game/gameService";
import { MonsterSprite } from "../types/CombatTypes";
import { determineCharacterIdentifier, getCharacterIdFromIdentifier } from "./typeAdapter";

/**
 * 将前端的 MonsterSprite 转换为后端的 CharacterIdentifier
 * 需要游戏状态来判断是 bossId 还是 minionId
 */
export function toCharacterIdentifier(
    sprite: MonsterSprite,
    gameState?: {
        boss?: { bossId?: string; minions?: Array<{ minionId?: string }> };
    }
): CharacterIdentifier {
    return determineCharacterIdentifier(sprite.character_id, sprite.uid, gameState);
}

/**
 * 从 CharacterIdentifier 查找对应的 MonsterSprite
 */
export function fromCharacterIdentifier(
    identifier: CharacterIdentifier,
    sprites: MonsterSprite[]
): MonsterSprite | null {
    const characterId = getCharacterIdFromIdentifier(identifier);
    if (!characterId) {
        return null;
    }

    // 查找匹配的角色
    // 注意：需要同时匹配 character_id 和 uid（如果是boss，还需要判断是boss还是minion）
    if (identifier.monsterId) {
        // 玩家角色：使用 monsterId 和 uid
        return sprites.find(c => c.character_id === identifier.monsterId && c.uid !== "boss") || null;
    } else if (identifier.bossId) {
        // Boss主体：使用 bossId 和 uid="boss"
        return sprites.find(c => c.character_id === identifier.bossId && c.uid === "boss") || null;
    } else if (identifier.minionId) {
        // 小怪：使用 minionId 和 uid="boss"
        return sprites.find(c => c.character_id === identifier.minionId && c.uid === "boss") || null;
    }

    return null;
}

/**
 * 从旧的格式（uid + character_id）转换为 CharacterIdentifier
 */
export function fromLegacyFormat(
    uid: string,
    characterId: string,
    gameState?: {
        boss?: { bossId?: string; minions?: Array<{ minionId?: string }> };
    }
): CharacterIdentifier {
    return determineCharacterIdentifier(characterId, uid, gameState);
}

/**
 * 验证 CharacterIdentifier 是否有效（只有一个字段存在）
 */
export function isValidCharacterIdentifier(identifier: CharacterIdentifier): boolean {
    const fields = [identifier.monsterId, identifier.bossId, identifier.minionId].filter(Boolean);
    return fields.length === 1;
}

