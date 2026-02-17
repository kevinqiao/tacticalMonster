/**
 * 角色相关工具函数
 */

import { MonsterSprite } from "../../../types/CombatTypes";
import { toCharacterIdentifier } from "../../../utils/characterIdentifierUtils";
import type { CharacterIdentifier } from "../../../utils/typeAdapter";

/**
 * 根据 CharacterIdentifier 查找目标角色
 */
export const findTargetByIdentifier = (
    characters: MonsterSprite[] | undefined,
    identifier: CharacterIdentifier,
    excludeBoss: boolean = false
): MonsterSprite | undefined => {
    if (!characters) return undefined;

    return characters.find((c) => {
        if (identifier.monsterId) {
            return c.monsterId === identifier.monsterId && (!excludeBoss || c.uid !== "boss");
        } else if (identifier.bossId) {
            return c.character_id === identifier.bossId;
        } else if (identifier.minionId) {
            return c.character_id === identifier.minionId;
        }
        return false;
    });
};

/**
 * 创建 CharacterIdentifier（简化重复代码）
 */
export const createCharacterIdentifiers = (
    characters: MonsterSprite[] | undefined,
    character: MonsterSprite,
    target?: MonsterSprite
) => {
    if (!characters) {
        return { casterIdentifier: toCharacterIdentifier(character), targetIdentifiers: [] };
    }

    const bossCharacters = characters.filter(c => c.uid === "boss");
    const bossId = bossCharacters[0]?.character_id;
    const minions = bossCharacters.slice(1);

    const bossInfo = bossId ? {
        bossId,
        minions: minions.map(m => ({ minionId: m.character_id }))
    } : undefined;

    const casterIdentifier = toCharacterIdentifier(character, { boss: bossInfo });
    const targetIdentifiers: CharacterIdentifier[] = target
        ? [toCharacterIdentifier(target, { boss: bossInfo })]
        : [];

    return { casterIdentifier, targetIdentifiers };
};

/**
 * 从动作中获取目标列表
 */
export const getTargetsFromAction = (
    characters: MonsterSprite[] | undefined,
    action: any,
    findTargetByIdentifierFn: (identifier: CharacterIdentifier, excludeBoss?: boolean) => MonsterSprite | undefined
): MonsterSprite[] => {
    const targets: MonsterSprite[] = [];
    if (action.target) {
        const target = findTargetByIdentifierFn(action.target as CharacterIdentifier, true);
        if (target) targets.push(target);
    } else if (action.targets?.length) {
        action.targets.forEach((id: CharacterIdentifier) => {
            const target = findTargetByIdentifierFn(id, true);
            if (target) targets.push(target);
        });
    }
    return targets;
};

