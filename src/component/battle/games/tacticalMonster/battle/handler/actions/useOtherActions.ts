/**
 * 其他操作 Hook（选择技能、攻击、防御、待机、投降）
 */

import { useCallback } from "react";
import { api } from "../../../../../../../convex/tacticalMonster/convex/_generated/api";
import { useCombatManager } from "../../../service/CombatManager";
import { useGameSettings } from "../../../battle/hooks/useGameSettings";
import { GameModel, MonsterSprite } from "../../../types/CombatTypes";
import { MonsterSkill } from "../../../types/skillTypes";
import { offsetHexDistance } from "../../../utils/hexUtil";
import { findPath } from "../../../utils/PathFind";
import { getMeleePossiblePositions } from "../../../utils/positionEvaluator";
import { resolveAttackProfile } from "../../../utils/skillRangeUtils";
import { applyStateChanges } from "../../../utils/backendResponseUtils";
import { canPerformAction } from "../../../utils/validationUtils";

const getRemainingSteps = (character: MonsterSprite, currentTurn: any): number => {
    const totalMoveRange = character.move_range || 3;
    return Math.max(0, totalMoveRange - (currentTurn.stepsUsed ?? 0));
};

const buildAttackWalkGrid = (
    groundCells: any[][],
    characters: any[],
    self: MonsterSprite,
    target: MonsterSprite
) => {
    return groundCells.map((row: any[]) =>
        row.map((cell: any) => {
            const occupied = (characters || []).some((c: any) => {
                const isSelf = c.uid === self.uid && c.character_id === self.character_id;
                const isTarget = c.uid === target.uid && c.character_id === target.character_id;
                return c.q === cell.q && c.r === cell.r && !isSelf && !isTarget;
            });
            return {
                q: cell.q,
                r: cell.r,
                walkable: !cell.disable && !occupied,
            };
        })
    );
};

const canDirectMeleeAttack = (
    character: MonsterSprite,
    target: MonsterSprite,
    groundCells: any[][],
    characters: any[],
    attackRange: number
): boolean => {
    if (!groundCells || groundCells.length === 0) {
        // 缺少网格数据时，回退到几何距离判断
        return (
            offsetHexDistance(
                { q: character.q ?? 0, r: character.r ?? 0 },
                { q: target.q ?? 0, r: target.r ?? 0 }
            ) <= attackRange
        );
    }

    const canIgnoreObstacles = character.canIgnoreObstacles ?? character.isFlying ?? false;
    const walkGrid = buildAttackWalkGrid(groundCells, characters, character, target);
    const pathToTarget = findPath(
        walkGrid,
        { q: character.q ?? 0, r: character.r ?? 0 },
        { q: target.q ?? 0, r: target.r ?? 0 },
        canIgnoreObstacles,
        "attack_direct_check"
    );
    // path=[start,target] 表示邻接，可直接近战
    return pathToTarget.length > 1 && pathToTarget.length - 2 <= 0;
};

/**
 * 其他操作
 */
