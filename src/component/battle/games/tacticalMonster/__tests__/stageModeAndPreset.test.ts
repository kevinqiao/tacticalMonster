import { getTournamentConfig } from "@/convex/tournament/convex/data/tournamentConfigs";
import { describe, expect, it } from "vitest";
import { STAGE_RULE_CONFIGS, getStageRuleConfig } from "../config/stageRuleConfigs";
import { pickScoreTier } from "../utils/rewardPolicyPick";
import { validateStageRuleModeConstraints } from "../utils/stageRuleValidation";

/** Bronze+Silver 教案链（与 stageRuleConfigs / pedagogy 一致） */
const TUTORIAL_RULE_IDS = [
    "monster_rumble_challenge_bronze_boss_1",
    "monster_rumble_challenge_bronze_boss_2",
    "monster_rumble_challenge_bronze_boss_3",
    "monster_rumble_challenge_bronze_boss_4",
    "monster_rumble_challenge_bronze_boss_5",
    "monster_rumble_challenge_silver_boss_1",
    "monster_rumble_challenge_silver_boss_2",
    "monster_rumble_challenge_silver_boss_3",
    "monster_rumble_challenge_silver_boss_4",
    "monster_rumble_challenge_silver_boss_5",
    "monster_rumble_challenge_gold_boss_1",
    "monster_rumble_challenge_gold_boss_2",
    "monster_rumble_challenge_gold_boss_3",
    "monster_rumble_challenge_gold_boss_4",
    "monster_rumble_challenge_gold_boss_5",
] as const;

describe("stage mode & team preset (target state)", () => {
    it("merged STAGE_RULE_CONFIGS satisfy mode / teamPreset constraints", () => {
        const errs: string[] = [];
        for (const ruleId of Object.keys(STAGE_RULE_CONFIGS)) {
            const merged = getStageRuleConfig(ruleId);
            expect(merged).toBeTruthy();
            errs.push(...validateStageRuleModeConstraints(merged!));
        }
        expect(errs, errs.join("\n")).toEqual([]);
    });

    it("tutorial chain: override + one_time_clear + hideTeamLayout + skills ⊆ allowedSkillIds", () => {
        for (const ruleId of TUTORIAL_RULE_IDS) {
            const r = getStageRuleConfig(ruleId);
            expect(r, ruleId).toBeTruthy();
            expect(getTournamentConfig(ruleId)?.mode, ruleId).toBe("tutorial");
            expect(r?.uiRules?.hideTeamLayout, ruleId).toBe(true);
            expect(r?.rewardPolicy?.type, ruleId).toBe("one_time_clear");
            expect(r?.teamPreset?.mode, ruleId).toBe("override");
            expect(r?.teamPreset?.slots?.length, ruleId).toBeGreaterThan(0);
            const allowed = r?.pedagogy?.allowedSkillIds ?? [];
            expect(allowed.length, `${ruleId} needs pedagogy.allowedSkillIds`).toBeGreaterThan(0);
            for (const slot of r?.teamPreset?.slots ?? []) {
                for (const sk of slot.unlockSkills ?? []) {
                    expect(allowed.includes(sk), `${ruleId} skill ${sk} not in allowedSkillIds`).toBe(true);
                }
            }
        }
    });

    it("bronze_1 remains single-slot P0 tutorial", () => {
        const r = getStageRuleConfig("monster_rumble_challenge_bronze_boss_1");
        expect(r?.teamPreset?.slots?.length).toBe(1);
    });

    it("solo challenge omits teamPreset; may use debugTeamProfileKey on labs", () => {
        const arena = getStageRuleConfig("monster_rumble_arena_bronze");
        expect(arena?.teamPreset).toBeUndefined();
        expect(arena?.rewardPolicy?.type).toBe("score_tiers");
        const lab1 = getStageRuleConfig("monster_rumble_solo_lab_1");
        expect(lab1?.teamPreset).toBeUndefined();
        expect(lab1?.debugTeamProfileKey).toBe("default");
    });

    it("gold_2 closes P5 loop with cleanse", () => {
        const r = getStageRuleConfig("monster_rumble_challenge_gold_boss_2");
        const allowed = r?.pedagogy?.allowedSkillIds ?? [];
        const supportSlot = r?.teamPreset?.slots?.find((s) => s.monsterId === "monster_008");
        expect(allowed.includes("cleanse")).toBe(true);
        expect(supportSlot?.unlockSkills?.includes("cleanse")).toBe(true);
    });

    it("pickScoreTier picks highest qualifying tier", () => {
        const tiers = [
            { minScore: 100, rewardKey: "a" },
            { minScore: 50, rewardKey: "b" },
            { minScore: 0, rewardKey: "c" },
        ];
        expect(pickScoreTier(120, tiers)?.rewardKey).toBe("a");
        expect(pickScoreTier(60, tiers)?.rewardKey).toBe("b");
        expect(pickScoreTier(10, tiers)?.rewardKey).toBe("c");
    });
});
