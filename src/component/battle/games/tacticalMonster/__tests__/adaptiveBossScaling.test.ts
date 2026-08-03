import { describe, expect, it } from "vitest";
import {
    computeBossStatScale,
    DEFAULT_BOSS_SCALING_TUNING,
} from "../../../../../convex/tacticalMonster/convex/data/adaptiveBossScaling";

describe("computeBossStatScale", () => {
    it("defaults match legacy linear scale for typical inputs", () => {
        const baseBossPower = 5000;
        const playerPower = 5000;
        const difficulty = 1.0;
        const legacy = Math.max(
            0.1,
            Math.min(10, (playerPower * difficulty) / baseBossPower)
        );
        const next = computeBossStatScale(playerPower, baseBossPower, difficulty, undefined);
        expect(next).toBeCloseTo(legacy, 10);
    });

    it("applies sublinear exponent so boss grows slower than player", () => {
        const base = 4000;
        const linear = computeBossStatScale(8000, base, 1, { scalingExponent: 1 });
        const sub = computeBossStatScale(8000, base, 1, { scalingExponent: 0.65 });
        expect(sub).toBeLessThan(linear);
    });

    it("respects minMultiplier / maxMultiplier narrow clamp after global clamp", () => {
        const s = computeBossStatScale(5000, 1000, 2, {
            minMultiplier: 0.5,
            maxMultiplier: 2,
        });
        expect(s).toBeGreaterThanOrEqual(0.5);
        expect(s).toBeLessThanOrEqual(2);
    });

    it("exposes stable defaults", () => {
        expect(DEFAULT_BOSS_SCALING_TUNING.scalingExponent).toBe(1);
        expect(DEFAULT_BOSS_SCALING_TUNING.referencePower).toBe(1000);
    });
});
