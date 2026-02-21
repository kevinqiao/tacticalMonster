/**
 * 3D 技能选择：仅计算并设置 attackables，无 2D DOM/GSAP 动画
 * 与 battle/animation/usePlaySkillSelect 同签名，供 useOtherActions 复用。
 */

import { useCallback } from "react";
import { COMMON_SKILLS } from "../../config/skillConfigs";
import { useCombatManager } from "../../service/CombatManager";
import { getAttackableNodes } from "../../utils/PathFind";

export const usePlaySkillSelect3D = () => {
    const { characters, groundCells, game } = useCombatManager();
    const { map, currentRound } = game || {};

    const playSkillSelect = useCallback(
        (skillSelect: { skillId: string; uid: string; monsterId: string }, onComplete: () => void | Promise<void>) => {
            if (!characters || !groundCells || !map || !currentRound) return;
            const { uid, monsterId, skillId } = skillSelect;
            const character = characters.find((c) => c.uid === uid && c.monsterId === monsterId);
            if (!character) return;
            const currentTurn = currentRound.turns.find(
                (t: { status: number; uid: string; monsterId: string }) =>
                    t.status === 1 && t.uid === uid && t.monsterId === monsterId
            ) ?? null;
            if (!currentTurn) return;
            const moveRange = character.move_range ?? 2;
            const remainingSteps = Math.max(0, moveRange - (currentTurn.stepsUsed ?? 0));
            const isFlying = character.isFlying ?? false;
            const canIgnoreObstacles = character.canIgnoreObstacles ?? isFlying;

            const skill = COMMON_SKILLS[skillId] ?? null;
            if (!skill) return;

            const grid = groundCells.map((row) =>
                row.map((cell) => {
                    const char =
                        character.q === cell.q && character.r === cell.r
                            ? null
                            : characters.find((c) => c.q === cell.q && c.r === cell.r);
                    return {
                        q: cell.q,
                        r: cell.r,
                        walkable: char ? false : !cell.disable,
                    };
                })
            );

            const enemies = characters
                .filter((c) => c.uid !== character.uid && c.character_id !== character.character_id)
                .map((c) => ({
                    uid: c.uid,
                    character_id: c.character_id,
                    q: c.q ?? 0,
                    r: c.r ?? 0,
                }));

            const attackableNodes = getAttackableNodes(
                grid,
                {
                    q: character.q ?? 0,
                    r: character.r ?? 0,
                    uid: character.uid,
                    character_id: character.character_id,
                    moveRange: remainingSteps,
                    attackRange: character.attack_range || { min: 1, max: 2 },
                },
                enemies,
                skill,
                canIgnoreObstacles
            );
            character.attackables = attackableNodes;
            const result = onComplete();
            if (result instanceof Promise) {
                result.catch((err) => console.error("onComplete error:", err));
            }
        },
        [characters, groundCells, map, currentRound]
    );

    return { playSkillSelect };
};
