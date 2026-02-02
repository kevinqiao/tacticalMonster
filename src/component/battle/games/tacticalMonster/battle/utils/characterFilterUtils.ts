/**
 * 角色过滤工具函数
 * 用于获取敌人和友军列表
 */

import { MonsterSprite } from "../../types/CombatTypes";

/**
 * 获取所有敌人
 * @param character - 当前角色
 * @param characters - 所有角色列表
 * @returns 敌人列表（uid 不同）
 */
export function getAllEnemies(
    character: MonsterSprite,
    characters: MonsterSprite[]
): MonsterSprite[] {
    return characters.filter(c =>
        c.uid !== character.uid &&
        c.character_id !== character.character_id
    );
}

/**
 * 获取所有友军
 * @param character - 当前角色
 * @param characters - 所有角色列表
 * @returns 友军列表（uid 相同，但 character_id 不同）
 */
export function getAllAllies(
    character: MonsterSprite,
    characters: MonsterSprite[]
): MonsterSprite[] {
    return characters.filter(c =>
        c.uid === character.uid &&
        c.character_id !== character.character_id
    );
}
