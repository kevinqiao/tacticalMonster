/**
 * 其他操作 Hook（选择技能、攻击、防御、待机、投降）
 */

import { useCallback } from "react";
import { api } from "../../../../../../../convex/tacticalMonster/convex/_generated/api";
import { useGameSettings } from "../../../battle/hooks/useGameSettings";
import { useCombatManager } from "../../../service/CombatManager";
import { GameModel, MonsterSprite } from "../../../types/CombatTypes";
import { MonsterSkill } from "../../../types/skillTypes";
import { applyStateChanges } from "../../../utils/backendResponseUtils";
import { offsetHexDistance } from "../../../utils/hexUtil";
import { getMeleePossiblePositions } from "../../../utils/positionEvaluator";
import { resolveAttackProfile } from "../../../utils/skillRangeUtils";
import { canPerformAction } from "../../../utils/validationUtils";

const getRemainingSteps = (character: MonsterSprite, currentTurn: any): number => {
    const totalMoveRange = character.move_range || 3;
    return Math.max(0, totalMoveRange - (currentTurn.stepsUsed ?? 0));
};


/**
 * 其他操作
 */
export const useOtherAction3D = (
    game: GameModel | null,
    characters: any[],
    mode: string,
    convex: any,
    user: any,
    playSkillSelect: (data: any, onComplete: () => void) => void,
    openModal: (modalType: string, data?: any) => void,
    useSkill: (skillId: string, target?: MonsterSprite) => Promise<void>,
    walkAndAttack: (to: { q: number; r: number }, skillId: string, target: MonsterSprite) => Promise<void>,
    groundCells: any[][],
    handlePhaseChanges: (phaseChanges: any) => Promise<void>,
    /** 后端拒绝 selectSkill 时提示（与技能释放失败共用 toast） */
    onSelectSkillRejected?: (message: string) => void
) => {
    const { settings } = useGameSettings();
    const { updateRuntimeGame } = useCombatManager();
    const selectSkill = useCallback(async (skill: MonsterSkill) => {
        const validation = canPerformAction(mode, game, characters);
        if (!validation.can || !validation.currentTurn) return;

        const payload = {
            uid: validation.currentTurn.uid,
            character_id: validation.currentTurn.character_id,
            skillId: skill.id,
        };

        if (!game) return;
        try {
            // 必须先等后端确认：否则会先走 playSkillSelect → clearAll()，拒绝后行走/普攻高亮无法恢复
            const res = await convex.mutation((api as any).service.game.gameService.selectSkill, {
                gameId: game.gameId,
                data: {
                    skillId: skill.id,
                },
            });
            if (res?.ok === false) {
                const msg = res?.error ?? "选择技能失败";
                console.error("Select skill rejected", msg);
                onSelectSkillRejected?.(msg);
                return;
            }
            // 订阅可能晚于下一次点击：立刻写入当前回合 skillSelect，避免格子点击仍走 attack→basic_attack
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
            playSkillSelect(payload, () => {});
            // 订阅更新后可能触发重绘；再应用一次高亮，避免首帧被清空或友方目标列表曾为空
            playSkillSelect(payload, () => {});
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
                    await handlePhaseChanges(phaseChanges);
                } catch (phaseErr) {
                    console.error("Standby: handlePhaseChanges failed", phaseErr);
                }
            }
        } catch (error) {
            console.error("Standby failed", error);
        }
    }, [mode, game, characters, convex, handlePhaseChanges]);

    const defend = useCallback(async () => {
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
            const result = await convex.mutation((api as any).service.game.gameService.defend, {
                gameId: game.gameId,
                identifier,
            });
            if (result?.ok && result.phaseChanges) {
                const phaseChanges = result.phaseChanges;
                if (phaseChanges.stateChanges) {
                    applyStateChanges(phaseChanges.stateChanges, characters);
                }
                try {
                    await handlePhaseChanges(phaseChanges);
                } catch (phaseErr) {
                    console.error("Defend: handlePhaseChanges failed", phaseErr);
                }
            }
        } catch (error) {
            console.error("Defend failed", error);
        }
    }, [mode, game, characters, convex, handlePhaseChanges]);

    const surrender = useCallback(async () => {
        // watch/replay 模式：禁止操作
        if (mode === 'watch' || mode === 'replay') return;
        if (!game || !user?.uid) return;
        console.log("surrender...");
        openModal("game_over", { gameId: game.gameId });
        // try {
        //     const result = await convex.action((api as any).service.tournament.tournamentService.surrender, {
        //         uid: user.uid,
        //         gameId: game.gameId,
        //     });
        //     if (result.ok) openModal("game_over", { gameId: game.gameId });
        // } catch (error) {
        //     console.error("Surrender failed", error);
        // }
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
                await walkAndAttack(selectedPosition, skillId, target);
            } catch (error) {
                console.error("Move and attack failed:", error);
            }
        }
    }, [game, mode, characters, useSkill, walkAndAttack, groundCells, settings]);

    return {
        selectSkill,
        standBy,
        defend,
        surrender,
        attack,
        positionSelectionUI: null
    };
};

