/**
 * 3D 技能选择：计算 attackables 并同步 gridState 高亮（与 usePlayPhase3D.playTurnOn 一致），
 * 否则选技后格子仍为 normal，handleCellClick 无法进入施法。
 */

import { useCallback } from "react";
import { SKILL_CONFIGS } from "../../config/skillConfigs";
import { useCombatManager } from "../../service/CombatManager";
import type { MonsterSprite } from "../../types/CombatTypes";
import type { UseBattleGridStateReturn } from "../handler/useBattleGridState";
import { getAttackableNodes } from "../../utils/PathFind";
import { getSkillPreviewTargetCandidates } from "../../utils/skillRangeUtils";

export const usePlaySkillSelect3D = (gridState: UseBattleGridStateReturn | null) => {
    const { characters, groundCells, game } = useCombatManager();
    const { map, currentRound } = game || {};

    const playSkillSelect = useCallback(
        (skillSelect: { skillId: string; uid: string; character_id: string }, onComplete: () => void | Promise<void>) => {
            if (!characters || !groundCells || !map || !currentRound) return;
            const { character_id, skillId } = skillSelect;
            const character = characters.find((c) => c.character_id === character_id);
            if (!character) return;
            const currentTurn = currentRound.turns.find((t) => t.status === 1 && t.character_id === character_id) ?? null;
            if (!currentTurn) return;
            const moveRange = character.move_range ?? 2;
            const remainingSteps = Math.max(0, moveRange - (currentTurn.stepsUsed ?? 0));
            const isFlying = character.isFlying ?? false;
            const canIgnoreObstacles = character.canIgnoreObstacles ?? isFlying;

            const skill = SKILL_CONFIGS[skillId] ?? null;
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

            const targetCandidates = getSkillPreviewTargetCandidates(
                character as Pick<MonsterSprite, "uid" | "character_id" | "q" | "r">,
                characters as Pick<MonsterSprite, "uid" | "character_id" | "q" | "r">[],
                skill
            );

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
                targetCandidates,
                skill,
                canIgnoreObstacles
            );
            character.attackables = attackableNodes;

            if (gridState) {
                gridState.clearAll();
                const attackableCells = attackableNodes.map((n) => ({ q: n.q, r: n.r }));
                if (attackableCells.length > 0) {
                    gridState.highlightAttackable(attackableCells);
                }
                gridState.setSelected({ q: character.q ?? 0, r: character.r ?? 0 });
            }

            const result = onComplete();
            if (result instanceof Promise) {
                result.catch((err) => console.error("onComplete error:", err));
            }
        },
        [characters, groundCells, map, currentRound, gridState]
    );

    return { playSkillSelect };
};
