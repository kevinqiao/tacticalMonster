/**
 * Boss AI预测执行Hook
 * 实现前端预测执行 + 后端验证的完整机制
 */

import { useCallback, useRef, useState } from "react";
import { GameModel, MonsterSprite } from "../../types/CombatTypes";
import { OperationQueue } from "../optimistic/OperationQueue";
import { OptimisticBossExecutor } from "../optimistic/OptimisticBossExecutor";
import { BossAction, BossAIDecision, BossAILocal } from "./BossAILocal";

export interface PredictedAction {
    decision: BossAIDecision;
    timestamp: number;
    round: number;
    operationId?: string;  // 乐观执行的操作ID
}

/**
 * Boss AI预测执行Hook
 * 实现前端预测执行 + 后端验证的完整机制
 */
export const useBossAIPredictor = (
    game: GameModel | null,
    operationQueue: OperationQueue | null
) => {
    const [predictedActions, setPredictedActions] = useState<Map<number, PredictedAction>>(new Map());
    const pendingPredictionsRef = useRef<Map<number, PredictedAction>>(new Map());
    const rollbackCallbacksRef = useRef<Map<number, () => void>>(new Map());

    // 创建乐观执行器
    const optimisticExecutor = game && operationQueue
        ? new OptimisticBossExecutor(game, operationQueue)
        : null;

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

            // 乐观执行（如果执行器可用）
            let operationId: string | undefined;
            if (optimisticExecutor && game) {
                try {
                    const executionResult = await optimisticExecutor.executeOptimistically(
                        decision,
                        bossCharacter,
                        behaviorSeed,
                        round
                    );
                    operationId = executionResult.operationId;

                    // 保存回滚回调
                    const operation = optimisticExecutor.getOperation(operationId);
                    if (operation) {
                        rollbackCallbacksRef.current.set(round, operation.rollback);
                    }
                } catch (error) {
                    console.error("Failed to execute Boss action optimistically:", error);
                }
            }

            // 保存预测结果
            const predicted: PredictedAction = {
                decision,
                timestamp: Date.now(),
                round,
                operationId,
            };

            pendingPredictionsRef.current.set(round, predicted);
            setPredictedActions(new Map(pendingPredictionsRef.current));

            return decision;
        } catch (error) {
            console.error("Boss AI预测失败:", error);
            return null;
        }
    }, [optimisticExecutor, game]);

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
            const rollback = rollbackCallbacksRef.current.get(round);
            if (rollback) {
                try {
                    rollback();
                    console.log(`✅ 已回滚 Round ${round} 的Boss动作`);
                } catch (error) {
                    console.error(`❌ 回滚失败（Round ${round}）:`, error);
                }
                rollbackCallbacksRef.current.delete(round);
            }

            // 如果有操作ID，从操作队列中回滚
            if (predicted.operationId && operationQueue) {
                const rolledBack = operationQueue.rollbackOperation(predicted.operationId);
                if (!rolledBack) {
                    console.warn(`Failed to rollback operation ${predicted.operationId}`);
                }
            }

            // 触发自定义回滚回调
            if (onRollback) {
                onRollback(predicted.decision.bossAction, serverDecision.bossAction);
            }

            // 清理预测记录
            pendingPredictionsRef.current.delete(round);
            setPredictedActions(new Map(pendingPredictionsRef.current));

            return false;
        }

        // 预测正确，确认操作
        console.log(`✅ 预测正确（Round ${round}）`);

        // 如果有操作ID，确认操作
        if (predicted.operationId && operationQueue) {
            operationQueue.confirmOperation(predicted.operationId);
        }

        // 清理预测记录和回滚回调
        pendingPredictionsRef.current.delete(round);
        rollbackCallbacksRef.current.delete(round);
        setPredictedActions(new Map(pendingPredictionsRef.current));

        return true;
    }, [operationQueue]);

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

