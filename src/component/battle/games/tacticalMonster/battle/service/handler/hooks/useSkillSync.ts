/**
 * 技能同步状态管理 Hook
 * 用于同步主动技能动画和后端响应的完成状态
 */

import { useEffect, useState } from "react";
import { BackendValidator } from "../../optimistic/BackendValidator";
import { OperationQueue } from "../../optimistic/OperationQueue";
import { SkillSyncState } from "../types";

/**
 * 技能同步状态管理
 */
export const useSkillSync = (
    operationQueue: OperationQueue,
    handlePhaseChanges: (phaseChanges: any) => Promise<void>,
    handlePassiveSkillAnimations: (
        backendResult: any,
        activeSkillTimeline: any,
        character: any,
        target: any
    ) => void
) => {
    const [skillSyncState, setSkillSyncState] = useState<SkillSyncState | null>(null);

    useEffect(() => {
        if (!skillSyncState) return;

        const { animationCompleted, backendResponse, operationId, pendingUpdate, optimisticResult } = skillSyncState;

        // 只有当动画完成且后端响应到达时，才处理后续逻辑
        if (animationCompleted && backendResponse) {
            const processBothCompleted = async () => {
                if (!backendResponse.ok || !backendResponse.data.success) {
                    // 后端拒绝，回滚前端状态
                    const errorMessage = backendResponse.ok
                        ? backendResponse.data.message || "技能使用失败"
                        : backendResponse.error || "技能使用失败";
                    console.error("Use skill failed", errorMessage);
                    pendingUpdate?.rollback();
                    operationQueue.rollbackOperation(operationId!);
                    setSkillSyncState(null);
                    return;
                }

                const backendResult = backendResponse.data;

                // 验证结果
                const validation = BackendValidator.validateOperation(
                    optimisticResult?.result,
                    backendResult
                );

                if (validation.needsRollback) {
                    // 结果不一致，回滚前端状态
                    console.warn("Frontend and backend results mismatch, rolling back:", validation.differences);
                    BackendValidator.logValidationFailure(operationId!, validation);
                    pendingUpdate?.rollback();
                    operationQueue.rollbackOperation(operationId!);
                } else {
                    // 结果一致，确认操作
                    operationQueue.confirmOperation(operationId!);
                    console.log("Optimistic execution validated successfully");

                    // 处理被动技能动画
                    handlePassiveSkillAnimations(
                        backendResult,
                        skillSyncState.activeSkillTimeline,
                        skillSyncState.character,
                        skillSyncState.target
                    );
                }

                // 处理阶段变化
                if (backendResult.phaseChanges) {
                    await handlePhaseChanges(backendResult.phaseChanges);
                }

                // 重置状态
                setSkillSyncState(null);
            };

            processBothCompleted();
        }
    }, [skillSyncState, operationQueue, handlePhaseChanges, handlePassiveSkillAnimations]);

    return { skillSyncState, setSkillSyncState };
};

