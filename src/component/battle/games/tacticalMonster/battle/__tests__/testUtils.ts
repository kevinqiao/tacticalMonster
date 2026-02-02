/**
 * 前端测试工具函数
 */

import { MonsterSprite } from "../../types/CombatTypes";
import { StateChanges } from "../../types/backendResponseTypes";
import { SkillEffectType } from "../../types/skillTypes";

/**
 * 创建测试角色
 */
export function createTestCharacter(overrides?: Partial<MonsterSprite>): MonsterSprite {
    return {
        character_id: "test_monster_001",
        monsterId: "monster_001",
        uid: "test_user",
        name: "Test Monster",
        stats: {
            hp: { current: 100, max: 100 },
            mp: { current: 50, max: 50 },
            attack: 10,
            defense: 5,
            speed: 10,
        },
        q: 0,
        r: 0,
        ...overrides,
    };
}

/**
 * 创建测试 stateChanges
 */
export function createTestStateChanges(overrides?: Partial<StateChanges>): StateChanges {
    return {
        actor: {
            identifier: { monsterId: "test_monster_001" },
            before: { q: 0, r: 0, hp: 100, mp: 50, shield: 0, status: "normal" },
            after: { q: 0, r: 0, hp: 80, mp: 30, shield: 20, status: "normal" },
            positionChanged: false,
            hpChanged: true,
            mpChanged: true,
            shieldChanged: true,
            statusChanged: false,
        },
        targets: [
            {
                identifier: { bossId: "boss_bronze_1" },
                before: { hp: 500, mp: 100, shield: 50, status: "normal" },
                after: { hp: 350, mp: 100, shield: 0, status: "normal" },
                hpChanged: true,
                mpChanged: false,
                shieldChanged: true,
                statusChanged: false,
            },
        ],
        statusEffects: [
            {
                characterIdentifier: { bossId: "boss_bronze_1" },
                statusEffects: [
                    {
                        id: "burn_effect_001",
                        name: "燃烧",
                        type: SkillEffectType.DOT,
                        value: 10,
                        duration: 3,
                        remaining_duration: 3,
                        damage_type: "magical",
                    },
                ],
            },
        ],
        skillCooldowns: [
            {
                characterIdentifier: { monsterId: "test_monster_001" },
                cooldowns: { fire_ball: 3, ice_bolt: 1 },
            },
        ],
        ...overrides,
    };
}

/**
 * 创建测试 PhaseChanges
 */
export function createTestPhaseChanges(overrides?: any): any {
    return {
        playerAction: {
            action: {
                type: "use_skill" as const,
                skillId: "fire_ball",
                targets: [{ bossId: "boss_bronze_1" }],
            },
            executionResults: {
                stateChanges: createTestStateChanges(),
                effects: [],
            },
        },
        ...overrides,
    };
}
