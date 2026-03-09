/**
 * 回合顺序条相关工具函数
 */

import type { MonsterSprite } from "../types/CombatTypes";
import type { GameTurn } from "../types/gameTypes";
import { findTargetByIdentifier } from "./characterUtils";

export const getTurnKey = (turn: GameTurn): string =>
    `${turn.uid}-${turn.character_id}-${turn.order ?? 0}`;

export const getCharacterForTurn = (
    characters: MonsterSprite[] | undefined,
    turn: GameTurn | undefined
): MonsterSprite | undefined => {
    if (!characters || !turn) return undefined;
    return characters.find((c) => c.character_id === turn.character_id);
};

/** 从 GameTurn 得到对应角色的 character_id（与 turn.character_id 一致） */
export function getCharacterIdFromTurn(
    _characters: MonsterSprite[] | undefined,
    turn: GameTurn | undefined
): string | undefined {
    return turn?.character_id;
}
