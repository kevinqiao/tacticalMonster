/**
 * 其他操作 Hook（选择技能、攻击、防御、待机、投降）
 */

import { useCallback, useState } from "react";
import { api } from "../../../../../../../../convex/tacticalMonster/convex/_generated/api";
import { MonsterSprite } from "../../../types/CombatTypes";
import { MonsterSkill } from "../../../types/skillTypes";
import { canPerformAction } from "../utils/validationUtils";
import { getSkillConfig } from "../../../config/skillConfigs";
import { hexDistance } from "../../../utils/hexUtil";
import { getPossiblePositions } from "../../../utils/positionEvaluator";
import { useGameSettings } from "../../../hooks/useGameSettings";
import { PositionSelectionUI } from "../../../view/PositionSelectionUI";

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
    useSkill: (skillId: string, target?: MonsterSprite) => Promise<void>,
    walk: (to: { q: number; r: number }) => Promise<void>,
    groundCells: any[][]
) => {
    const { settings } = useGameSettings();
    const [positionSelectionState, setPositionSelectionState] = useState<{
        positions: Array<{ q: number; r: number; score: number }>;
        character: MonsterSprite;
        target: MonsterSprite;
        skillId: string;
    } | null>(null);
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

    const attack = useCallback(async (target: MonsterSprite) => {
        const validation = canPerformAction(mode, game, characters);
        if (!validation.can || !validation.character || !game?.currentRound) return;

        const { character } = validation;
        
        // 获取当前选择的技能ID（默认使用第一个技能，通常是普通攻击）
        const skillId = character.selectedSkill || "basic_attack";
        
        // 获取技能配置，检查攻击范围
        const skillConfig = getSkillConfig(skillId);
        const attackRange = skillConfig?.range?.distance || 1;
        const moveRange = character.move_range || 3;
        
        // 计算距离
        const distance = hexDistance(
            { q: character.q, r: character.r },
            { q: target.q, r: target.r }
        );
        
        // 如果不在攻击范围内，需要移动
        if (distance > attackRange) {
            // 获取所有可能的移动位置（使用用户设置中的策略）
            const possiblePositions = getPossiblePositions(
                character,
                target,
                attackRange,
                moveRange,
                groundCells || [],
                characters || [],
                settings.autoMoveStrategy
            );
            
            if (possiblePositions.length === 0) {
                console.warn("Cannot find path to target");
                return;
            }
            
            // 根据用户设置选择位置
            if (settings.autoMove) {
                // 自动模式：选择评分最高的位置
                const selectedPosition = possiblePositions[0];
                
                try {
                    // 执行移动（等待移动动画和后端响应都完成）
                    await walk(selectedPosition);
                    
                    // 移动完成后，执行攻击
                    await useSkill(skillId, target);
                } catch (error) {
                    console.error("Move and attack failed:", error);
                    // 移动失败，不执行攻击
                }
            } else {
                // 手动模式：显示位置选择UI
                setPositionSelectionState({
                    positions: possiblePositions,
                    character,
                    target,
                    skillId
                });
            }
        } else {
            // 已在攻击范围内，直接攻击
            await useSkill(skillId, target);
        }
    }, [game, mode, characters, useSkill, walk, groundCells, settings]);
    
    // 处理位置选择
    const handlePositionSelect = useCallback(async (position: { q: number; r: number }) => {
        if (!positionSelectionState) return;
        
        const { character, target, skillId } = positionSelectionState;
        
        // 清除选择状态
        setPositionSelectionState(null);
        
        try {
            // 执行移动（等待移动动画和后端响应都完成）
            await walk(position);
            
            // 移动完成后，执行攻击
            await useSkill(skillId, target);
        } catch (error) {
            console.error("Move and attack failed:", error);
            // 移动失败，不执行攻击
        }
    }, [positionSelectionState, walk, useSkill]);
    
    // 处理取消选择
    const handlePositionCancel = useCallback(() => {
        setPositionSelectionState(null);
    }, []);

    return { 
        selectSkill, 
        standBy, 
        defend, 
        surrender, 
        attack,
        positionSelectionUI: positionSelectionState ? (
            <PositionSelectionUI
                positions={positionSelectionState.positions}
                character={positionSelectionState.character}
                target={positionSelectionState.target}
                gridCells={groundCells || []}
                onSelect={handlePositionSelect}
                onCancel={handlePositionCancel}
            />
        ) : null
    };
};

