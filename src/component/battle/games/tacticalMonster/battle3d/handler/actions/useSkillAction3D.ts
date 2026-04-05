/**
 * 3D 技能使用操作 - 与 2D 逻辑一致，不依赖 DOM 视觉反馈（无 container 亮度/缩放）
 */

import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import { api } from "../../../../../../../convex/tacticalMonster/convex/_generated/api";
import type { UseSkillResponse } from "../../../types/backendResponseTypes";
import type { MonsterSprite } from "../../../types/CombatTypes";
import type { SkillSyncState } from "../../../types/skillTypes";
import { createCharacterIdentifiers } from "../../../utils/characterUtils";
import { canPerformAction } from "../../../utils/validationUtils";
import type { PedagogyGuideNotifyEvent } from "../../../utils/pedagogyGuideFlow";

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
    calculateActionScore: (params: any) => number,
    /** 与教学 guideFlow 同步；未先点技能栏时会在 useSkill 前补 selectSkill */
    onPedagogyNotify?: (event: PedagogyGuideNotifyEvent) => void,
    /** 自动补 selectSkill 被后端拒绝时（与面板选技失败共用提示） */
    onSelectSkillRejected?: (message: string) => void
) => {
    const useSkill = useCallback(
        async (skillId: string, target?: MonsterSprite) => {
            const validation = canPerformAction(mode, game, characters);
            if (!validation.can || !validation.character) return;
            const { character } = validation;
            if (!game?.currentRound) return;

            const currentTurn = game.currentRound.turns?.find((t: any) => t.status === 1);
            if (currentTurn && (currentTurn as any).skillSelect !== skillId && game.gameId) {
                try {
                    const res = await convex.mutation((api as any).service.game.gameService.selectSkill, {
                        gameId: game.gameId,
                        data: { skillId },
                    });
                    if (res?.ok === false) {
                        const msg = res?.error ?? "选择技能失败";
                        console.error("Select skill (auto) rejected", msg);
                        onSelectSkillRejected?.(msg);
                        return;
                    }
                    onPedagogyNotify?.({ type: "skillSelect", skillId });
                } catch (e) {
                    console.error("Select skill (auto) failed", e);
                    return;
                }
            }

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
            onPedagogyNotify,
            onSelectSkillRejected,
        ]
    );

    return { useSkill };
};
