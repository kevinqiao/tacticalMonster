/**
 * Tactical Monster 技能范围工具函数
 * 处理技能范围计算和目标获取
 */

import { Effect, Skill } from "../types/CharacterTypes";
import { MonsterSprite } from "../types/CombatTypes";
import { calculateHexDistance } from "./hexUtil";

/**
 * 获取范围内的目标（圆形范围）
 */
export const getTargetsInCircle = (
    center: { q: number; r: number },
    range: number,
    allCharacters: MonsterSprite[],
    excludeSelf?: boolean,
    selfUid?: string
): MonsterSprite[] => {
    const targets: MonsterSprite[] = [];

    allCharacters.forEach(char => {
        if (excludeSelf && char.uid === selfUid) return;

        const distance = calculateHexDistance(
            center,
            { q: char.q ?? 0, r: char.r ?? 0 }
        );

        if (distance <= range) {
            targets.push(char);
        }
    });

    return targets;
};

/**
 * 获取范围内的目标（直线范围）
 */
export const getTargetsInLine = (
    start: { q: number; r: number },
    end: { q: number; r: number },
    range: number,
    allCharacters: MonsterSprite[],
    excludeSelf?: boolean,
    selfUid?: string
): MonsterSprite[] => {
    const targets: MonsterSprite[] = [];
    const startDistance = calculateHexDistance(start, end);

    if (startDistance > range) return targets;

    // 计算直线上的所有格子
    const lineCells: { q: number; r: number }[] = [];
    const steps = Math.min(startDistance, range);

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const q = Math.round(start.q + (end.q - start.q) * t);
        const r = Math.round(start.r + (end.r - start.r) * t);
        lineCells.push({ q, r });
    }

    // 检查每个角色是否在直线上
    allCharacters.forEach(char => {
        if (excludeSelf && char.uid === selfUid) return;

        const charPos = { q: char.q ?? 0, r: char.r ?? 0 };
        const isOnLine = lineCells.some(cell =>
            cell.q === charPos.q && cell.r === charPos.r
        );

        if (isOnLine) {
            targets.push(char);
        }
    });

    return targets;
};

/**
 * 根据技能范围获取目标
 */
export const getTargetsInRange = (
    skill: Skill,
    center: MonsterSprite,
    allCharacters: MonsterSprite[],
    target?: MonsterSprite
): MonsterSprite[] => {
    const centerPos = { q: center.q ?? 0, r: center.r ?? 0 };
    const range = skill.range?.distance || skill.range?.max_distance || 1;

    switch (skill.range?.area_type) {
        case 'single':
            // 单体目标
            if (target) {
                const distance = calculateHexDistance(centerPos, { q: target.q ?? 0, r: target.r ?? 0 });
                if (distance <= range) {
                    return [target];
                }
            }
            return [];

        case 'circle':
            // 圆形范围
            return getTargetsInCircle(
                centerPos,
                range,
                allCharacters,
                true,
                center.uid
            );

        case 'line':
            // 直线范围
            if (target) {
                const targetPos = { q: target.q ?? 0, r: target.r ?? 0 };
                return getTargetsInLine(
                    centerPos,
                    targetPos,
                    range,
                    allCharacters,
                    true,
                    center.uid
                );
            }
            return [];

        default:
            // 默认单体
            if (target) {
                return [target];
            }
            return [];
    }
};

/**
 * 根据效果范围获取目标
 */
export const getTargetsByEffectRange = (
    effect: Effect,
    center: MonsterSprite,
    allCharacters: MonsterSprite[],
    target?: MonsterSprite
): MonsterSprite[] => {
    const centerPos = { q: center.q ?? 0, r: center.r ?? 0 };
    const range = effect.area_size || effect.damage_falloff?.full_damage_range || 1;

    switch (effect.area_type) {
        case 'single':
            if (target) {
                return [target];
            }
            return [];

        case 'circle':
            return getTargetsInCircle(
                centerPos,
                range,
                allCharacters,
                true,
                center.uid
            );

        case 'line':
            if (target) {
                const targetPos = { q: target.q ?? 0, r: target.r ?? 0 };
                return getTargetsInLine(
                    centerPos,
                    targetPos,
                    range,
                    allCharacters,
                    true,
                    center.uid
                );
            }
            return [];

        default:
            if (target) {
                return [target];
            }
            return [];
    }
};

/**
 * 检查目标是否在技能范围内
 */
export const isTargetInRange = (
    skill: Skill,
    attacker: MonsterSprite,
    target: MonsterSprite
): boolean => {
    const attackerPos = { q: attacker.q ?? 0, r: attacker.r ?? 0 };
    const targetPos = { q: target.q ?? 0, r: target.r ?? 0 };
    const distance = calculateHexDistance(attackerPos, targetPos);

    const maxRange = skill.range?.max_distance || skill.range?.distance || 1;
    const minRange = skill.range?.min_distance || 0;

    return distance >= minRange && distance <= maxRange;
};

