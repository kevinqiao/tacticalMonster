/**
 * 技能使用操作 Hook
 * 方案1：乐观UI + 悲观状态
 * - 立即播放动画（乐观UI）
 * - 等待后端响应后应用状态变化（悲观状态）
 * - 移除乐观执行、状态快照、回滚机制
 */

import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import { api } from "../../../../../../../../convex/tacticalMonster/convex/_generated/api";
import { UseSkillResponse } from "../../../../types/backendResponseTypes";
import { MonsterSprite } from "../../../../types/CombatTypes";
import { SkillSyncState } from "../types";
import { createCharacterIdentifiers } from "../utils/characterUtils";
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
        if (!validation.can || !validation.character) return;

        const { character } = validation;
        if (!game?.currentRound) return;

        const { casterIdentifier, targetIdentifiers } = createCharacterIdentifiers(characters, character, target);

        applyVisualFeedback(character, target);

        // ✅ 方案1：立即播放动画（乐观UI）
        const activeSkillTimeline = playSkill(character, skillId, target ? [target] : [], () => {
            clearVisualFeedback(character, target);
            setSkillSyncState(prev => prev ? {
                ...prev,
                animationCompleted: true,
                activeSkillTimeline: activeSkillTimeline || prev.activeSkillTimeline || undefined
            } : null);
        });

        // 设置同步状态（等待后端响应）
        setSkillSyncState({
            animationCompleted: false,
            backendResponse: null,
            activeSkillTimeline: activeSkillTimeline || undefined,
            character,
            target,
            skillId
        });

        // ✅ 方案1：发送后端请求，等待响应后应用状态变化（悲观状态）
        const backendRequestPromise = convex.mutation((api as any).service.game.gameService.useSkill, {
            gameId: game.gameId,
            data: {
                ...casterIdentifier,
                skillId,
                targets: targetIdentifiers.length > 0 ? targetIdentifiers : undefined
            }
        });

        backendRequestPromise
            .then((response: UseSkillResponse) => {
                setSkillSyncState(prev => prev ? { ...prev, backendResponse: response } : null);
            })
            .catch((error: any) => {
                console.error("Use skill failed", error);

                // ✅ 方案1：网络错误时，如果动画还在播放，尝试停止
                // 注意：这里无法访问 activeSkillTimeline，所以错误处理主要在 useSkillSync 中
                // 但如果动画还未完成，我们可以立即清理状态，让 useSkillSync 处理
                setSkillSyncState(prev => {
                    if (prev) {
                        // 如果动画还在播放，保留状态以便 useSkillSync 处理
                        return {
                            ...prev,
                            backendResponse: { ok: false, error: error.message || "网络错误" }
                        };
                    }
                    return null;
                });
            });
    }, [game, characters, mode, convex, playSkill, handlePhaseChanges, setSkillSyncState, calculateActionScore]);

    return { useSkill };
};

