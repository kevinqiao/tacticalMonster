/**
 * useWalkAction Hook 单元测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWalkAction } from "../../../../service/handler/actions/useWalkAction";
import { createTestCharacter } from "../../testUtils";

// Mock dependencies
vi.mock("../../../utils/PathFind", () => ({
    findPath: vi.fn(() => [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
    ]),
}));

vi.mock("../../../utils/hexUtil", () => ({
    coordToPixel: vi.fn(() => ({ x: 100, y: 100 })),
}));

vi.mock("../../../../service/handler/utils/characterUtils", () => ({
    createCharacterIdentifiers: vi.fn(() => ({
        casterIdentifier: { monsterId: "monster_001" },
        targetIdentifiers: [],
    })),
}));

vi.mock("../../../../service/handler/utils/pathHighlightUtils", () => ({
    highlightPath: vi.fn(),
    clearPathHighlight: vi.fn(),
}));

vi.mock("../../../../service/handler/utils/validationUtils", () => ({
    canPerformAction: vi.fn(() => ({
        can: true,
        character: createTestCharacter(),
    })),
}));

describe("useWalkAction", () => {
    let game: any;
    let characters: any[];
    let gridCells: any[][];
    let mode: string;
    let convex: any;
    let playWalk: ReturnType<typeof vi.fn>;
    let handlePhaseChanges: ReturnType<typeof vi.fn>;
    let hexCell: any;

    beforeEach(() => {
        game = {
            gameId: "test_game_001",
            map: {
                direction: 0,
                cols: 8,
                rows: 7,
            },
        };
        characters = [createTestCharacter()];
        gridCells = Array(7).fill(null).map(() => Array(8).fill(null));
        mode = "play";
        convex = {
            mutation: vi.fn().mockResolvedValue({
                success: true,
                phaseChanges: {},
            }),
        };
        playWalk = vi.fn((character, path, onComplete) => {
            // 模拟动画完成
            setTimeout(() => {
                if (onComplete) onComplete();
            }, 0);
        });
        handlePhaseChanges = vi.fn().mockResolvedValue(undefined);
        hexCell = { width: 100, height: 100 };
    });

    it("应该成功执行移动", async () => {
        const { result } = renderHook(() =>
            useWalkAction(
                game,
                characters,
                gridCells,
                mode,
                convex,
                playWalk,
                handlePhaseChanges,
                hexCell
            )
        );

        const to = { q: 2, r: 0 };
        const walkPromise = result.current.walk(to);

        await waitFor(() => {
            expect(playWalk).toHaveBeenCalled();
        });

        await walkPromise;

        expect(convex.mutation).toHaveBeenCalled();
    });

    it("应该在验证失败时拒绝", async () => {
            const { canPerformAction } = await import("../../../../service/handler/utils/validationUtils");
        vi.mocked(canPerformAction).mockReturnValue({
            can: false,
            character: null,
        });

        const { result } = renderHook(() =>
            useWalkAction(
                game,
                characters,
                gridCells,
                mode,
                convex,
                playWalk,
                handlePhaseChanges,
                hexCell
            )
        );

        const to = { q: 2, r: 0 };
        await expect(result.current.walk(to)).rejects.toThrow();
    });

    it("应该在后端拒绝时回滚位置", async () => {
        convex.mutation = vi.fn().mockResolvedValue({
            success: false,
        });

        const character = createTestCharacter();
        character.container = { style: {} } as any;
        characters = [character];

        const { result } = renderHook(() =>
            useWalkAction(
                game,
                characters,
                gridCells,
                mode,
                convex,
                playWalk,
                handlePhaseChanges,
                hexCell
            )
        );

        const to = { q: 2, r: 0 };
        await expect(result.current.walk(to)).rejects.toThrow();
    });

    it("应该在后端错误时回滚位置", async () => {
        const error = new Error("网络错误");
        convex.mutation = vi.fn().mockRejectedValue(error);

        const character = createTestCharacter();
        character.container = { style: {} } as any;
        characters = [character];

        const { result } = renderHook(() =>
            useWalkAction(
                game,
                characters,
                gridCells,
                mode,
                convex,
                playWalk,
                handlePhaseChanges,
                hexCell
            )
        );

        const to = { q: 2, r: 0 };
        await expect(result.current.walk(to)).rejects.toThrow();
    });
});
