/**
 * useSkillSync Hook 单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useSkillSync } from "../../../service/handler/hooks/useSkillSync";
import { createTestCharacter, createTestStateChanges, createTestPhaseChanges } from "../../testUtils";
import { MonsterSprite } from "../../../types/CombatTypes";
import { UseSkillResponse } from "../../../types/backendResponseTypes";

// Mock dependencies
vi.mock("../../../service/handler/utils/backendResponseUtils", () => ({
    applyStateChanges: vi.fn(),
    calculateKillScoreIfNeeded: vi.fn(),
    handleBackendError: vi.fn(),
}));

vi.mock("../../../service/handler/utils/visualFeedbackUtils", () => ({
    clearVisualFeedback: vi.fn(),
}));

describe("useSkillSync", () => {
    let characters: MonsterSprite[];
    let handlePhaseChanges: ReturnType<typeof vi.fn>;
    let handlePassiveSkillAnimations: ReturnType<typeof vi.fn>;
    let calculateActionScore: ReturnType<typeof vi.fn>;
    let onError: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        characters = [
            createTestCharacter({ monsterId: "monster_001" }),
            createTestCharacter({ monsterId: "monster_002" }),
        ];
        handlePhaseChanges = vi.fn().mockResolvedValue(undefined);
        handlePassiveSkillAnimations = vi.fn();
        calculateActionScore = vi.fn().mockReturnValue(100);
        onError = vi.fn();
    });

    it("应该在动画完成后应用状态更新", async () => {
        const { result } = renderHook(() =>
            useSkillSync(
                handlePhaseChanges,
                handlePassiveSkillAnimations,
                characters,
                calculateActionScore,
                onError
            )
        );

        const character = characters[0];
        const target = characters[1];
        const skillId = "fire_ball";

        const mockTimeline = {
            isActive: vi.fn(() => false),
            kill: vi.fn(),
            pause: vi.fn(),
        };

        const backendResponse: UseSkillResponse = {
            ok: true,
            data: {
                success: true,
                phaseChanges: createTestPhaseChanges(),
            },
        };

        // 设置初始状态：动画完成，后端响应到达
        act(() => {
            result.current.setSkillSyncState({
                animationCompleted: true,
                backendResponse,
                activeSkillTimeline: mockTimeline as any,
                character,
                target,
                skillId,
            });
        });

        await waitFor(() => {
            expect(handlePhaseChanges).toHaveBeenCalled();
        });
    });

    it("应该处理后端响应错误", async () => {
        const { handleBackendError } = await import("../../../service/handler/utils/backendResponseUtils");

        const { result } = renderHook(() =>
            useSkillSync(
                handlePhaseChanges,
                handlePassiveSkillAnimations,
                characters,
                calculateActionScore,
                onError
            )
        );

        const character = characters[0];
        const target = characters[1];

        const backendResponse: UseSkillResponse = {
            ok: true,
            data: {
                success: false,
                message: "技能使用失败",
            },
        };

        act(() => {
            result.current.setSkillSyncState({
                animationCompleted: true,
                backendResponse,
                activeSkillTimeline: undefined,
                character,
                target,
                skillId: "fire_ball",
            });
        });

        await waitFor(() => {
            expect(handleBackendError).toHaveBeenCalled();
        });
    });

    it("应该在动画未完成时处理错误", async () => {
        const { clearVisualFeedback } = await import("../../../service/handler/utils/visualFeedbackUtils");

        const { result } = renderHook(() =>
            useSkillSync(
                handlePhaseChanges,
                handlePassiveSkillAnimations,
                characters,
                calculateActionScore,
                onError
            )
        );

        const character = characters[0];
        const target = characters[1];

        const mockTimeline = {
            isActive: vi.fn(() => true),
            kill: vi.fn(),
            pause: vi.fn(),
            duration: vi.fn(() => 1000),
        };

        const backendResponse: UseSkillResponse = {
            ok: false,
            error: "网络错误",
        };

        act(() => {
            result.current.setSkillSyncState({
                animationCompleted: false,
                backendResponse,
                activeSkillTimeline: mockTimeline as any,
                character,
                target,
                skillId: "fire_ball",
            });
        });

        await waitFor(() => {
            expect(mockTimeline.pause).toHaveBeenCalled();
            expect(mockTimeline.kill).toHaveBeenCalled();
            expect(clearVisualFeedback).toHaveBeenCalled();
            expect(onError).toHaveBeenCalledWith("网络错误");
        });
    });

    it("应该处理状态同步逻辑", async () => {
        const { applyStateChanges } = await import("../../../service/handler/utils/backendResponseUtils");

        const { result } = renderHook(() =>
            useSkillSync(
                handlePhaseChanges,
                handlePassiveSkillAnimations,
                characters,
                calculateActionScore,
                onError
            )
        );

        const character = characters[0];
        const target = characters[1];

        const backendResponse: UseSkillResponse = {
            ok: true,
            data: {
                success: true,
                phaseChanges: createTestPhaseChanges(),
            },
        };

        act(() => {
            result.current.setSkillSyncState({
                animationCompleted: true,
                backendResponse,
                activeSkillTimeline: undefined,
                character,
                target,
                skillId: "fire_ball",
            });
        });

        await waitFor(() => {
            expect(applyStateChanges).toHaveBeenCalled();
        });
    });

    it("应该处理被动技能动画", async () => {
        const { result } = renderHook(() =>
            useSkillSync(
                handlePhaseChanges,
                handlePassiveSkillAnimations,
                characters,
                calculateActionScore,
                onError
            )
        );

        const character = characters[0];
        const target = characters[1];

        const mockTimeline = {
            isActive: vi.fn(() => false),
            kill: vi.fn(),
            pause: vi.fn(),
        };

        const backendResponse: UseSkillResponse = {
            ok: true,
            data: {
                success: true,
                phaseChanges: createTestPhaseChanges(),
            },
        };

        act(() => {
            result.current.setSkillSyncState({
                animationCompleted: true,
                backendResponse,
                activeSkillTimeline: mockTimeline as any,
                character,
                target,
                skillId: "fire_ball",
            });
        });

        await waitFor(() => {
            expect(handlePassiveSkillAnimations).toHaveBeenCalled();
        });
    });

    it("应该处理 PhaseChanges", async () => {
        const { result } = renderHook(() =>
            useSkillSync(
                handlePhaseChanges,
                handlePassiveSkillAnimations,
                characters,
                calculateActionScore,
                onError
            )
        );

        const character = characters[0];
        const target = characters[1];

        const phaseChanges = createTestPhaseChanges();
        const backendResponse: UseSkillResponse = {
            ok: true,
            data: {
                success: true,
                phaseChanges,
            },
        };

        act(() => {
            result.current.setSkillSyncState({
                animationCompleted: true,
                backendResponse,
                activeSkillTimeline: undefined,
                character,
                target,
                skillId: "fire_ball",
            });
        });

        await waitFor(() => {
            expect(handlePhaseChanges).toHaveBeenCalledWith(phaseChanges);
        });
    });
});
