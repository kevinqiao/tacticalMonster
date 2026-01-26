/**
 * useSkillAction Hook 单元测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSkillAction } from "../../../service/handler/actions/useSkillAction";
import { createTestCharacter } from "../../testUtils";

// Mock dependencies
vi.mock("../../../service/handler/utils/characterUtils", () => ({
    createCharacterIdentifiers: vi.fn(() => ({
        casterIdentifier: { monsterId: "monster_001" },
        targetIdentifiers: [{ bossId: "boss_001" }],
    })),
}));

vi.mock("../../../service/handler/utils/validationUtils", () => ({
    canPerformAction: vi.fn(() => ({
        can: true,
        character: createTestCharacter(),
    })),
}));

vi.mock("../../../service/handler/utils/visualFeedbackUtils", () => ({
    applyVisualFeedback: vi.fn(),
    clearVisualFeedback: vi.fn(),
}));

describe("useSkillAction", () => {
    let game: any;
    let characters: any[];
    let mode: string;
    let convex: any;
    let playSkill: ReturnType<typeof vi.fn>;
    let handlePhaseChanges: ReturnType<typeof vi.fn>;
    let setSkillSyncState: ReturnType<typeof vi.fn>;
    let calculateActionScore: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        game = {
            gameId: "test_game_001",
            currentRound: {
                turns: [],
            },
        };
        characters = [createTestCharacter()];
        mode = "play";
        convex = {
            mutation: vi.fn().mockResolvedValue({
                ok: true,
                data: {
                    success: true,
                    phaseChanges: {},
                },
            }),
        };
        playSkill = vi.fn(() => ({
            kill: vi.fn(),
            pause: vi.fn(),
            isActive: vi.fn(() => false),
        }));
        handlePhaseChanges = vi.fn().mockResolvedValue(undefined);
        setSkillSyncState = vi.fn();
        calculateActionScore = vi.fn().mockReturnValue(100);
    });

    it("应该调用 useSkill 并设置同步状态", async () => {
        const { result } = renderHook(() =>
            useSkillAction(
                game,
                characters,
                mode,
                convex,
                playSkill,
                handlePhaseChanges,
                setSkillSyncState,
                calculateActionScore
            )
        );

        const target = createTestCharacter({ monsterId: "monster_002" });
        await result.current.useSkill("fire_ball", target);

        expect(playSkill).toHaveBeenCalled();
        expect(setSkillSyncState).toHaveBeenCalled();
        expect(convex.mutation).toHaveBeenCalled();
    });

    it("应该在验证失败时返回", async () => {
            const { canPerformAction } = await import("../../../service/handler/utils/validationUtils");
        vi.mocked(canPerformAction).mockReturnValue({
            can: false,
            character: null,
        });

        const { result } = renderHook(() =>
            useSkillAction(
                game,
                characters,
                mode,
                convex,
                playSkill,
                handlePhaseChanges,
                setSkillSyncState,
                calculateActionScore
            )
        );

        await result.current.useSkill("fire_ball");

        expect(playSkill).not.toHaveBeenCalled();
        expect(setSkillSyncState).not.toHaveBeenCalled();
    });

    it.skip("应该处理后端请求错误", async () => {
        // 注意：错误处理主要在 useSkillSync 中处理，详细的错误处理测试在 useSkillSync.test.ts 中
        // 这里跳过测试，因为错误处理逻辑已经在 useSkillSync.test.ts 中充分测试
    });
});
