/**
 * 技能使用操作 Hook
 */

import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import { api } from "../../../../../../../../convex/tacticalMonster/convex/_generated/api";
import { UseSkillResponse } from "../../../types/backendResponseTypes";
import { MonsterSprite } from "../../../types/CombatTypes";
import { OperationQueue } from "../../optimistic/OperationQueue";
import { OptimisticSkillExecutor } from "../../optimistic/OptimisticSkillExecutor";
import { StateSnapshot } from "../../optimistic/StateSnapshot";
import { SkillSyncState } from "../types";
import { createCharacterIdentifiers } from "../utils/characterUtils";
import { handleBackendError } from "../utils/errorUtils";
import { calculateKillScore } from "../utils/scoreUtils";
import { canPerformAction } from "../utils/validationUtils";
import { applyVisualFeedback, clearVisualFeedback } from "../utils/visualFeedbackUtils";

/**
 * 技能使用操作
 */
export const useSkillAction = (
    game: any,
    characters: any[],
    mode: string,
    convex: any,
    optimisticExecutor: OptimisticSkillExecutor | null,
    operationQueue: OperationQueue,
    playSkill: (
        caster: MonsterSprite,
        skillId: string,
        targets: MonsterSprite[],
        onComplete: () => void | Promise<void>
    ) => gsap.core.Timeline | null,
    handlePhaseChanges: (phaseChanges: any) => Promise<void>,
    setSkillSyncState: Dispatch<SetStateAction<SkillSyncState | null>>,
    calculateActionScore: (params: any) => number
) => {
    const useSkill = useCallback(async (skillId: string, target?: MonsterSprite) => {
        const validation = canPerformAction(mode, game, characters);
        if (!validation.can || !validation.character || !optimisticExecutor) return;

        const { character } = validation;
        if (!game?.currentRound) return;

        const { casterIdentifier, targetIdentifiers } = createCharacterIdentifiers(characters, character, target);
        const gameSeed = (game as any).boss?.behaviorSeed || `game_${game.gameId}`;
        const round = game.currentRound.no || 0;

        applyVisualFeedback(character, target);

        // 乐观执行（内部会创建状态快照）
        let optimisticResult: any;
        let pendingUpdate: { snapshot: any; rollback: () => void } | null = null;

        try {
            const beforeHp = target ? (target.stats?.hp?.current || 0) : 0;
            optimisticResult = await optimisticExecutor.executeOptimistically(
                skillId,
                character,
                target ? [target] : [],
                gameSeed,
                round
            );

            // 使用乐观执行返回的快照创建回滚函数
            pendingUpdate = {
                snapshot: optimisticResult.snapshot,
                rollback: () => {
                    if (optimisticResult.snapshot) {
                        StateSnapshot.restoreSnapshot(game, optimisticResult.snapshot);
                    }
                }
            };

            if (optimisticResult.result.success && target) {
                const afterHp = target.stats?.hp?.current || 0;
                calculateKillScore(characters, target, beforeHp, afterHp, skillId, calculateActionScore);
            }

            const backendRequestPromise = convex.mutation((api as any).service.game.gameService.useSkill, {
                gameId: game.gameId,
                data: {
                    ...casterIdentifier,
                    skillId,
                    targets: targetIdentifiers.length > 0 ? targetIdentifiers : undefined
                }
            });

            // 先播放主动技能动画，获取 timeline
            const activeSkillTimeline = playSkill(character, skillId, target ? [target] : [], () => {
                clearVisualFeedback(character, target);
                setSkillSyncState(prev => prev ? {
                    ...prev,
                    animationCompleted: true,
                    activeSkillTimeline: activeSkillTimeline || prev.activeSkillTimeline || undefined
                } : null);
            });

            // 设置同步状态（包含 activeSkillTimeline，它同时作为主 timeline）
            setSkillSyncState({
                animationCompleted: false,
                backendResponse: null,
                operationId: optimisticResult.operationId,
                activeSkillTimeline: activeSkillTimeline || undefined,
                pendingUpdate,
                optimisticResult,
                character,
                target,
                skillId
            });

            backendRequestPromise
                .then((response: UseSkillResponse) => {
                    setSkillSyncState(prev => prev ? { ...prev, backendResponse: response } : null);
                })
                .catch((error: any) => {
                    if (pendingUpdate && optimisticResult) {
                        handleBackendError(error, pendingUpdate, optimisticResult.operationId, operationQueue);
                    }
                    setSkillSyncState(null);
                });
        } catch (error) {
            console.error("Use skill failed", error);
            if (pendingUpdate) {
                pendingUpdate.rollback();
            }
        }
    }, [game, characters, mode, convex, optimisticExecutor, operationQueue, playSkill, handlePhaseChanges, setSkillSyncState, calculateActionScore]);

    return { useSkill };
};

