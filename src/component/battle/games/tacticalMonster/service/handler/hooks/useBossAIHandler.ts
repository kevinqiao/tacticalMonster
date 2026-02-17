/**
 * Boss AI 动作处理 Hook
 */

import { useCallback } from "react";
import { MonsterSprite } from "../../../types/CombatTypes";
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
    // 执行移动动画（grid 需含 walkable，无则从 disable + 占用格推导）
    const executeMoveAnimation = useCallback((
        character: MonsterSprite,
        position: { q: number; r: number },
        onStateUpdate?: () => void
    ) => {
        if (!game || !gridCells || !characters) return;

        const from = { q: character.q ?? 0, r: character.r ?? 0 };
        const to = { q: position.q, r: position.r };
        const walkGrid = gridCells.map((row: any[]) =>
            row.map((cell: any) => {
                const occupied = characters.some(
                    (c) =>
                        c.q === cell.q &&
                        c.r === cell.r &&
                        !(c.uid === character.uid && (c as any).character_id === (character as any).character_id)
                );
                const walkable = (cell.walkable ?? !cell.disable) && !occupied;
                return { q: cell.q, r: cell.r, walkable };
            })
        );
        const path = findPath(walkGrid, from, to, character.isFlying ?? false);

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

    // 处理Boss AI动作（支持传入 turnStart + character，避免 game.boss.bossId 缺失导致找不到角色）
    const handleBossAIAction = useCallback(async (bossAIAction: any) => {
        if (!bossAIAction?.decision || !characters || !game) return;

        const { turnStart, character: passedCharacter, decision, executionResults } = bossAIAction;
        const actingCharacter =
            passedCharacter ??
            (turnStart?.bossId != null && characters.find((c) => (c as any).character_id === turnStart.bossId)) ??
            (turnStart?.minionId != null && characters.find((c) => (c as any).character_id === turnStart.minionId)) ??
            (turnStart?.uid === "boss" && turnStart?.monsterId != null &&
                characters.find((c) => c.uid === "boss" && c.monsterId === turnStart.monsterId)) ??
            ((game as any).boss?.bossId != null &&
                characters.find((c) => c.uid === "boss" && (c as any).character_id === (game as any).boss.bossId));
        if (!actingCharacter) return;

        const isMinion = turnStart?.minionId != null;
        const action = isMinion
            ? decision.minionActions?.find((m: any) => m.minionId === turnStart.minionId)?.action
            : decision.bossAction;
        if (!action || action.type === "standby") return;

        if (action.type === "move" && action.position) {
            executeMoveAnimation(actingCharacter, action.position, () => {});
        } else if (action.type === "attack" && action.target) {
            const target = findTargetByIdentifierFn(action.target as CharacterIdentifier, true);
            if (target) {
                executeSkillAnimation(
                    actingCharacter,
                    (actingCharacter as any).selectedSkill || "basic_attack",
                    [target],
                    () => {}
                );
            }
        } else if (action.type === "use_skill" && action.skillId) {
            const targets = getTargetsFromActionFn(action);
            if (targets.length > 0) {
                executeSkillAnimation(actingCharacter, action.skillId, targets, () => {});
            }
        }

        if (!isMinion && decision.minionActions?.length && executionResults?.minions) {
            decision.minionActions.forEach((minionAction: any) => {
                if (minionAction.action.type === "standby") return;
                const minion = characters.find((c) => c.uid === "boss" && (c as any).character_id === minionAction.minionId);
                if (!minion) return;
                const ma = minionAction.action;
                if (ma.type === "move" && ma.position) {
                    executeMoveAnimation(minion, ma.position, () => {});
                } else if (ma.type === "attack" && ma.target) {
                    const target = findTargetByIdentifierFn(ma.target as CharacterIdentifier, true);
                    if (target) {
                        executeSkillAnimation(minion, (minion as any).selectedSkill || "basic_attack", [target], () => {});
                    }
                }
            });
        }
    }, [characters, game, findTargetByIdentifierFn, executeMoveAnimation, executeSkillAnimation, getTargetsFromActionFn]);

    return { handleBossAIAction };
};

