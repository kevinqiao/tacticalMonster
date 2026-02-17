/**
 * 验证工具函数
 */

import { MonsterSprite } from "../../../types/CombatTypes";

/**
 * 验证是否可以执行操作
 */
export const canPerformAction = (
    mode: string,
    game: any,
    characters: MonsterSprite[] | undefined
): { can: boolean; currentTurn?: any; character?: MonsterSprite } => {
    if (mode === 'watch' || mode === 'replay') return { can: false };
    if (!game?.currentRound || !characters) return { can: false };

    const currentTurn = game.currentRound.turns.find(
        (t: any) => t.status === 1
    );
    if (!currentTurn || currentTurn.uid === "boss") return { can: false };

    const character = characters.find(
        c => c.monsterId === currentTurn.monsterId && c.uid === currentTurn.uid
    );
    if (!character) return { can: false };

    console.log("[canPerformAction] ✅ character:", {
        monsterId: character.monsterId,
        uid: character.uid,
        q: character.q,
        r: character.r,
        hasRef3D: !!character.ref3D,
        ref3DGroupCurrent: !!character.ref3D?.groupRef?.current,
    });

    return { can: true, currentTurn, character };
};
