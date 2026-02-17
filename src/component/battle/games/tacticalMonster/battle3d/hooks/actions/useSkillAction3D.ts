/**
 * 3D 技能使用操作 - 与 2D 逻辑一致，不依赖 DOM 视觉反馈（无 container 亮度/缩放）
 */

import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import { api } from "../../../../../../../convex/tacticalMonster/convex/_generated/api";
import type { SkillSyncState } from "../../../service/handler/types";
import { createCharacterIdentifiers } from "../../../service/handler/utils/characterUtils";
import { canPerformAction } from "../../../service/handler/utils/validationUtils";
import type { UseSkillResponse } from "../../../types/backendResponseTypes";
import type { MonsterSprite } from "../../../types/CombatTypes";

/**
 * 3D 技能使用：不调用 applyVisualFeedback/clearVisualFeedback（3D 角色无 container）
 */
export const useSkillAction3D = (
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
    const useSkill = useCallback(
        async (skillId: string, target?: MonsterSprite) => {
            const validation = canPerformAction(mode, game, characters);
            if (!validation.can || !validation.character) return;
            const { character } = validation;
            if (!game?.currentRound) return;

            const { casterIdentifier, targetIdentifiers } = createCharacterIdentifiers(
                characters,
                character,
                target
            );

            let activeSkillTimeline: gsap.core.Timeline | null = null;
            activeSkillTimeline = playSkill(character, skillId, target ? [target] : [], () => {
                setSkillSyncState((prev) =>
                    prev
                        ? {
                            ...prev,
                            animationCompleted: true,
                            activeSkillTimeline:
                                activeSkillTimeline || prev.activeSkillTimeline || undefined,
                        }
                        : null
                );
            });

            setSkillSyncState({
                animationCompleted: false,
                backendResponse: null,
                activeSkillTimeline: activeSkillTimeline || undefined,
                character,
                target,
                skillId,
            });

            const backendRequestPromise = convex.mutation(
                (api as any).service.game.gameService.useSkill,
                {
                    gameId: game.gameId,
                    data: {
                        ...casterIdentifier,
                        skillId,
                        targets: targetIdentifiers.length > 0 ? targetIdentifiers : undefined,
                    },
                }
            );

            backendRequestPromise
                .then((response: UseSkillResponse) => {
                    setSkillSyncState((prev) =>
                        prev ? { ...prev, backendResponse: response } : null
                    );
                })
                .catch((error: any) => {
                    console.error("Use skill failed", error);
                    setSkillSyncState((prev) =>
                        prev
                            ? {
                                ...prev,
                                backendResponse: {
                                    ok: false,
                                    error: error.message || "网络错误",
                                },
                            }
                            : null
                    );
                });
        },
        [
            game,
            characters,
            mode,
            convex,
            playSkill,
            handlePhaseChanges,
            setSkillSyncState,
            calculateActionScore,
        ]
    );

    return { useSkill };
};
