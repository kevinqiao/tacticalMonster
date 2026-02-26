/**
 * 后端响应处理工具函数
 * 方案1：乐观UI + 悲观状态
 * - 应用后端返回的 stateChanges
 * - 处理错误提示
 * - 计算击杀分数
 */

import { StateChanges } from "../types/backendResponseTypes";
import { MonsterSprite } from "../types/CombatTypes";
import { CharacterIdentifier } from "../types/gameTypes";
import { updateHPMPDisplay } from "../utils/hpmpDisplayUpdater";
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
            // ✅ 更新护盾值
            if (actorChange.shieldChanged && actorChange.after.shield !== undefined) {
                if (!actorChar.stats.shield) {
                    actorChar.stats.shield = { current: 0, max: 0 };
                }
                actorChar.stats.shield.current = actorChange.after.shield;
                // 可以添加护盾条更新逻辑（如果需要）
            }
            // ✅ 更新角色状态
            if (actorChange.statusChanged && actorChange.after.status !== undefined) {
                actorChar.status = actorChange.after.status;
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
                // ✅ 更新护盾值
                if (targetChange.shieldChanged && targetChange.after.shield !== undefined) {
                    if (!targetChar.stats.shield) {
                        targetChar.stats.shield = { current: 0, max: 0 };
                    }
                    targetChar.stats.shield.current = targetChange.after.shield;
                }
                // ✅ 更新角色状态
                if (targetChange.statusChanged && targetChange.after.status !== undefined) {
                    targetChar.status = targetChange.after.status;
                }
            }
        });
    }

    // ✅ 应用状态效果列表变化
    if (stateChanges.statusEffects && stateChanges.statusEffects.length > 0) {
        stateChanges.statusEffects.forEach((statusEffectChange) => {
            const character = findTargetByIdentifier(
                characters,
                statusEffectChange.characterIdentifier
            );
            if (character) {
                // 直接替换状态效果列表（后端返回的是完整的最新列表）
                character.statusEffects = statusEffectChange.statusEffects;
            }
        });
    }

    // ✅ 应用技能冷却变化
    if (stateChanges.skillCooldowns && stateChanges.skillCooldowns.length > 0) {
        stateChanges.skillCooldowns.forEach((cooldownChange) => {
            const character = findTargetByIdentifier(
                characters,
                cooldownChange.characterIdentifier
            );
            if (character) {
                // 直接替换技能冷却对象（后端返回的是完整的最新冷却状态）
                character.skillCooldowns = cooldownChange.cooldowns;
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
