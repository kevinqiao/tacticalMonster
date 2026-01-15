/**
 * 其他操作 Hook（选择技能、攻击、防御、待机、投降）
 */

import { useCallback } from "react";
import { api } from "../../../../../../../../convex/tacticalMonster/convex/_generated/api";
import { MonsterSprite } from "../../../types/CombatTypes";
import { MonsterSkill } from "../../../types/skillTypes";
import { canPerformAction } from "../utils/validationUtils";

/**
 * 其他操作
 */
export const useOtherActions = (
    game: any,
    characters: any[],
    mode: string,
    convex: any,
    user: any,
    playSkillSelect: (data: any, onComplete: () => void) => void,
    openModal: (modalType: string, data?: any) => void,
    useSkill: (skillId: string, target?: MonsterSprite) => Promise<void>
) => {
    const selectSkill = useCallback(async (skill: MonsterSkill) => {
        const validation = canPerformAction(mode, game, characters);
        if (!validation.can || !validation.currentTurn) return;

        playSkillSelect(
            {
                uid: validation.currentTurn.uid,
                monsterId: validation.currentTurn.monsterId,
                skillId: skill.id
            },
            () => { }
        );

        if (!game) return;
        try {
            await convex.mutation((api as any).service.game.gameService.selectSkill, {
                gameId: game.gameId,
                data: {
                    skillId: skill.id
                }
            });
        } catch (error) {
            console.error("Select skill failed", error);
        }
    }, [game, mode, characters, playSkillSelect, convex]);

    const standBy = useCallback((character: MonsterSprite) => {
        // 待实现
    }, []);

    const defend = useCallback(() => {
        if (mode === 'watch' || mode === 'replay') return;
    }, [mode]);

    const surrender = useCallback(async () => {
        // watch/replay 模式：禁止操作
        if (mode === 'watch' || mode === 'replay') return;
        if (!game || !user?.uid) return;

        try {
            const result = await convex.action((api as any).service.tournament.tournamentService.surrender, {
                uid: user.uid,
                gameId: game.gameId,
            });
            if (result.ok) openModal("game_over", { gameId: game.gameId });
        } catch (error) {
            console.error("Surrender failed", error);
        }
    }, [mode, game, user, convex, openModal]);

    const attack = useCallback(async (character: MonsterSprite) => {
        const validation = canPerformAction(mode, game, characters);
        if (!validation.can || !game?.currentRound) return;

        // 获取当前选择的技能ID（默认使用第一个技能，通常是普通攻击）
        const skillId = character.selectedSkill;
        if (!skillId) return;

        // 调用 useSkill（动画会根据技能配置自动选择）
        await useSkill(skillId, character);
    }, [game, mode, characters, useSkill]);

    return { selectSkill, standBy, defend, surrender, attack };
};

