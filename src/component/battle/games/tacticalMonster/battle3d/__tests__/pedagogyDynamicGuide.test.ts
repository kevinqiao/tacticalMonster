import { describe, expect, it } from "vitest";
import { getBronzeBoss1DynamicGuideText } from "../../utils/pedagogyDynamicGuide";
import type { MonsterSprite } from "../../types/CombatTypes";

const mkChar = (over: Partial<MonsterSprite> & { q: number; r: number }): MonsterSprite =>
    ({
        uid: "u1",
        character_id: "m1",
        monsterId: "monster_001",
        move_range: 3,
        attack_range: { min: 1, max: 1 },
        ...over,
    }) as MonsterSprite;

describe("getBronzeBoss1DynamicGuideText", () => {
    it("shows target phase when skill is selected", () => {
        const game = {
            currentRound: {
                turns: [{ status: 1, uid: "u1", character_id: "m1", skillSelect: "basic_attack" }],
            },
        };
        const self = mkChar({ q: 0, r: 0 });
        const boss = { uid: "boss", character_id: "b1", q: 2, r: 0 } as MonsterSprite;
        const r = getBronzeBoss1DynamicGuideText(game, [self, boss], new Map());
        expect(r?.phase).toBe("target");
    });

    it("shows move when not in range and walkable exists", () => {
        const game = {
            currentRound: {
                turns: [{ status: 1, uid: "u1", character_id: "m1", stepsUsed: 0 }],
            },
        };
        const self = mkChar({ q: 0, r: 0 });
        const boss = { uid: "boss", character_id: "b1", q: 5, r: 0 } as MonsterSprite;
        const cells = new Map<string, "walkable">([["1,0", "walkable"]]);
        const r = getBronzeBoss1DynamicGuideText(game, [self, boss], cells as any);
        expect(r?.phase).toBe("move");
    });

    it("shows skill when in range even if walkable exists", () => {
        const game = {
            currentRound: {
                turns: [{ status: 1, uid: "u1", character_id: "m1", stepsUsed: 0 }],
            },
        };
        const self = mkChar({ q: 0, r: 0 });
        const boss = { uid: "boss", character_id: "b1", q: 1, r: 0 } as MonsterSprite;
        const cells = new Map<string, "walkable">([["0,1", "walkable"]]);
        const r = getBronzeBoss1DynamicGuideText(game, [self, boss], cells as any);
        expect(r?.phase).toBe("skill");
    });
});
