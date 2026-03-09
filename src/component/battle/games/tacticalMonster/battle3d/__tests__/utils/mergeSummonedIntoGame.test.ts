/**
 * mergeSummonedIntoGame 单元测试
 */

import { describe, expect, it } from "vitest";
import { mergeSummonedIntoGame } from "../../../utils/mergeSummonedIntoGame";
import {
    createTestGame,
    createTestSummonedCharacter,
} from "../testUtils";

describe("mergeSummonedIntoGame", () => {
    it("空数组应返回原 game 不变", () => {
        const game = createTestGame();
        const result = mergeSummonedIntoGame(game, []);
        expect(result).toBe(game);
        expect(result.team).toHaveLength(0);
        expect(result.boss.minions).toHaveLength(0);
    });

    it("玩家侧召唤应追加到 game.team", () => {
        const game = createTestGame();
        const summoned = createTestSummonedCharacter({
            uid: game.uid,
            identifier: { monsterId: "monster_001" },
            q: 1,
            r: 1,
        });

        const result = mergeSummonedIntoGame(game, [summoned]);

        expect(result.team).toHaveLength(1);
        expect(result.team[0].monsterId).toBe("monster_001");
        expect(result.team[0].q).toBe(1);
        expect(result.team[0].r).toBe(1);
        expect(result.boss.minions).toHaveLength(0);
    });

    it("Boss 侧召唤应追加到 game.boss.minions", () => {
        const game = createTestGame();
        const summoned = createTestSummonedCharacter({
            uid: "boss",
            minionId: "minion_001",
            identifier: { minionId: "minion_001" },
            q: 9,
            r: 9,
        });

        const result = mergeSummonedIntoGame(game, [summoned]);

        expect(result.boss.minions).toHaveLength(1);
        expect(result.boss.minions[0].minionId).toBe("minion_001");
        expect(result.boss.minions[0].q).toBe(9);
        expect(result.boss.minions[0].r).toBe(9);
        expect(result.team).toHaveLength(0);
    });

    it("混合 player + boss 召唤应正确分别追加", () => {
        const game = createTestGame();
        const playerSummon = createTestSummonedCharacter({
            uid: game.uid,
            identifier: { monsterId: "monster_001" },
            q: 2,
            r: 2,
        });
        const bossSummon = createTestSummonedCharacter({
            uid: "boss",
            minionId: "minion_001",
            character_id: "minion_001",
            identifier: { minionId: "minion_001" },
            q: 8,
            r: 8,
        });

        const result = mergeSummonedIntoGame(game, [playerSummon, bossSummon]);

        expect(result.team).toHaveLength(1);
        expect(result.team[0].monsterId).toBe("monster_001");
        expect(result.boss.minions).toHaveLength(1);
        expect(result.boss.minions[0].minionId).toBe("minion_001");
    });
});
