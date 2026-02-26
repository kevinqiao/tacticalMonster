/**
 * 技能同步状态管理 Hook
 * 方案1：乐观UI + 悲观状态
 * - 同步主动技能动画和后端响应的完成状态
 * - 移除验证和回滚逻辑，直接应用后端结果
 * - 后端失败时：显示错误提示 + 清理视觉反馈 + 停止动画（如果还在播放）
 */

import { useEffect, useState } from "react";
import { SkillSyncState } from "../../types/skillTypes";
import {
    applyStateChanges,
    calculateKillScoreIfNeeded,
    handleBackendError
} from "../../utils/backendResponseUtils";
import { clearVisualFeedback } from "../../utils/visualFeedbackUtils";

/**
 * 技能同步状态管理
 */
export const useSkillSync = (
    handlePhaseChanges: (phaseChanges: any) => Promise<void>,
    handlePassiveSkillAnimations: (
        backendResult: any,
        activeSkillTimeline: any,
        character: any,
        target: any
    ) => void,
    characters: any[],
    calculateActionScore: (params: any) => number,
    onError?: (message: string) => void  // ✅ 错误提示回调（可选）
) => {
    const [skillSyncState, setSkillSyncState] = useState<SkillSyncState | null>(null);

    useEffect(() => {
        if (!skillSyncState) return;

        const { animationCompleted, backendResponse, character, target, skillId } = skillSyncState;

        // ✅ 处理后端失败情况（动画可能还未完成）
        if (!animationCompleted && backendResponse && (!backendResponse.ok || !backendResponse.data.success)) {
            const errorMessage = backendResponse.ok
                ? backendResponse.data.message || "技能使用失败"
                : backendResponse.error || "技能使用失败";

            // ✅ 如果动画还在播放，尝试停止/淡出
            const activeSkillTimeline = skillSyncState.activeSkillTimeline;
            if (activeSkillTimeline && activeSkillTimeline.isActive()) {
                // 快速淡出并停止动画
                activeSkillTimeline.pause();
                if (activeSkillTimeline.duration() > 0) {
                    // 如果有淡出效果，可以添加
                    // 这里只是停止动画，不做额外的淡出（因为动画可能已经显示了很多视觉反馈）
                }
                activeSkillTimeline.kill();
            }

            // ✅ 清理视觉反馈
            if (skillSyncState.character && skillSyncState.target) {
                clearVisualFeedback(skillSyncState.character, skillSyncState.target);
            }

            // ✅ 显示错误提示
            if (onError) {
                onError(errorMessage);
            } else {
                console.error("Use skill failed", errorMessage);
                // 可以添加 toast 提示（如果项目中有 toast 组件）
                // toast.error(errorMessage);
            }

            // ✅ 清理状态
            setSkillSyncState(null);
            return;
        }

        // 只有当动画完成且后端响应到达时，才处理后续逻辑
        if (animationCompleted && backendResponse) {
            const processBothCompleted = async () => {
                // ✅ 处理后端错误（如果有）
                if (!backendResponse.ok || !backendResponse.data?.success) {
                    handleBackendError(backendResponse, onError);
                    // ✅ 清理状态
                    setSkillSyncState(null);
                    return;
                }

                const backendResult = backendResponse.data; // 此时已确认 backendResponse.ok 且 success

                // ✅ 从 phaseChanges.stateChanges 提取（顶层，无需深层访问）
                const phaseChanges = backendResult.phaseChanges;
                const stateChanges = phaseChanges?.stateChanges;

                // ✅ 应用后端返回的 stateChanges（包含 shield, status, statusEffects, skillCooldowns）
                applyStateChanges(stateChanges, characters, character, target);

                // ✅ 计算击杀分数（如果需要）
                calculateKillScoreIfNeeded(
                    stateChanges,
                    target,
                    characters,
                    skillId || "",
                    calculateActionScore
                );

                // ✅ 处理被动技能动画
                handlePassiveSkillAnimations(
                    backendResult,
                    skillSyncState.activeSkillTimeline,
                    character,
                    target
                );

                // ✅ 处理阶段变化
                if (backendResult.phaseChanges) {
                    await handlePhaseChanges(backendResult.phaseChanges);
                }

                // ✅ 重置状态
                setSkillSyncState(null);
            };

            processBothCompleted();
        }
    }, [skillSyncState, handlePhaseChanges, handlePassiveSkillAnimations, characters, calculateActionScore, onError]);

    return { skillSyncState, setSkillSyncState };
};

