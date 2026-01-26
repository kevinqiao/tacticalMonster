/**
 * 单元测试工具函数
 * 提供创建 mock 数据和辅助函数的工具
 */

import { GameBoss, GameMinion, GameMonster } from "../../../../types/monsterTypes";
import { GameModel, GameRound, GameTurn } from "../../../../types/gameTypes";
import { CharacterGetter } from "../../gameActionValidator";

/**
 * 创建模拟的 Convex ctx（简化版，用于单元测试）
 * 注意：实际的数据库操作需要 mock，这里只提供基本结构
 */
export function createMockCtx(): any {
    return {
        db: {
            query: (table: string) => ({
                withIndex: (index: string, callback: (q: any) => any) => ({
                    eq: (field: string, value: any) => ({
                        first: async () => null,
                        unique: async () => null,
                        collect: async () => [],
                    }),
                    filter: (callback: (q: any) => any) => ({
                        first: async () => null,
                        collect: async () => [],
                    }),
                }),
                insert: async (table: string, data: any) => ({ _id: `mock_${Date.now()}` }),
                patch: async (id: string, data: any) => true,
                delete: async (id: string) => true,
            }),
        },
    };
}

/**
 * 创建模拟的 GameMonster（玩家角色）
 */
export function createMockGameMonster(overrides?: Partial<GameMonster>): GameMonster {
    return {
        uid: "test_player_001",
        monsterId: "monster_001",
        name: "Test Monster",
        rarity: "Common",
        level: 5,
        stars: 1,
        stats: {
            hp: { current: 100, max: 100 },
            mp: { current: 50, max: 50 },
            attack: 20,
            defense: 10,
            speed: 5,
        },
        q: 0,
        r: 0,
        move_range: 3,
        attack_range: { min: 1, max: 2 },
        skills: ["skill_001"],
        skillCooldowns: {},
        statusEffects: [],
        status: "normal",
        ...overrides,
    };
}

/**
 * 创建模拟的 GameMinion（小怪）
 */
export function createMockGameMinion(overrides?: Partial<GameMinion>): GameMinion {
    return {
        uid: "boss",
        monsterId: "minion_001",
        minionId: "minion_guard_1",
        name: "Test Minion",
        rarity: "Common",
        level: 3,
        stars: 1,
        stats: {
            hp: { current: 50, max: 50 },
            attack: 15,
            defense: 8,
            speed: 4,
        },
        q: 5,
        r: 5,
        move_range: 2,
        attack_range: { min: 1, max: 1 },
        skills: [],
        skillCooldowns: {},
        statusEffects: [],
        status: "normal",
        ...overrides,
    };
}

/**
 * 创建模拟的 GameBoss
 */
export function createMockGameBoss(overrides?: Partial<GameBoss>): GameBoss {
    return {
        uid: "boss",
        monsterId: "boss_bronze_1",
        bossId: "boss_bronze_1",
        name: "Test Boss",
        rarity: "Epic",
        level: 10,
        stars: 3,
        stats: {
            hp: { current: 500, max: 500 },
            attack: 50,
            defense: 30,
            speed: 6,
        },
        q: 10,
        r: 10,
        move_range: 2,
        attack_range: { min: 1, max: 3 },
        minions: [],
        skills: ["boss_skill_001"],
        skillCooldowns: {},
        statusEffects: [],
        status: "normal",
        ...overrides,
    };
}

/**
 * 创建模拟的 GameModel
 */
export function createMockGameModel(overrides?: Partial<GameModel>): GameModel {
    const team: GameMonster[] = [
        createMockGameMonster({ monsterId: "monster_001", uid: "test_player_001" }),
        createMockGameMonster({ monsterId: "monster_002", uid: "test_player_001", q: 1, r: 0 }),
    ];

    const boss = createMockGameBoss();
    const minion = createMockGameMinion();
    boss.minions = [minion];

    const currentRound: GameRound = {
        no: 1,
        turns: [
            {
                uid: "test_player_001",
                monsterId: "monster_001",
                status: 1, // IN_PROGRESS
                order: 1,
            },
            {
                uid: "test_player_001",
                monsterId: "monster_002",
                status: 0, // OPEN
                order: 2,
            },
            {
                uid: "boss",
                monsterId: boss.monsterId,
                bossId: boss.bossId,
                status: 0, // OPEN
                order: 3,
            },
        ],
    };

    return {
        gameId: "test_game_001",
        stageId: "test_stage_001",
        uid: "test_player_001",
        teamPower: 1000,
        team,
        boss,
        map: {
            rows: 20,
            cols: 20,
            obstacles: [],
            disables: [],
        },
        status: 0, // waiting
        score: 0,
        lastUpdate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        currentRound,
        ...overrides,
    };
}

/**
 * 创建模拟的 CharacterGetter 实现
 */
export function createMockCharacterGetter(game: GameModel | null): CharacterGetter {
    return {
        getCharacter(
            monsterId?: string,
            bossId?: string,
            minionId?: string
        ): GameMonster | null {
            if (!game) return null;

            if (bossId) {
                if (bossId === game.boss.bossId) {
                    return game.boss as GameMonster;
                }
                return null;
            } else if (minionId) {
                const minion = game.boss.minions.find((m) => m.minionId === minionId);
                return minion || null;
            } else if (monsterId) {
                return game.team.find((m) => m.monsterId === monsterId) || null;
            }

            return null;
        },
        getAllCharacters(): GameMonster[] {
            if (!game) return [];
            const all: GameMonster[] = [...game.team];
            all.push(game.boss as GameMonster);
            game.boss.minions.forEach((minion) => all.push(minion));
            return all;
        },
    };
}

/**
 * 创建模拟的 RoundService getCurrentRound 返回数据
 */
export function createMockRoundInfo(
    gameId: string,
    roundNumber: number,
    currentTurn: GameTurn | null
): { roundDoc: any; currentTurn: GameTurn | null } {
    return {
        roundDoc: {
            _id: `round_${gameId}_${roundNumber}`,
            gameId,
            no: roundNumber,
            status: 0,
            turns: currentTurn ? [currentTurn] : [],
        },
        currentTurn,
    };
}

/**
 * 测试结果格式
 */
export interface TestResult {
    testName: string;
    success: boolean;
    errors: string[];
    steps: string[];
    data: any;
}

/**
 * 创建初始测试结果
 */
export function createTestResult(testName: string): TestResult {
    return {
        testName,
        success: false,
        errors: [],
        steps: [],
        data: {},
    };
}
