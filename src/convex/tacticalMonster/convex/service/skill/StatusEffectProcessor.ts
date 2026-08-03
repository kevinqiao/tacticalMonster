/**
 * 状态效果每回合处理器
 * 在 turn_start 时调用，对角色身上所有 statusEffects 执行 tick，移除到期效果，并返回变化供前端动画
 */

import type { GameMonster, StatusEffect } from "../../types/monsterTypes";
import { EffectHandlerRegistry } from "./effects/EffectHandlerRegistry";

export interface StatusEffectTickedItem {
    effectId: string;
    type: string;
    value: number;
}

export interface StatusEffectTickResult {
    /** 本回合到期的效果（已从 statusEffects 移除） */
    expired: StatusEffect[];
    /** 本回合产生数值变化的效果（DOT/HOT 等） */
    ticked: StatusEffectTickedItem[];
    /** 处理后的角色状态摘要 */
    characterState: {
        hp: number;
        mp?: number;
        status: string;
    };
}

/**
 * 处理角色的所有状态效果（在 turn_start 时调用）
 * 会原地修改 character.statusEffects 和 character.stats / character.status
 */
export function processStatusEffects(character: GameMonster): StatusEffectTickResult {
    const expired: StatusEffect[] = [];
    const ticked: StatusEffectTickedItem[] = [];

    if (!character.statusEffects || character.statusEffects.length === 0) {
        return {
            expired: [],
            ticked: [],
            characterState: getCharacterStateSnapshot(character),
        };
    }

    character.statusEffects = character.statusEffects.filter((se) => {
        const handler = EffectHandlerRegistry.getHandler(se.type);
        if (!handler?.tick) return true;

        const result = handler.tick(se, character);
        if (result.value != null && result.value !== 0) {
            ticked.push({
                effectId: se.id,
                type: se.type,
                value: result.value,
            });
        }
        if (result.expired) {
            handler.remove?.(se, character);
            expired.push(se);
            return false;
        }
        return true;
    });

    return {
        expired,
        ticked,
        characterState: getCharacterStateSnapshot(character),
    };
}

function getCharacterStateSnapshot(character: GameMonster): StatusEffectTickResult["characterState"] {
    const hp = character.stats?.hp?.current ?? 0;
    const mp = character.stats?.mp?.current;
    const status = character.status ?? "normal";
    return { hp, mp, status };
}
