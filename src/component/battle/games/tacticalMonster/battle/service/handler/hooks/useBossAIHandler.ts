/**
 * Boss AI 动作处理 Hook
 */

import { useCallback } from "react";
import { MonsterSprite } from "../../../../types/CombatTypes";
import { findPath } from "../../../utils/PathFind";
import { CharacterIdentifier } from "../../../utils/typeAdapter";

/**
 * Boss AI 动作处理
 */
export const useBossAIHandler = (
    characters: MonsterSprite[] | undefined,
    game: any,
    gridCells: any[][],
    playWalk: (character: MonsterSprite, path: Array<{ q: number; r: number }>, onComplete: () => void | Promise<void>) => void,
    playSkill: (
        caster: MonsterSprite,
        skillId: string,
        targets: MonsterSprite[],
        onComplete: () => void | Promise<void>
    ) => gsap.core.Timeline | null,
    findTargetByIdentifierFn: (identifier: CharacterIdentifier, excludeBoss?: boolean) => MonsterSprite | undefined,
    getTargetsFromActionFn: (action: any) => MonsterSprite[]
    // ✅ 移除 mode 参数，不再需要（所有状态更新都通过 GSAP 直接更新 DOM）
) => {
    // 执行移动动画
    const executeMoveAnimation = useCallback((
        character: MonsterSprite,
        position: { q: number; r: number },
        onStateUpdate?: () => void
    ) => {
        if (!game || !gridCells) return;

        const col = game.map.direction === 1 ? game.map.cols - position.q - 1 : position.q;
        const path = findPath(
            gridCells,
            { q: character.q ?? 0, r: character.r ?? 0 },
            { q: col, r: position.r },
            character.isFlying ?? false
        );

        if (path) {
            playWalk(character, path, () => {
                character.q = col;
                character.r = position.r;
                // ✅ 动画完成后更新状态（如果有回调）
                if (onStateUpdate) {
                    onStateUpdate();
                }
            });
        } else if (onStateUpdate) {
            // 如果没有路径，立即调用回调
            onStateUpdate();
        }
    }, [game, gridCells, playWalk]);

    // 执行技能动画
    const executeSkillAnimation = useCallback((
        caster: MonsterSprite,
        skillId: string,
        targets: MonsterSprite[],
        onStateUpdate?: () => void
    ) => {
        const timeline = playSkill(caster, skillId, targets, () => {
            // ✅ 动画完成后更新状态（如果有回调）
            if (onStateUpdate) {
                onStateUpdate();
            }
        });
        // 如果没有 timeline（动画未触发），立即调用回调
        if (!timeline && onStateUpdate) {
            onStateUpdate();
        }
    }, [playSkill]);

    // 处理Boss AI动作
    const handleBossAIAction = useCallback(async (bossAIAction: any) => {
        if (!bossAIAction?.decision || !characters || !game) return;

        const { decision, executionResults } = bossAIAction;
        const { bossId } = (game as any).boss || {};
        const bossCharacter = characters.find(c => c.uid === "boss" && c.character_id === bossId);
        if (!bossCharacter) return;

        // ✅ 辅助函数：根据 identifier 查找角色
        // const findCharacterByIdentifier = (identifier: any): MonsterSprite | undefined => {
        //     if (identifier.bossId) {
        //         return characters.find(c => c.uid === "boss" && c.character_id === identifier.bossId);
        //     } else if (identifier.minionId) {
        //         return characters.find(c => c.uid === "boss" && c.character_id === identifier.minionId);
        //     } else if (identifier.monsterId) {
        //         return characters.find(c => c.uid !== "boss" && c.monsterId === identifier.monsterId);
        //     }
        //     return undefined;
        // };

        // ✅ 不再手动更新 characters 状态，所有状态更新都通过直接修改对象（GSAP）实现
        // 状态更新现在由 handlePhaseChanges 统一处理（直接修改 charactersRef 中的对象并通过 GSAP 更新 DOM）
        // 这里只负责播放动画，状态更新会在 handlePhaseChanges 中统一处理

        // 处理Boss动作
        const { bossAction } = decision;

        if (bossAction.type === "move" && bossAction.position) {
            executeMoveAnimation(bossCharacter, bossAction.position, () => {
                // ✅ 方案1：状态更新由 handlePhaseChanges 统一处理，这里只播放动画
            });
        } else if (bossAction.type === "attack" && bossAction.target) {
            const target = findTargetByIdentifierFn(bossAction.target as CharacterIdentifier, true);
            if (target) {
                executeSkillAnimation(bossCharacter, bossCharacter.selectedSkill || "basic_attack", [target], () => {
                    // ✅ 方案1：状态更新由 handlePhaseChanges 统一处理，这里只播放动画
                });
            }
        } else if (bossAction.type === "use_skill" && bossAction.skillId) {
            const targets = getTargetsFromActionFn(bossAction);
            if (targets.length > 0) {
                executeSkillAnimation(bossCharacter, bossAction.skillId, targets, () => {
                    // ✅ 方案1：状态更新由 handlePhaseChanges 统一处理，这里只播放动画
                });
            }
        }

        // 处理小怪动作
        if (decision.minionActions?.length && executionResults?.minions) {
            decision.minionActions.forEach((minionAction: any) => {
                if (minionAction.action.type === "standby") {
                    // ✅ 待命动作，只播放动画（如果有），状态更新由 handlePhaseChanges 统一处理
                    return;
                }

                const minion = characters.find(c => c.uid === "boss" && c.character_id === minionAction.minionId);
                if (!minion) return;

                if (minionAction.action.type === "move" && minionAction.action.position) {
                    executeMoveAnimation(minion, minionAction.action.position, () => {
                        // ✅ 方案1：状态更新由 handlePhaseChanges 统一处理，这里只播放动画
                    });
                } else if (minionAction.action.type === "attack" && minionAction.action.target) {
                    const target = findTargetByIdentifierFn(minionAction.action.target as CharacterIdentifier, true);
                    if (target) {
                        executeSkillAnimation(minion, minion.selectedSkill || "basic_attack", [target], () => {
                            // ✅ 方案1：状态更新由 handlePhaseChanges 统一处理，这里只播放动画
                        });
                    }
                }
            });
        }
    }, [characters, game, findTargetByIdentifierFn, executeMoveAnimation, executeSkillAnimation, getTargetsFromActionFn]);

    return { handleBossAIAction };
};

