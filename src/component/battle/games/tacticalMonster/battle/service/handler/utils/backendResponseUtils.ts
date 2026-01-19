/**
 * 后端响应处理工具函数
 * 方案1：乐观UI + 悲观状态
 * - 应用后端返回的 stateChanges
 * - 处理错误提示
 * - 计算击杀分数
 */

import { updateHPMPDisplay } from "../../../utils/hpmpDisplayUpdater";
import { StateChanges } from "../../../types/backendResponseTypes";
import { MonsterSprite } from "../../../types/CombatTypes";
import { CharacterIdentifier } from "../../../utils/typeAdapter";
import { findTargetByIdentifier } from "./characterUtils";
import { calculateKillScore } from "./scoreUtils";

/**
 * 应用后端返回的状态变化（统一函数，适用于所有模式：play/watch/replay）
 * 
 * @param stateChanges - 后端返回的状态变化信息
 * @param characters - 所有角色列表
 * @param actor - 执行者角色（可选，如果不提供，会通过 stateChanges.actor.identifier 查找）
 * @param target - 目标角色（可选，主要用于分数计算，如果不提供，会通过 stateChanges.targets[].identifier 查找）
 * @returns 是否成功应用了状态变化
 */
export function applyStateChanges(
    stateChanges: StateChanges | undefined,
    characters: MonsterSprite[],
    actor?: MonsterSprite | undefined,  // ✅ 可选：如果提供则直接使用，否则通过 identifier 查找
    target?: MonsterSprite | undefined   // ✅ 可选：主要用于分数计算，不用于状态更新
): boolean {
    if (!stateChanges) return false;

    const { actor: actorChange, targets: targetChanges } = stateChanges;

    // ✅ 应用执行者状态变化
    if (actorChange) {
        // ✅ 如果没有提供 actor，通过 identifier 查找
        const actorChar = actor || (actorChange.identifier 
            ? findTargetByIdentifier(characters, actorChange.identifier as CharacterIdentifier)
            : undefined);

        if (actorChar && actorChar.stats) {
            if (actorChange.hpChanged && actorChar.stats.hp !== undefined) {
                actorChar.stats.hp.current = actorChange.after.hp;
                updateHPMPDisplay(actorChar, actorChange.after.hp, undefined);
            }
            if (actorChange.mpChanged && actorChar.stats.mp !== undefined) {
                if (!actorChar.stats.mp) {
                    actorChar.stats.mp = { current: 0, max: 0 };
                }
                actorChar.stats.mp.current = actorChange.after.mp;
                updateHPMPDisplay(actorChar, undefined, actorChange.after.mp);
            }
            if (actorChange.positionChanged) {
                actorChar.q = actorChange.after.q ?? actorChar.q;
                actorChar.r = actorChange.after.r ?? actorChar.r;
            }
        }
    }

    // ✅ 应用目标状态变化（通过 identifier 查找，不依赖传入的 target）
    if (targetChanges && targetChanges.length > 0) {
        targetChanges.forEach((targetChange) => {
            const targetChar = findTargetByIdentifier(
                characters,
                targetChange.identifier as CharacterIdentifier
            );
            if (targetChar) {
                if (targetChange.hpChanged && targetChar.stats?.hp !== undefined) {
                    targetChar.stats.hp.current = targetChange.after.hp;
                    updateHPMPDisplay(targetChar, targetChange.after.hp, undefined);
                }
                if (targetChange.mpChanged && targetChar.stats?.mp !== undefined) {
                    if (!targetChar.stats.mp) {
                        targetChar.stats.mp = { current: 0, max: 0 };
                    }
                    targetChar.stats.mp.current = targetChange.after.mp;
                    updateHPMPDisplay(targetChar, undefined, targetChange.after.mp);
                }
            }
        });
    }

    return true;
}

/**
 * 计算击杀分数（如果需要）
 * @param stateChanges - 后端返回的状态变化信息
 * @param target - 目标角色（来自 SkillSyncState，可选）
 * @param characters - 所有角色列表
 * @param skillId - 技能ID
 * @param calculateActionScore - 分数计算函数
 */
export function calculateKillScoreIfNeeded(
    stateChanges: StateChanges | undefined,
    target: MonsterSprite | undefined,
    characters: MonsterSprite[],
    skillId: string,
    calculateActionScore: (params: any) => number
): void {
    if (!stateChanges?.targets || !target) return;

    const targetChange = stateChanges.targets.find(
        (t: any) => t.identifier.monsterId === target.character_id ||
            t.identifier.bossId === target.character_id ||
            t.identifier.minionId === target.character_id
    );

    if (targetChange) {
        const beforeHp = targetChange.before.hp;
        const afterHp = targetChange.after.hp;
        calculateKillScore(characters, target, beforeHp, afterHp, skillId, calculateActionScore);
    }
}

/**
 * 处理后端响应错误
 * @param backendResponse - 后端响应（可能是失败的）
 * @param onError - 错误提示回调（可选）
 * @returns 错误消息（如果有）
 */
export function handleBackendError(
    backendResponse: { ok: boolean; data?: { success?: boolean; message?: string }; error?: string },
    onError?: (message: string) => void
): string | null {
    if (backendResponse.ok && backendResponse.data?.success) {
        return null; // 没有错误
    }

    const errorMessage = backendResponse.ok
        ? backendResponse.data?.message || "操作失败"
        : backendResponse.error || "操作失败";

    // ✅ 显示错误提示
    if (onError) {
        onError(errorMessage);
    } else {
        console.error("Backend operation failed", errorMessage);
    }

    return errorMessage;
}
