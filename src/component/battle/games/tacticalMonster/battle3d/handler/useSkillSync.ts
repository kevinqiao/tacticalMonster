/**
 * 技能同步状态管理 Hook
 * 方案1：乐观UI + 悲观状态
 * - 同步主动技能动画和后端响应的完成状态
 * - 移除验证和回滚逻辑，直接应用后端结果
 * - 后端失败时：显示错误提示 + 清理视觉反馈 + 停止动画（如果还在播放）
 */

import { useEffect, useRef, useState } from "react";
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
    const handlePhaseChangesRef = useRef(handlePhaseChanges);
    const handlePassiveSkillAnimationsRef = useRef(handlePassiveSkillAnimations);
    handlePhaseChangesRef.current = handlePhaseChanges;
    handlePassiveSkillAnimationsRef.current = handlePassiveSkillAnimations;

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
                handlePassiveSkillAnimationsRef.current(
                    backendResult,
                    skillSyncState.activeSkillTimeline,
                    character,
                    target
                );

                try {
                    // ✅ 处理阶段变化（通过 ref 调用，避免 handlePhaseChanges 变更触发本 effect 重跑导致无限循环）
                    // 关键：从 effect 调用栈切到 microtask，再进入 handlePhaseChanges，避免内部 flushSync 触发 React warning。
                    if (backendResult.phaseChanges) {
                        await new Promise<void>((resolve, reject) => {
                            queueMicrotask(() => {
                                handlePhaseChangesRef.current(backendResult.phaseChanges)
                                    .then(resolve)
                                    .catch(reject);
                            });
                        });
                    }
                } catch (error) {
                    console.error("[useSkillSync] handlePhaseChanges failed:", error);
                    if (onError) {
                        onError("阶段变化处理失败");
                    }
                } finally {
                    // ✅ 无论成功/失败都重置状态，避免技能流程卡住
                    setSkillSyncState(null);
                }
            };

            processBothCompleted().catch((error) => {
                console.error("[useSkillSync] processBothCompleted failed:", error);
                setSkillSyncState(null);
            });
        }
    }, [skillSyncState]);

    return { skillSyncState, setSkillSyncState };
};

