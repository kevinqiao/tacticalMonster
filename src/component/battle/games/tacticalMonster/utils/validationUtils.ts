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
): { can: boolean; currentTurn?: any; character?: MonsterSprite; reason?: string } => {
    if (mode === "watch" || mode === "replay") {
        return { can: false, reason: `mode=${mode}` };
    }
    if (!game?.currentRound) {
        return { can: false, reason: "game.currentRound is missing" };
    }
    if (!characters?.length) {
        return { can: false, reason: "characters is empty" };
    }

    const currentTurn = game.currentRound.turns.find(
        (t: any) => t.status === 1
    );
    if (!currentTurn) {
        return { can: false, reason: "no active turn (status=1)" };
    }
    if (currentTurn.uid === "boss") {
        return { can: false, currentTurn, reason: "current active turn is boss" };
    }

    const turnActorId =
        currentTurn.character_id ??
        currentTurn.monsterId ??
        currentTurn.bossId ??
        currentTurn.minionId;
    let character = characters.find((c) => (c as any).character_id === turnActorId);
    if (!character && turnActorId) {
        character = characters.find((c) => (c as any).monsterId === turnActorId);
    }
    if (!character) {
        return { can: false, currentTurn, reason: `active turn character not found: ${String(turnActorId)}` };
    }



    return { can: true, currentTurn, character };
};
