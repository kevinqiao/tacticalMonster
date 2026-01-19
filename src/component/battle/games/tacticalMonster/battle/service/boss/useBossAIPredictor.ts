/**
 * Boss AI预测执行Hook
 * 注意：Boss action 完全由后端执行，前端只进行预测（不执行乐观更新）
 * 预测结果仅用于显示或调试，不会修改游戏状态
 */

import { useCallback, useRef, useState } from "react";
import { GameModel, MonsterSprite } from "../../types/CombatTypes";
import { BossAction, BossAIDecision, BossAILocal } from "./BossAILocal";

export interface PredictedAction {
    decision: BossAIDecision;
    timestamp: number;
    round: number;
    // operationId 已移除（Boss action 由后端执行，不需要乐观更新）
}

/**
 * Boss AI预测执行Hook
 * 注意：Boss action 完全由后端执行，前端只进行预测（不执行乐观更新）
 */
export const useBossAIPredictor = (
    game: GameModel | null,
    operationQueue: any | null  // 保留参数以保持接口兼容性，但不再使用
) => {
    const [predictedActions, setPredictedActions] = useState<Map<number, PredictedAction>>(new Map());
    const pendingPredictionsRef = useRef<Map<number, PredictedAction>>(new Map());

    /**
     * 预测Boss AI决策
     */
    const predictBossAction = useCallback(async (
        params: {
            behaviorSeed: string;
            round: number;
            bossCharacter: MonsterSprite;
            targets: MonsterSprite[];
            gameState: any;
            phaseConfig?: any;
            bossConfig?: any;
        }
    ): Promise<BossAIDecision | null> => {
        try {
            const { behaviorSeed, round, bossCharacter, targets, gameState, phaseConfig, bossConfig } = params;

            // 准备Boss状态
            const bossState = {
                currentHp: bossCharacter.stats?.hp?.current || 0,
                maxHp: bossCharacter.stats?.hp?.max || 0,
                skillCooldowns: bossCharacter.skillCooldowns || {},
                statusEffects: bossCharacter.statusEffects || [],
            };

            // 准备游戏状态（PVE模式：从Boss角度看，targets是玩家角色）
            const gameStateLocal = {
                round,
                seed: behaviorSeed,
                playerCount: targets.length,  // 玩家角色数量
                enemyCount: targets.length,    // 从Boss角度看的目标数量（玩家角色）
                minionCount: 0,
            };

            // 准备目标列表
            const targetList = targets
                .filter((char) => (char.stats?.hp?.current || 0) > 0)
                .map((char) => ({
                    uid: char.uid || "",
                    character_id: char.character_id || "",
                    q: char.q || 0,
                    r: char.r || 0,
                    currentHp: char.stats?.hp?.current || 0,
                    maxHp: char.stats?.hp?.max || 0,
                    totalDamage: 0,
                    threatValue: 0,
                }));

            // 预测决策（仅用于显示，不执行乐观更新）
            const decision = BossAILocal.decideBossAction({
                behaviorSeed,
                round,
                bossState,
                gameState: gameStateLocal,
                targets: targetList,
                bossPosition: { q: bossCharacter.q || 0, r: bossCharacter.r || 0 },
                phaseConfig,
                bossConfig,
            });

            // ✅ Boss action 完全由后端执行，前端只进行预测（不执行乐观更新）
            // 保存预测结果（用于显示或调试）
            const predicted: PredictedAction = {
                decision,
                timestamp: Date.now(),
                round,
                // operationId 不再使用（Boss action 由后端执行）
            };

            pendingPredictionsRef.current.set(round, predicted);
            setPredictedActions(new Map(pendingPredictionsRef.current));

            return decision;
        } catch (error) {
            console.error("Boss AI预测失败:", error);
            return null;
        }
    }, [game]);

    /**
     * 验证预测结果（仅用于日志记录，不执行回滚）
     * 注意：Boss action 完全由后端执行，前端只记录预测准确性
     */
    const verifyPrediction = useCallback((
        round: number,
        serverDecision: BossAIDecision,
        onRollback?: (predicted: BossAction, server: BossAction) => void
    ): boolean => {
        const predicted = pendingPredictionsRef.current.get(round);
        if (!predicted) {
            // 没有预测，直接使用服务器结果
            return false;
        }

        const isConsistent = BossAILocal.isDecisionConsistent(
            predicted.decision.bossAction,
            serverDecision.bossAction,
            { targetChange: true } // 允许目标变化（如目标已死亡）
        );

        if (!isConsistent) {
            console.warn(`⚠️ 预测不一致（Round ${round}）`, {
                predicted: predicted.decision.bossAction,
                server: serverDecision.bossAction,
            });

            // ✅ Boss action 由后端执行，不需要回滚前端状态
            // 只记录预测不一致的情况（用于调试）

            // 触发自定义回调（如果提供）
            if (onRollback) {
                onRollback(predicted.decision.bossAction, serverDecision.bossAction);
            }

            // 清理预测记录
            pendingPredictionsRef.current.delete(round);
            setPredictedActions(new Map(pendingPredictionsRef.current));

            return false;
        }

        // 预测正确，记录日志
        console.log(`✅ 预测正确（Round ${round}）`);

        // 清理预测记录
        pendingPredictionsRef.current.delete(round);
        setPredictedActions(new Map(pendingPredictionsRef.current));

        return true;
    }, []);

    /**
     * 清理预测记录
     */
    const clearPrediction = useCallback((round: number) => {
        pendingPredictionsRef.current.delete(round);
        setPredictedActions(new Map(pendingPredictionsRef.current));
    }, []);

    /**
     * 获取预测的动作（用于执行）
     */
    const getPredictedAction = useCallback((round: number): BossAIDecision | null => {
        const predicted = pendingPredictionsRef.current.get(round);
        return predicted ? predicted.decision : null;
    }, []);

    return {
        predictBossAction,
        verifyPrediction,
        clearPrediction,
        getPredictedAction,
        predictedActions: Array.from(predictedActions.values()),
    };
};

