import { describe, expect, it, beforeEach } from "vitest";
import { advanceAfterMatch, matchGuideStep } from "../../utils/pedagogyGuideFlow";
import { getGuideStorageKey, isGuideDone, markGuideDone } from "../../utils/pedagogyGuideStorage";
import type { PedagogyGuideStep } from "../../types/stageRuleTypes";

const sampleSteps: PedagogyGuideStep[] = [
    { id: "a", text: "move", eventType: "move" },
    { id: "b", text: "skill", eventType: "skillSelect", expectedSkillId: "basic_attack" },
    { id: "c", text: "target", eventType: "targetSelect" },
];

describe("pedagogyGuideFlow helpers", () => {
    it("matchGuideStep respects event type and expectedSkillId", () => {
        expect(matchGuideStep(sampleSteps[0], { type: "move" })).toBe(true);
        expect(matchGuideStep(sampleSteps[0], { type: "skillSelect" })).toBe(false);
        expect(matchGuideStep(sampleSteps[1], { type: "skillSelect", skillId: "basic_attack" })).toBe(true);
        expect(matchGuideStep(sampleSteps[1], { type: "skillSelect", skillId: "other" })).toBe(false);
    });

    it("advanceAfterMatch completes on last step", () => {
        expect(advanceAfterMatch(sampleSteps, 2)).toEqual({ nextIndex: null, completed: true });
        expect(advanceAfterMatch(sampleSteps, 0)).toEqual({ nextIndex: 1, completed: false });
    });
});

describe("pedagogyGuideStorage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("getGuideStorageKey uses guest when uid missing", () => {
        expect(getGuideStorageKey(undefined, "rule_a")).toBe("tm:guide:v1:guest:rule_a");
    });

    it("markGuideDone and isGuideDone round-trip per ruleId", () => {
        expect(isGuideDone("u1", "rule_x")).toBe(false);
        markGuideDone("u1", "rule_x");
        expect(isGuideDone("u1", "rule_x")).toBe(true);
        expect(isGuideDone("u2", "rule_x")).toBe(false);
    });

    it("isGuideDone returns true when ruleId undefined", () => {
        expect(isGuideDone("u1", undefined)).toBe(true);
    });
});
