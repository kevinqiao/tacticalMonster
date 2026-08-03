/**
 * Boss AI 动作处理 Hook
 */

import { useCallback } from "react";
import { MonsterSprite } from "../../types/CombatTypes";
import { findPath, isCellPassableForMovement } from "../../utils/PathFind";
import { CharacterIdentifier } from "../../utils/typeAdapter";

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
    // 执行移动动画（grid 需含 walkable，无则从 disable + 占用格推导）
    const executeMoveAnimation = useCallback((
        character: MonsterSprite,
        position: { q: number; r: number },
        onStateUpdate?: () => void
    ) => {
        if (!game || !gridCells || !characters) return;

        const from = { q: character.q ?? 0, r: character.r ?? 0 };
        const to = { q: position.q, r: position.r };
        const canIgnoreObstacles = character.canIgnoreObstacles ?? character.isFlying ?? false;
        const walkGrid = gridCells.map((row: any[]) =>
            row.map((cell: any) => {
                const occupied = characters.some(
                    (c) =>
                        c.q === cell.q &&
                        c.r === cell.r &&
                        !(c.uid === character.uid && (c as any).character_id === (character as any).character_id)
                );
                const walkable = isCellPassableForMovement(cell, canIgnoreObstacles, occupied);
                return { q: cell.q, r: cell.r, walkable };
            })
        );
        const path = findPath(walkGrid, from, to, canIgnoreObstacles);

        if (path && path.length > 0) {
            playWalk(character, path, () => {
                character.q = position.q;
                character.r = position.r;
                if (onStateUpdate) onStateUpdate();
            });
        } else if (onStateUpdate) {
            onStateUpdate();
        }
    }, [game, gridCells, characters, playWalk]);

    const executeMoveAnimationAsync = useCallback(
        (character: MonsterSprite, position: { q: number; r: number }) => {
            return new Promise<void>((resolve) => {
                executeMoveAnimation(character, position, () => resolve());
            });
        },
        [executeMoveAnimation]
    );

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

    const executeSkillAnimationAsync = useCallback(
        (caster: MonsterSprite, skillId: string, targets: MonsterSprite[]) => {
            return new Promise<void>((resolve) => {
                executeSkillAnimation(caster, skillId, targets, () => resolve());
            });
        },
        [executeSkillAnimation]
    );

    // 处理Boss AI动作（支持传入 turnStart + character，避免 game.boss.bossId 缺失导致找不到角色）
    const handleBossAIAction = useCallback(async (bossAIAction: any) => {
        if (!bossAIAction?.decision || !characters || !game) return;

        const { turnStart, character: passedCharacter, decision, executionResults } = bossAIAction;
        const actingCharacter =
            passedCharacter ??
            (turnStart?.character_id && characters.find((c) => (c as any).character_id === turnStart.character_id)) ??
            ((game as any).boss?.bossId != null &&
                characters.find((c) => c.uid === "boss" && (c as any).character_id === (game as any).boss.bossId));
        if (!actingCharacter) return;

        const isMinion = (game as any).boss?.bossId != null && turnStart?.character_id !== (game as any).boss.bossId;
        const action = isMinion
            ? decision.minionActions?.find((m: any) => m.minionId === turnStart?.character_id)?.action
            : decision.bossAction;
        if (!action || action.type === "standby") return;

        if (action.type === "move" && action.position) {
            await executeMoveAnimationAsync(actingCharacter, action.position);
        } else if (action.type === "attack" && action.target) {
            const target = findTargetByIdentifierFn(action.target as CharacterIdentifier, true);
            if (target) {
                await executeSkillAnimationAsync(
                    actingCharacter,
                    (actingCharacter as any).selectedSkill || "basic_attack",
                    [target]
                );
            }
        } else if (action.type === "use_skill" && action.skillId) {
            const targets = getTargetsFromActionFn(action);
            if (targets.length > 0) {
                await executeSkillAnimationAsync(actingCharacter, action.skillId, targets);
            }
        }

        if (!isMinion && decision.minionActions?.length && executionResults?.minions) {
            for (const minionAction of decision.minionActions) {
                if (minionAction.action.type === "standby") continue;
                const minion = characters.find((c) => c.uid === "boss" && (c as any).character_id === minionAction.minionId);
                if (!minion) continue;
                const ma = minionAction.action;
                if (ma.type === "move" && ma.position) {
                    await executeMoveAnimationAsync(minion, ma.position);
                } else if (ma.type === "attack" && ma.target) {
                    const target = findTargetByIdentifierFn(ma.target as CharacterIdentifier, true);
                    if (target) {
                        await executeSkillAnimationAsync(minion, (minion as any).selectedSkill || "basic_attack", [target]);
                    }
                }
            }
        }
    }, [characters, game, findTargetByIdentifierFn, executeMoveAnimationAsync, executeSkillAnimationAsync, getTargetsFromActionFn]);

    return { handleBossAIAction };
};

