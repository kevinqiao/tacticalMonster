import { describe, expect, it } from "vitest";
import { PEDAGOGY_BY_RULE_ID } from "../../config/pedagogyByRuleId";

/**
 * 挑战链上 bossMechanicTier 单调不减（与 docs/pedagogy_stage_matrix.md 一致）
 */
describe("pedagogy stage chain", () => {
    const bronze = [1, 2, 3, 4, 5].map((n) => `monster_rumble_challenge_bronze_boss_${n}`);
    const silver = [1, 2, 3, 4, 5].map((n) => `monster_rumble_challenge_silver_boss_${n}`);
    const gold = [1, 2, 3, 4, 5].map((n) => `monster_rumble_challenge_gold_boss_${n}`);

    function assertNonDecreasing(ids: string[]) {
        let prev = -1;
        for (const id of ids) {
            const b = PEDAGOGY_BY_RULE_ID[id]?.bossMechanicTier;
            expect(b, id).toBeDefined();
            expect(b as number).toBeGreaterThanOrEqual(prev);
            prev = b as number;
        }
    }

    it("bronze chain B tier non-decreasing", () => {
        assertNonDecreasing(bronze);
    });

    it("silver chain B tier non-decreasing", () => {
        assertNonDecreasing(silver);
    });

    it("gold chain B tier non-decreasing", () => {
        assertNonDecreasing(gold);
    });

    it("filterSkillIds respects allowedSkillIds for bronze 1", async () => {
        const { filterSkillIdsForPedagogy } = await import("../../utils/pedagogySkillFilter");
        const out = filterSkillIdsForPedagogy("monster_rumble_challenge_bronze_boss_1", [
            "basic_attack",
            "griffin_claw_attack",
        ]);
        expect(out).toEqual(["basic_attack"]);
    });
});
