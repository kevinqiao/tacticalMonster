/**
 * Play/Watch 模式：当前 turn UI 显示处理
 * 用于已存在的游戏中，如果当前是玩家 turn，显示可移动范围和可攻击目标
 * 
 * 职责：
 * - 检查当前游戏状态中是否有玩家 turn（status === 1）
 * - 如果存在，显示可移动范围和可攻击目标 UI
 * - 避免重复显示（使用 ref 记录已显示的 turn）
 * 
 * 注意：
 * - 在 play 模式下执行（显示可移动范围和可攻击目标）
 * - 在 watch 模式下执行（显示可移动范围和可攻击目标，但用户不能操作）
 * - 如果 initialPhaseChanges 存在，说明是新创建的游戏，会通过 usePhaseChangesHandler 处理，跳过
 * - 只在已存在的游戏中需要此处理
 */

import { useEffect, useRef } from "react";
import usePlayPhase from "../../../animation/usePlayPhase";
import { useCombatManager } from "../../CombatManager";

export const useCurrentTurnHandler = () => {
    const { game, mode, characters, groundCells, initialPhaseChanges } = useCombatManager();
    const { playTurnOn } = usePlayPhase();
    const displayedCurrentTurnRef = useRef<string | null>(null); // 记录已显示的 turn ID

    useEffect(() => {
        // 只在 play 和 watch 模式下执行
        if (mode !== 'play' && mode !== 'watch') return;

        // 如果 initialPhaseChanges 存在，说明是新创建的游戏，会通过 usePhaseChangesHandler 处理
        // 新创建的游戏会在 handlePhaseChanges 中处理 turnStart，这里跳过
        if (initialPhaseChanges) return;

        // 检查必要的资源是否已加载
        if (!game || !game.currentRound || !characters || !groundCells) return;

        // ✅ 查找当前玩家 turn（status === 1 且 uid !== "boss"）
        const currentTurn = game.currentRound.turns.find(
            (t) => t.status === 1 && t.uid !== "boss"
        );

        // 如果没有找到当前玩家 turn，跳过
        if (!currentTurn) return;

        // 生成 turn 的唯一标识符
        const turnId = `${currentTurn.uid}_${currentTurn.monsterId}_${currentTurn.status}`;

        // 如果已经显示过这个 turn，跳过（避免重复显示）
        if (displayedCurrentTurnRef.current === turnId) return;

        // 查找对应的角色
        const character = characters.find(
            (c) => c.uid === currentTurn.uid && c.monsterId === currentTurn.monsterId
        );

        // 如果找不到角色，跳过
        if (!character) return;

        // 标记为已显示
        displayedCurrentTurnRef.current = turnId;

        // ✅ 显示 UI 状态（可移动范围、可攻击目标）
        // 延迟一点时间，确保资源已完全加载（地图、角色等）
        const timer = setTimeout(() => {
            playTurnOn(currentTurn, () => {
                console.log("Current turn UI displayed for existing game, waiting for player action");
            });
        }, 300);

        return () => {
            clearTimeout(timer);
        };
    }, [mode, game, characters, groundCells, playTurnOn, initialPhaseChanges]);
};