export const useOtherActions = (
    game: GameModel | null,
    characters: any[],
    mode: string,
    convex: any,
    user: any,
    playSkillSelect: (data: any, onComplete: () => void) => void,
    openModal: (modalType: string, data?: any) => void,
    useSkill: (skillId: string, target?: MonsterSprite) => Promise<void>,
    walk: (to: { q: number; r: number }) => Promise<void>,
    groundCells: any[][],
    onSelectSkillRejected?: (message: string) => void,
    handlePhaseChanges?: (phaseChanges: any) => Promise<void>
) => {
    const { settings } = useGameSettings();
    const { updateRuntimeGame } = useCombatManager();
    const selectSkill = useCallback(async (skill: MonsterSkill) => {
        const validation = canPerformAction(mode, game, characters);
        if (!validation.can || !validation.currentTurn) return;

        if (!game) return;
        try {
            const res = await convex.mutation((api as any).service.game.gameService.selectSkill, {
                gameId: game.gameId,
                data: {
                    skillId: skill.id
                }
            });
            if (res?.ok === false) {
                const msg = res?.error ?? "选择技能失败";
                console.error("Select skill rejected", msg);
                onSelectSkillRejected?.(msg);
                return;
            }
            const actorId = validation.currentTurn.character_id;
            if (updateRuntimeGame && actorId) {
                updateRuntimeGame((prev) => {
                    if (!prev?.currentRound?.turns) return prev;
                    const turns = prev.currentRound.turns.map((t: any) => {
                        if (t.status === 1 && t.character_id === actorId) {
                            return { ...t, skillSelect: skill.id };
                        }
                        return t;
                    });
                    return { ...prev, currentRound: { ...prev.currentRound, turns } };
                });
            }
            playSkillSelect(
                {
                    uid: validation.currentTurn.uid,
                    character_id: validation.currentTurn.character_id,
                    skillId: skill.id
                },
                () => { }
            );
        } catch (error) {
            console.error("Select skill failed", error);
        }
    }, [game, mode, characters, playSkillSelect, convex, onSelectSkillRejected, updateRuntimeGame]);

    const standBy = useCallback(async () => {
        if (mode === "watch" || mode === "replay") return;
        const validation = canPerformAction(mode, game, characters);
        if (!validation.can || !validation.currentTurn || !game) return;
        if (validation.currentTurn.uid === "boss") return;

        const identifier = (() => {
            const cid = validation.currentTurn.character_id ?? validation.currentTurn.monsterId;
            const bid = validation.currentTurn.bossId;
            const mid = validation.currentTurn.minionId;
            if (bid) return { bossId: bid };
            if (mid) return { minionId: mid };
            return { monsterId: cid };
        })();

        try {
            const result = await convex.mutation((api as any).service.game.gameService.standby, {
                gameId: game.gameId,
                identifier,
            });
            if (result?.ok && result.phaseChanges) {
                const phaseChanges = result.phaseChanges;
                if (phaseChanges.stateChanges) {
                    applyStateChanges(phaseChanges.stateChanges, characters);
                }
                try {
                    await handlePhaseChanges?.(phaseChanges);
                } catch (phaseErr) {
                    console.error("Standby: handlePhaseChanges failed", phaseErr);
                }
            }
        } catch (error) {
            console.error("Standby failed", error);
        }
    }, [mode, game, characters, convex, handlePhaseChanges]);

    const defend = useCallback(() => {
        if (mode === 'watch' || mode === 'replay') return;
    }, [mode]);

    const surrender = useCallback(async () => {
        // watch/replay 模式：禁止操作
        if (mode === 'watch' || mode === 'replay') return;
        if (!game || !user?.uid) return;

        try {
            const result = await convex.action((api as any).service.tournament.tournamentService.surrender, {
                gameId: game.gameId,
            });
            if (result.ok) openModal("game_over", { gameId: game.gameId });
        } catch (error) {
            console.error("Surrender failed", error);
        }
    }, [mode, game, user, convex, openModal]);

    const attack = useCallback(async (target: MonsterSprite) => {
        const validation = canPerformAction(mode, game, characters);
        console.log("attack validation", validation);
        if (!validation.can || !validation.character || !validation.currentTurn || !game?.currentRound) return;

        const { character, currentTurn } = validation;
        const { skillId, attackRange, isMelee } = resolveAttackProfile(
            character,
            (currentTurn as { skillSelect?: string }).skillSelect
        );
        const remainingSteps = getRemainingSteps(character, currentTurn);
        console.log("attack profile", { skillId, attackRange, isMelee });
        if (!isMelee) {
            // Braveland 风格：远程仅按当前站位判定，不执行“自动移动后攻击”
            const directRangedDistance = offsetHexDistance(
                { q: character.q ?? 0, r: character.r ?? 0 },
                { q: target.q ?? 0, r: target.r ?? 0 }
            );
            if (directRangedDistance <= attackRange) {
                await useSkill(skillId, target);
                return;
            }
            console.warn("Ranged target is out of current attack range");
            return;
        }

        const possiblePositions = getMeleePossiblePositions(
            character,
            target,
            attackRange,
            remainingSteps,
            groundCells || [],
            characters || [],
            settings.autoMoveStrategy,
            game?.map?.obstacles
        );

        if (possiblePositions.length === 0) {
            console.warn("Cannot find reachable melee position to attack target");
            return;
        }
        const isNeighbor = possiblePositions.some((pos) => pos.q === character.q && pos.r === character.r);
        if (isNeighbor) {
            await useSkill(skillId, target);
            return;
        } else {
            const selectedPosition = possiblePositions[0];
            try {
                await walk(selectedPosition);
                await useSkill(skillId, target);
            } catch (error) {
                console.error("Move and attack failed:", error);
            }
        }
    }, [game, mode, characters, useSkill, walk, groundCells, settings]);

    return {
        selectSkill,
        standBy,
        defend,
        surrender,
        attack,
        positionSelectionUI: null
    };
};

