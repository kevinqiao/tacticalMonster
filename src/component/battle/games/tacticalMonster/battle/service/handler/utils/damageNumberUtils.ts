/**
 * 伤害数字显示工具函数
 * 从 stateChanges 中提取伤害值并显示伤害数字
 */

import { StateChanges } from "../../../../types/backendResponseTypes";
import { MonsterSprite } from "../../../../types/CombatTypes";
import { showDamageNumber } from "../../../utils/damageNumberDisplay";
import { CharacterIdentifier } from "../../../utils/typeAdapter";
import { findTargetByIdentifier } from "./characterUtils";

/**
 * 从 stateChanges 中提取并显示伤害数字
 * @param stateChanges - 后端返回的状态变化信息
 * @param characters - 所有角色列表
 * @param actor - 执行者角色（可选）
 * @param target - 目标角色（可选，主要用于确定显示顺序）
 */
export function displayDamageNumbersFromStateChanges(
    stateChanges: StateChanges | undefined,
    characters: MonsterSprite[],
    actor?: MonsterSprite | undefined,
    target?: MonsterSprite | undefined
): void {
    if (!stateChanges) return;

    const { actor: actorChange, targets: targetChanges } = stateChanges;

    // ✅ 显示目标伤害数字（优先显示）
    if (targetChanges && targetChanges.length > 0) {
        targetChanges.forEach((targetChange, index) => {
            const targetChar = findTargetByIdentifier(
                characters,
                targetChange.identifier as CharacterIdentifier
            );
            if (targetChar && targetChange.hpChanged) {
                const damageValue = targetChange.before.hp - targetChange.after.hp;
                if (damageValue > 0) {
                    // ✅ 延迟显示，避免多个伤害数字重叠
                    setTimeout(() => {
                        // 从 stateChanges 中无法直接获取 damage_type，需要从 effects 中获取
                        // 这里暂时使用默认值，后续可以从 effects 中获取
                        showDamageNumber(targetChar, damageValue, 'physical');
                    }, index * 100); // 每个目标延迟 100ms
                } else if (damageValue < 0) {
                    // 治疗效果
                    setTimeout(() => {
                        showDamageNumber(targetChar, damageValue, 'heal');
                    }, index * 100);
                }
            }
        });
    }

    // ✅ 显示执行者伤害数字（如果有，如反击伤害）
    if (actorChange && actorChange.hpChanged) {
        const actorChar = actor || (actorChange.identifier
            ? findTargetByIdentifier(characters, actorChange.identifier as CharacterIdentifier)
            : undefined);
        if (actorChar) {
            const damageValue = actorChange.before.hp - actorChange.after.hp;
            if (damageValue > 0) {
                // ✅ 延迟显示，避免与目标伤害数字重叠
                setTimeout(() => {
                    showDamageNumber(actorChar, damageValue, 'physical');
                }, (targetChanges?.length || 0) * 100 + 100);
            } else if (damageValue < 0) {
                // 治疗效果
                setTimeout(() => {
                    showDamageNumber(actorChar, damageValue, 'heal');
                }, (targetChanges?.length || 0) * 100 + 100);
            }
        }
    }
}
