/**
 * Boss AI预测执行Hook
 * 实现前端预测执行 + 后端验证的完整机制
 */

import { useCallback, useRef, useState } from "react";
import { GameCharacter } from "../../types/CombatTypes";
import { BossAction, BossAIDecision, BossAILocal } from "./BossAILocal";

export interface PredictedAction {
    decision: BossAIDecision;
    timestamp: number;
    round: number;
}

/**
 * Boss AI预测执行Hook
 * 实现前端预测执行 + 后端验证的完整机制
 */
export const useBossAIPredictor = () => {
    const [predictedActions, setPredictedActions] = useState<Map<number, PredictedAction>>(new Map());
    const pendingPredictionsRef = useRef<Map<number, PredictedAction>>(new Map());
    const rollbackCallbacksRef = useRef<Map<number, () => void>>(new Map());

    /**
     * 预测Boss AI决策
     */
    const predictBossAction = useCallback((
        params: {
            behaviorSeed: string;
            round: number;
            bossCharacter: GameCharacter;
            targets: GameCharacter[];
            gameState: any;
            phaseConfig?: any;
            bossConfig?: any;
        }
    ): BossAIDecision | null => {
        try {
            const { behaviorSeed, round, bossCharacter, targets, gameState, phaseConfig, bossConfig } = params;

            // 准备Boss状态
            const bossState = {
                currentHp: bossCharacter.stats?.hp?.current || 0,
                maxHp: bossCharacter.stats?.hp?.max || 0,
                skillCooldowns: bossCharacter.skillCooldowns || {},
                statusEffects: bossCharacter.activeEffects || [],
            };

            // 准备游戏状态
            const gameStateLocal = {
                round,
                seed: behaviorSeed,
                playerCount: targets.length,
                enemyCount: targets.length,
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

            // 预测决策
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

            // 保存预测结果
            const predicted: PredictedAction = {
                decision,
                timestamp: Date.now(),
                round,
            };

            pendingPredictionsRef.current.set(round, predicted);
            setPredictedActions(new Map(pendingPredictionsRef.current));

            return decision;
        } catch (error) {
            console.error("Boss AI预测失败:", error);
            return null;
        }
    }, []);

    /**
     * 验证预测结果
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

            // 触发回滚
            if (onRollback) {
                onRollback(predicted.decision.bossAction, serverDecision.bossAction);
            }

            // 清理预测记录
            pendingPredictionsRef.current.delete(round);
            setPredictedActions(new Map(pendingPredictionsRef.current));

            return false;
        }

        // 预测正确，清理预测记录
        console.log(`✅ 预测正确（Round ${round}）`);
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

