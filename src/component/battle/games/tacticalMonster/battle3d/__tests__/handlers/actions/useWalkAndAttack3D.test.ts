/**
 * useWalkAndAttack3D Hook 单元测试
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWalkAndAttack3D } from "../../../handler/actions/useWalkAndAttack3D";
import type { MonsterSprite } from "../../../../types/CombatTypes";
import type { BattleMapDimension } from "../../../utils/coordinate3DUtils";
import {
    createTestCharacter,
    createTestGame,
    createTestPhaseChanges,
} from "../../testUtils";
import { findPath } from "../../../../utils/PathFind";

const setCharacterAnimatingMock = vi.fn();
vi.mock("../../../../service/CombatManager", () => ({
    useCombatManager: () => ({
        setCharacterAnimating: setCharacterAnimatingMock,
    }),
}));

vi.mock("../../../../utils/PathFind", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../../../utils/PathFind")>();
    return {
        ...actual,
        findPath: vi.fn(),
    };
});

const MAP_DIMENSION: BattleMapDimension = {
    hexWidth: 50,
    hexHeight: 44,
    width: 250,
    height: 220,
    cols: 5,
    rows: 5,
    isPortrait: false,
};

function createWalkableGrid(rows: number, cols: number, disableCells: Array<{ q: number; r: number }> = []) {
    const cells: Array<Array<{ q: number; r: number; disable?: boolean }>> = [];
    for (let r = 0; r < rows; r++) {
        const row: Array<{ q: number; r: number; disable?: boolean }> = [];
        for (let q = 0; q < cols; q++) {
            const disabled = disableCells.some((d) => d.q === q && d.r === r);
            row.push({ q, r, disable: disabled });
        }
        cells.push(row);
    }
    return cells;
}

describe("useWalkAndAttack3D", () => {
    let game: any;
    let characters: MonsterSprite[];
    let gridCells: any[][];
    let convex: { mutation: ReturnType<typeof vi.fn> };
    let playWalk: ReturnType<typeof vi.fn>;
    let playSkill: ReturnType<typeof vi.fn>;
    let setSkillSyncState: ReturnType<typeof vi.fn>;
    let handlePhaseChanges: ReturnType<typeof vi.fn>;
    let refreshWalkableFromPosition: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        setCharacterAnimatingMock.mockClear();
        vi.mocked(findPath).mockImplementation((grid, start, goal) => {
            const path = [{ q: start.q, r: start.r }, { q: goal.q, r: goal.r }];
            return path as any;
        });

        game = createTestGame({
            currentRound: {
                no: 1,
                turns: [
                    { uid: "test_user", character_id: "test_monster_001", status: 1, stepsUsed: 0 },
                ],
            },
        });

        characters = [
            createTestCharacter({ q: 0, r: 0, monsterId: "monster_001", uid: "test_user" }),
            createTestCharacter({ q: 2, r: 0, monsterId: "boss_bronze_1", uid: "boss", character_id: "boss_001" }),
        ];

        gridCells = createWalkableGrid(5, 5);

        convex = {
            mutation: vi.fn().mockResolvedValue({
                ok: true,
                success: true,
                phaseChanges: createTestPhaseChanges(),
            }),
        };

        playWalk = vi.fn((_char: any, _path: any, onComplete: () => void) => {
            onComplete();
        });

        playSkill = vi.fn(() => ({
            kill: vi.fn(),
            pause: vi.fn(),
            isActive: vi.fn(() => false),
        }));

        setSkillSyncState = vi.fn();
        handlePhaseChanges = vi.fn().mockResolvedValue(undefined);
        refreshWalkableFromPosition = vi.fn();
    });

    const renderHookWithDefaults = (overrides: Partial<{
        game: any;
        characters: MonsterSprite[];
        gridCells: any[][];
        mode: string;
        mapDimension: BattleMapDimension | null;
    }> = {}) => {
        return renderHook(
            () =>
                useWalkAndAttack3D(
                    "game" in overrides ? overrides.game : game,
                    ("characters" in overrides ? overrides.characters ?? characters : characters),
                    ("gridCells" in overrides ? overrides.gridCells : gridCells) as any[][],
                    overrides.mode ?? "play",
                    convex,
                    playWalk,
                    playSkill,
                    setSkillSyncState,
                    handlePhaseChanges,
                    ("mapDimension" in overrides ? overrides.mapDimension : MAP_DIMENSION) as BattleMapDimension | null,
                    refreshWalkableFromPosition
                ),
            {}
        );
    };

    describe("验证失败", () => {
        it("mode 为 watch 时应 reject，不调用 playWalk 和 convex.mutation", async () => {
            const { result } = renderHookWithDefaults({ mode: "watch" });
            const target = characters[1];

            await expect(
                result.current.walkAndAttack({ q: 1, r: 0 }, "basic_attack", target)
            ).rejects.toThrow("Cannot perform walkAndAttack");

            expect(playWalk).not.toHaveBeenCalled();
            expect(convex.mutation).not.toHaveBeenCalled();
        });

        it("game 为 null 时应 reject", async () => {
            const { result } = renderHookWithDefaults({ game: null });
            const target = characters[1];

            await expect(
                result.current.walkAndAttack({ q: 1, r: 0 }, "basic_attack", target)
            ).rejects.toThrow("Cannot perform walkAndAttack");

            expect(playWalk).not.toHaveBeenCalled();
            expect(convex.mutation).not.toHaveBeenCalled();
        });

        it("characters 为空时应 reject", async () => {
            const { result } = renderHookWithDefaults({ characters: [] });
            const target = characters[1];

            await expect(
                result.current.walkAndAttack({ q: 1, r: 0 }, "basic_attack", target)
            ).rejects.toThrow("Cannot perform walkAndAttack");

            expect(playWalk).not.toHaveBeenCalled();
            expect(convex.mutation).not.toHaveBeenCalled();
        });

        it("gridCells 为 null 时应 reject", async () => {
            const { result } = renderHookWithDefaults({ gridCells: null as any });
            const target = characters[1];

            await expect(
                result.current.walkAndAttack({ q: 1, r: 0 }, "basic_attack", target)
            ).rejects.toThrow("Cannot perform walkAndAttack");

            expect(playWalk).not.toHaveBeenCalled();
            expect(convex.mutation).not.toHaveBeenCalled();
        });

        it("mapDimension 为 null 时应 reject", async () => {
            const { result } = renderHookWithDefaults({ mapDimension: null });
            const target = characters[1];

            await expect(
                result.current.walkAndAttack({ q: 1, r: 0 }, "basic_attack", target)
            ).rejects.toThrow("Cannot perform walkAndAttack");

            expect(playWalk).not.toHaveBeenCalled();
            expect(convex.mutation).not.toHaveBeenCalled();
        });
    });

    describe("寻路失败", () => {
        it("findPath 返回 null 时应 reject，不调用 playWalk", async () => {
            vi.mocked(findPath).mockReturnValue(null as any);

            const { result } = renderHookWithDefaults();
            const target = characters[1];

            await expect(
                result.current.walkAndAttack({ q: 1, r: 0 }, "basic_attack", target)
            ).rejects.toThrow("Cannot find path");

            expect(playWalk).not.toHaveBeenCalled();
            expect(convex.mutation).not.toHaveBeenCalled();
        });
    });

    describe("成功流程", () => {
        it("应调用 playWalk、playSkill、setSkillSyncState，更新 character 坐标并 resolve", async () => {
            const { result } = renderHookWithDefaults();
            const target = characters[1];
            const character = characters[0];

            await act(async () => {
                await result.current.walkAndAttack(
                    { q: 1, r: 0 },
                    "basic_attack",
                    target
                );
            });

            expect(playWalk).toHaveBeenCalledWith(
                character,
                expect.any(Array),
                expect.any(Function)
            );
            expect(playSkill).toHaveBeenCalledWith(
                character,
                "basic_attack",
                [target],
                expect.any(Function)
            );
            expect(setSkillSyncState).toHaveBeenCalled();
            expect(character.q).toBe(1);
            expect(character.r).toBe(0);
            expect(refreshWalkableFromPosition).toHaveBeenCalled();
            expect(setCharacterAnimatingMock).toHaveBeenCalledWith(null);
        });
    });

    describe("后端拒绝", () => {
        it("convex.mutation 返回 ok:false 时应 rollback、setCharacterAnimating(null)、reject", async () => {
            convex.mutation.mockResolvedValue({ ok: false, error: "invalid_move" });
            (characters[0] as any).ref3D = {
                groupRef: { current: { position: { x: 0, y: 0, z: 0 } } },
            };

            const { result } = renderHookWithDefaults();
            const target = characters[1];
            const gsap = (await import("gsap")).default;

            await expect(
                result.current.walkAndAttack({ q: 1, r: 0 }, "basic_attack", target)
            ).rejects.toThrow("WalkAndAttack rejected");

            expect(gsap.to).toHaveBeenCalled();
            expect(refreshWalkableFromPosition).toHaveBeenCalled();

            expect(setCharacterAnimatingMock).toHaveBeenCalledWith(null);
        });

        it("convex.mutation 返回 success:false 时应 reject", async () => {
            convex.mutation.mockResolvedValue({
                ok: true,
                success: false,
                error: "skill_failed",
            });

            const { result } = renderHookWithDefaults();
            const target = characters[1];

            await expect(
                result.current.walkAndAttack({ q: 1, r: 0 }, "basic_attack", target)
            ).rejects.toThrow("WalkAndAttack rejected");
        });
    });

    describe("后端异常", () => {
        it("convex.mutation reject 时应 rollback、setCharacterAnimating(null)、reject", async () => {
            const networkError = new Error("Network error");
            convex.mutation.mockRejectedValue(networkError);

            (characters[0] as any).ref3D = {
                groupRef: { current: { position: { x: 0, y: 0, z: 0 } } },
            };

            const { result } = renderHookWithDefaults();
            const target = characters[1];
            const gsap = (await import("gsap")).default;

            await expect(
                result.current.walkAndAttack({ q: 1, r: 0 }, "basic_attack", target)
            ).rejects.toThrow("Network error");

            expect(gsap.to).toHaveBeenCalled();
            expect(refreshWalkableFromPosition).toHaveBeenCalled();
            expect(setCharacterAnimatingMock).toHaveBeenCalledWith(null);
        });
    });
});
