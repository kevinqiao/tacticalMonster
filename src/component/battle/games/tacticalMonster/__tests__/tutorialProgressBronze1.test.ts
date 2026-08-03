/**
 * 第一关 guide_only：须完成 guideFlow（移动 + 普攻）后 isTutorialGuideComplete 才为 true。
 */
import { describe, expect, it } from "vitest";
import { PEDAGOGY_BY_RULE_ID } from "../config/pedagogyByRuleId";
import {
    eventFromUseSkill,
    isTutorialGuideComplete,
    mergeTutorialProgress,
} from "../../../../../convex/tacticalMonster/convex/utils/tutorialProgressUtils";

const bronze1 = PEDAGOGY_BY_RULE_ID["monster_rumble_challenge_bronze_boss_1"];

describe("bronze_boss_1 tutorial progress (guide_only)", () => {
    it("completes linear guide after move then cast(basic_attack)", () => {
        expect(bronze1?.tutorialWinMode).toBe("guide_only");
        expect(bronze1?.guideFlow?.length).toBe(2);

        let p = mergeTutorialProgress(bronze1, undefined, { type: "move" });
        expect(p.nextGuideStepIndex).toBe(1);
        expect(isTutorialGuideComplete(bronze1, p)).toBe(false);

        p = mergeTutorialProgress(bronze1, p, { type: "cast", skillId: "basic_attack" });
        expect(p.nextGuideStepIndex).toBe(2);
        expect(isTutorialGuideComplete(bronze1, p)).toBe(true);
    });

    it("does not complete if boss is killed (cast) without recorded move", () => {
        const onlyCast = mergeTutorialProgress(bronze1, undefined, {
            type: "cast",
            skillId: "basic_attack",
        });
        expect(onlyCast.nextGuideStepIndex).toBe(0);
        expect(isTutorialGuideComplete(bronze1, onlyCast)).toBe(false);
    });

    it("eventFromUseSkill emits cast for second step (not targetSelect)", () => {
        const afterMove = mergeTutorialProgress(bronze1, undefined, { type: "move" });
        const ev = eventFromUseSkill(bronze1, afterMove, "basic_attack", true);
        expect(ev).toEqual({ type: "cast", skillId: "basic_attack" });
    });
});
