/**
 * Boss AI 动作处理 Hook
 */

import { useCallback } from "react";
import { findPath } from "../../../utils/PathFind";
import { CharacterIdentifier } from "../../../utils/typeAdapter";
import { MonsterSprite } from "../../../types/CombatTypes";

/**
 * Boss AI 动作处理
 */
export const useBossAIHandler = (
    characters: MonsterSprite[] | undefined,
    game: any,
    gridCells: any[][],
    playWalk: (character: MonsterSprite, path: Array<{ x: number; y: number }>, onComplete: () => void) => void,
    playSkill: (
        caster: MonsterSprite,
        skillId: string,
        targets: MonsterSprite[],
        onComplete: () => void | Promise<void>
    ) => gsap.core.Timeline | null,
    findTargetByIdentifierFn: (identifier: CharacterIdentifier, excludeBoss?: boolean) => MonsterSprite | undefined,
    getTargetsFromActionFn: (action: any) => MonsterSprite[]
) => {
    // 执行移动动画
    const executeMoveAnimation = useCallback((character: MonsterSprite, position: { q: number; r: number }) => {
        if (!game || !gridCells) return;

        const col = game.map.direction === 1 ? game.map.cols - position.q - 1 : position.q;
        const path = findPath(
            gridCells,
            { x: character.q ?? 0, y: character.r ?? 0 },
            { x: col, y: position.r },
            character.isFlying ?? false
        );

        if (path) {
            playWalk(character, path, () => {
                character.q = col;
                character.r = position.r;
            });
        }
    }, [game, gridCells, playWalk]);

    // 执行技能动画
    const executeSkillAnimation = useCallback((
        caster: MonsterSprite,
        skillId: string,
        targets: MonsterSprite[]
    ) => {
        playSkill(caster, skillId, targets, () => { });
    }, [playSkill]);

    // 处理Boss AI动作
    const handleBossAIAction = useCallback(async (bossAIAction: any) => {
        if (!bossAIAction?.decision || !characters || !game) return;

        const { decision } = bossAIAction;
        const bossId = (game as any).boss?.bossId;
        const bossCharacter = characters.find(c => c.uid === "boss" && c.character_id === bossId);
        if (!bossCharacter) return;

        // 处理Boss动作
        const { bossAction } = decision;
        if (bossAction.type === "move" && bossAction.position) {
            executeMoveAnimation(bossCharacter, bossAction.position);
        } else if (bossAction.type === "attack" && bossAction.target) {
            const target = findTargetByIdentifierFn(bossAction.target as CharacterIdentifier, true);
            if (target) executeSkillAnimation(bossCharacter, bossCharacter.selectedSkill || "basic_attack", [target]);
        } else if (bossAction.type === "use_skill" && bossAction.skillId) {
            const targets = getTargetsFromActionFn(bossAction);
            if (targets.length > 0) executeSkillAnimation(bossCharacter, bossAction.skillId, targets);
        }

        // 处理小怪动作
        if (decision.minionActions?.length) {
            decision.minionActions.forEach((minionAction: any) => {
                if (minionAction.action.type === "standby") return;
                const minion = characters.find(c => c.uid === "boss" && c.character_id === minionAction.minionId);
                if (!minion) return;

                if (minionAction.action.type === "move" && minionAction.action.position) {
                    executeMoveAnimation(minion, minionAction.action.position);
                } else if (minionAction.action.type === "attack" && minionAction.action.target) {
                    const target = findTargetByIdentifierFn(minionAction.action.target as CharacterIdentifier, true);
                    if (target) executeSkillAnimation(minion, minion.selectedSkill || "basic_attack", [target]);
                }
            });
        }
    }, [characters, game, findTargetByIdentifierFn, executeMoveAnimation, executeSkillAnimation, getTargetsFromActionFn]);

    return { handleBossAIAction };
};

