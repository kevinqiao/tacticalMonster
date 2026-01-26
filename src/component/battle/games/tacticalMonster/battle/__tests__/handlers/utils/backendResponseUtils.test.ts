/**
 * backendResponseUtils 单元测试
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyStateChanges } from "../../../service/handler/utils/backendResponseUtils";
import { MonsterSprite } from "../../../types/CombatTypes";
import { StateChanges } from "../../../types/backendResponseTypes";
import { SkillEffectType } from "../../../types/skillTypes";
import { createTestCharacter } from "../../testUtils";

// Mock updateHPMPDisplay
vi.mock("../../../utils/hpmpDisplayUpdater", () => ({
    updateHPMPDisplay: vi.fn(),
}));

describe("applyStateChanges", () => {
    let characters: MonsterSprite[];

    beforeEach(() => {
        characters = [
            createTestCharacter({ monsterId: "monster_001" }),
            createTestCharacter({ monsterId: "monster_002" }),
        ];
    });

    it("应该应用 actor 的 HP 变化", () => {
        const stateChanges: StateChanges = {
            actor: {
                identifier: { monsterId: "monster_001" },
                before: { q: 0, r: 0, hp: 100, mp: 50 },
                after: { q: 0, r: 0, hp: 80, mp: 50 },
                positionChanged: false,
                hpChanged: true,
                mpChanged: false,
            },
        };

        const result = applyStateChanges(stateChanges, characters);
        expect(result).toBe(true);
        expect(characters[0].stats?.hp?.current).toBe(80);
    });

    it("应该应用 actor 的 MP 变化", () => {
        const stateChanges: StateChanges = {
            actor: {
                identifier: { monsterId: "monster_001" },
                before: { q: 0, r: 0, hp: 100, mp: 50 },
                after: { q: 0, r: 0, hp: 100, mp: 30 },
                positionChanged: false,
                hpChanged: false,
                mpChanged: true,
            },
        };

        const result = applyStateChanges(stateChanges, characters);
        expect(result).toBe(true);
        expect(characters[0].stats?.mp?.current).toBe(30);
    });

    it("应该应用 actor 的 Position 变化", () => {
        const stateChanges: StateChanges = {
            actor: {
                identifier: { monsterId: "monster_001" },
                before: { q: 0, r: 0, hp: 100, mp: 50 },
                after: { q: 2, r: 3, hp: 100, mp: 50 },
                positionChanged: true,
                hpChanged: false,
                mpChanged: false,
            },
        };

        const result = applyStateChanges(stateChanges, characters);
        expect(result).toBe(true);
        expect(characters[0].q).toBe(2);
        expect(characters[0].r).toBe(3);
    });

    it("应该应用 actor 的 Shield 变化", () => {
        const stateChanges: StateChanges = {
            actor: {
                identifier: { monsterId: "monster_001" },
                before: { q: 0, r: 0, hp: 100, mp: 50, shield: 0, status: "normal" },
                after: { q: 0, r: 0, hp: 100, mp: 50, shield: 20, status: "normal" },
                positionChanged: false,
                hpChanged: false,
                mpChanged: false,
                shieldChanged: true,
                statusChanged: false,
            },
        };

        if (!characters[0].stats) {
            characters[0].stats = {} as any;
        }
        if (!characters[0].stats.shield) {
            characters[0].stats.shield = { current: 0, max: 0 };
        }

        const result = applyStateChanges(stateChanges, characters);
        expect(result).toBe(true);
        expect(characters[0].stats.shield.current).toBe(20);
    });

    it("应该应用 actor 的 Status 变化", () => {
        const stateChanges: StateChanges = {
            actor: {
                identifier: { monsterId: "monster_001" },
                before: { q: 0, r: 0, hp: 100, mp: 50, shield: 0, status: "normal" },
                after: { q: 0, r: 0, hp: 100, mp: 50, shield: 0, status: "stunned" },
                positionChanged: false,
                hpChanged: false,
                mpChanged: false,
                shieldChanged: false,
                statusChanged: true,
            },
        };

        const result = applyStateChanges(stateChanges, characters);
        expect(result).toBe(true);
        expect(characters[0].status).toBe("stunned");
    });

    it("应该应用 targets 的状态变化", () => {
        const bossCharacter = createTestCharacter({
            monsterId: "boss_bronze_1",
            character_id: "boss_bronze_1",  // character_id 应该匹配 bossId
            uid: "boss",
        });
        characters.push(bossCharacter);

        const stateChanges: StateChanges = {
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
        };

        const result = applyStateChanges(stateChanges, characters);
        expect(result).toBe(true);
        expect(bossCharacter.stats?.hp?.current).toBe(350);
    });

    it("应该应用 statusEffects 列表变化", () => {
        const stateChanges: StateChanges = {
            statusEffects: [
                {
                    characterIdentifier: { monsterId: "monster_001" },
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
        };

        const result = applyStateChanges(stateChanges, characters);
        expect(result).toBe(true);
        expect(characters[0].statusEffects).toBeDefined();
        expect(characters[0].statusEffects?.length).toBe(1);
    });

    it("应该应用 skillCooldowns 变化", () => {
        const stateChanges: StateChanges = {
            skillCooldowns: [
                {
                    characterIdentifier: { monsterId: "monster_001" },
                    cooldowns: { fire_ball: 3, ice_bolt: 1 },
                },
            ],
        };

        const result = applyStateChanges(stateChanges, characters);
        expect(result).toBe(true);
        expect(characters[0].skillCooldowns).toBeDefined();
        expect(characters[0].skillCooldowns?.fire_ball).toBe(3);
        expect(characters[0].skillCooldowns?.ice_bolt).toBe(1);
    });

    it("应该处理空 stateChanges", () => {
        const result = applyStateChanges(undefined, characters);
        expect(result).toBe(false);
    });

    it("应该处理无效角色 identifier", () => {
        const stateChanges: StateChanges = {
            actor: {
                identifier: { monsterId: "nonexistent_monster" },
                before: { q: 0, r: 0, hp: 100, mp: 50 },
                after: { q: 0, r: 0, hp: 80, mp: 50 },
                positionChanged: false,
                hpChanged: true,
                mpChanged: false,
            },
        };

        const result = applyStateChanges(stateChanges, characters);
        expect(result).toBe(true); // 函数返回 true，但不会修改任何角色
    });

    it("应该处理多个 targets", () => {
        const boss1 = createTestCharacter({
            monsterId: "boss_1",
            character_id: "boss_1",  // character_id 应该匹配 bossId
            uid: "boss",
        });
        const boss2 = createTestCharacter({
            monsterId: "boss_2",
            character_id: "boss_2",  // character_id 应该匹配 bossId
            uid: "boss",
        });
        characters.push(boss1, boss2);

        const stateChanges: StateChanges = {
            targets: [
                {
                    identifier: { bossId: "boss_1" },
                    before: { hp: 500, mp: 100 },
                    after: { hp: 400, mp: 100 },
                    hpChanged: true,
                    mpChanged: false,
                },
                {
                    identifier: { bossId: "boss_2" },
                    before: { hp: 500, mp: 100 },
                    after: { hp: 300, mp: 100 },
                    hpChanged: true,
                    mpChanged: false,
                },
            ],
        };

        const result = applyStateChanges(stateChanges, characters);
        expect(result).toBe(true);
        expect(boss1.stats?.hp?.current).toBe(400);
        expect(boss2.stats?.hp?.current).toBe(300);
    });
});
