/**
 * 回合顺序条相关工具函数
 */

import type { MonsterSprite } from "../types/CombatTypes";
import type { GameTurn } from "../types/gameTypes";
import { findTargetByIdentifier } from "./characterUtils";

export const getTurnKey = (turn: GameTurn): string =>
    `${turn.uid}-${turn.monsterId}-${turn.bossId ?? ""}-${turn.minionId ?? ""}-${turn.order ?? 0}`;

export const getCharacterForTurn = (
    characters: MonsterSprite[] | undefined,
    turn: GameTurn | undefined
): MonsterSprite | undefined => {
    if (!characters || !turn) return undefined;
    if (turn.bossId) {
        return findTargetByIdentifier(characters, { bossId: turn.bossId });
    }
    if (turn.minionId) {
        return findTargetByIdentifier(characters, { minionId: turn.minionId });
    }
    return characters.find((c) => c.uid === turn.uid && c.monsterId === turn.monsterId);
};

/**
 * 从 GameTurn 得到对应角色的 character_id。
 * - 有 bossId/minionId 时直接等于该字段；
 * - 玩家角色需用 characters 查找后取 .character_id。
 */
export function getCharacterIdFromTurn(
    characters: MonsterSprite[] | undefined,
    turn: GameTurn | undefined
): string | undefined {
    if (!turn) return undefined;
    if (turn.bossId) return turn.bossId;
    if (turn.minionId) return turn.minionId;
    const c = getCharacterForTurn(characters, turn);
    return c?.character_id;
}
