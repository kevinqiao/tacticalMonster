/**
 * battle3d 前端测试工具函数
 */

import { MonsterSprite } from "../../types/CombatTypes";
import { StateChanges } from "../../types/backendResponseTypes";
import { SkillEffectType } from "../../types/skillTypes";
import type { GameModel, SummonedCharacter } from "../../types/gameTypes";

/**
 * 创建测试角色
 */
export function createTestCharacter(overrides?: Partial<MonsterSprite>): MonsterSprite {
    return {
        character_id: "test_monster_001",
        monsterId: "monster_001",
        uid: "test_user",
        name: "Test Monster",
        rarity: "Common",
        assetPath: "",
        level: 1,
        stars: 1,
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
    } as MonsterSprite;
}

/**
 * 创建测试召唤单位
 */
export function createTestSummonedCharacter(
    overrides?: Partial<SummonedCharacter>
): SummonedCharacter {
    return {
        identifier: { monsterId: "monster_001" },
        uid: "test_user",
        monsterId: "monster_001",
        q: 2,
        r: 1,
        character_id: "monster_001",
        name: "Summoned Minion",
        assetPath: "",
        stats: {
            hp: { current: 50, max: 50 },
            mp: { current: 50, max: 50 },
            attack: 8,
            defense: 3,
            speed: 8,
        },
        statusEffects: [],
        skillCooldowns: {},
        skills: [],
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
        stateChanges: createTestStateChanges(),
        effects: [],
        ...overrides,
    };
}

/**
 * 创建测试 GameModel（用于 mergeSummonedIntoGame 等测试）
 */
export function createTestGame(overrides?: Partial<GameModel>): GameModel {
    return {
        gameId: "test_game_001",
        stageId: "stage_001",
        uid: "test_user",
        teamPower: 100,
        team: [],
        boss: {
            uid: "boss",
            bossId: "boss_001",
            monsterId: "boss_bronze_1",
            name: "Boss",
            rarity: "Common",
            assetPath: "",
            q: 10,
            r: 10,
            level: 1,
            stars: 1,
            stats: { hp: { current: 500, max: 500 }, mp: { current: 100, max: 100 }, attack: 50, defense: 20, speed: 10 },
            minions: [],
        },
        map: { rows: 20, cols: 20 },
        status: 0,
        score: 0,
        lastUpdate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ...overrides,
    };
}
