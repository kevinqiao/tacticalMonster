// 这些函数现在在 base.ts 中，测试需要直接测试 base.ts 中的方法
// 或者创建专门的测试文件来测试 base.ts 中的功能

// 模拟数据库上下文
const mockCtx = {
    db: {
        query: (table: string) => ({
            withIndex: (indexName: string, callback: (q: any) => any) => ({
                collect: () => mockTournaments,
                filter: (callback: (q: any) => any) => ({
                    collect: () => mockPlayerTournaments
                })
            }),
            get: (id: string) => mockTournaments.find((t: any) => t._id === id)
        })
    }
};

// 模拟数据
const mockTournaments = [
    {
        _id: "tournament1",
        tournamentType: "daily_quick_match",
        gameType: "ludo",
        status: "open",
        segmentName: "bronze",
        config: {
            independent: false,
            matchRules: {
                maxPlayers: 4
            }
        },
        createdAt: "2024-01-01T10:00:00.000Z"
    },
    {
        _id: "tournament2",
        tournamentType: "daily_quick_match",
        gameType: "ludo",
        status: "open",
        segmentName: "silver",
        config: {
            independent: true,
            matchRules: {
                maxPlayers: 1
            }
        },
        createdAt: "2024-01-01T11:00:00.000Z"
    },
    {
        _id: "tournament3",
        tournamentType: "weekly_championship",
        gameType: "solitaire",
        status: "open",
        segmentName: "gold",
        config: {
            independent: false,
            matchRules: {
                maxPlayers: 8
            }
        },
        createdAt: "2024-01-01T12:00:00.000Z"
    }
];

const mockPlayerTournaments = [
    {
        _id: "pt1",
        uid: "user1",
        tournamentId: "tournament1",
        status: "active"
    },
    {
        _id: "pt2",
        uid: "user2",
        tournamentId: "tournament1",
        status: "active"
    },
    {
        _id: "pt3",
        uid: "user3",
        tournamentId: "tournament3",
        status: "active"
    }
];

const mockNow = {
    iso: "2024-01-01T12:00:00.000Z",
    localDate: new Date("2024-01-01T12:00:00.000Z")
};

describe("TournamentFinder", () => {
    describe("findExistingNonIndependentTournament", () => {
        it("应该找到非独立锦标赛", async () => {
            const tournament = await findExistingNonIndependentTournament(mockCtx as any, {
                tournamentType: "daily_quick_match",
                gameType: "ludo",
                segmentName: "bronze",
                now: mockNow
            });

            expect(tournament).toBeDefined();
            expect(tournament?._id).toBe("tournament1");
            expect(tournament?.config.independent).toBe(false);
        });

        it("应该过滤掉独立锦标赛", async () => {
            const tournament = await findExistingNonIndependentTournament(mockCtx as any, {
                tournamentType: "daily_quick_match",
                gameType: "ludo",
                segmentName: "silver",
                now: mockNow
            });

            expect(tournament).toBeNull();
        });

        it("应该返回最新的锦标赛", async () => {
            const tournament = await findExistingNonIndependentTournament(mockCtx as any, {
                tournamentType: "weekly_championship",
                gameType: "solitaire",
                now: mockNow
            });

            expect(tournament).toBeDefined();
            expect(tournament?._id).toBe("tournament3");
        });
    });

    describe("findJoinableMultiPlayerTournament", () => {
        it("应该找到可加入的多人锦标赛", async () => {
            const tournament = await findJoinableMultiPlayerTournament(mockCtx as any, {
                tournamentType: "daily_quick_match",
                gameType: "ludo",
                segmentName: "bronze",
                maxPlayers: 4,
                now: mockNow
            });

            expect(tournament).toBeDefined();
            expect(tournament?._id).toBe("tournament1");
        });

        it("应该过滤掉独立锦标赛", async () => {
            const tournament = await findJoinableMultiPlayerTournament(mockCtx as any, {
                tournamentType: "daily_quick_match",
                gameType: "ludo",
                segmentName: "silver",
                maxPlayers: 1,
                now: mockNow
            });

            expect(tournament).toBeNull();
        });
    });

    describe("isTournamentFull", () => {
        it("应该正确判断锦标赛是否已满员", async () => {
            const isFull = await isTournamentFull(mockCtx as any, "tournament1", 4);
            expect(isFull).toBe(false); // 2个玩家 < 4个最大玩家

            const isFull2 = await isTournamentFull(mockCtx as any, "tournament1", 2);
            expect(isFull2).toBe(true); // 2个玩家 = 2个最大玩家
        });
    });

    describe("getTournamentActivePlayerCount", () => {
        it("应该正确计算活跃玩家数量", async () => {
            const count = await getTournamentActivePlayerCount(mockCtx as any, "tournament1");
            expect(count).toBe(2);
        });
    });

    describe("isPlayerInTournament", () => {
        it("应该正确判断玩家是否在锦标赛中", async () => {
            const isIn = await isPlayerInTournament(mockCtx as any, {
                uid: "user1",
                tournamentId: "tournament1"
            });
            expect(isIn).toBe(true);

            const isNotIn = await isPlayerInTournament(mockCtx as any, {
                uid: "user4",
                tournamentId: "tournament1"
            });
            expect(isNotIn).toBe(false);
        });
    });

    describe("getTournamentDetails", () => {
        it("应该返回锦标赛详细信息", async () => {
            const details = await getTournamentDetails(mockCtx as any, "tournament1");

            expect(details.tournament).toBeDefined();
            expect(details.activePlayerCount).toBe(2);
            expect(details.maxPlayers).toBe(4);
            expect(details.isFull).toBe(false);
            expect(details.isIndependent).toBe(false);
            expect(details.availableSlots).toBe(2);
        });

        it("应该处理不存在的锦标赛", async () => {
            await expect(
                getTournamentDetails(mockCtx as any, "non_existent_tournament")
            ).rejects.toThrow("锦标赛不存在");
        });
    });

    describe("findOrCreateTournament", () => {
        it("应该为独立锦标赛创建新的锦标赛", async () => {
            // 模拟创建独立锦标赛
            const mockCtxWithInsert = {
                ...mockCtx,
                db: {
                    ...mockCtx.db,
                    insert: (table: string, data: any) => "new_tournament_id"
                }
            };

            const tournament = await findOrCreateTournament(mockCtxWithInsert as any, {
                uid: "user4",
                gameType: "ludo",
                tournamentType: "special_invitational",
                player: { segmentName: "gold" },
                season: { _id: "season1" },
                config: {
                    matchRules: { maxPlayers: 1 }
                },
                now: mockNow,
                isIndependent: true,
                attemptNumber: 1
            });

            expect(tournament).toBeDefined();
        });

        it("应该为非独立锦标赛查找现有锦标赛", async () => {
            const tournament = await findOrCreateTournament(mockCtx as any, {
                uid: "user4",
                gameType: "ludo",
                tournamentType: "daily_quick_match",
                player: { segmentName: "bronze" },
                season: { _id: "season1" },
                config: {
                    matchRules: { maxPlayers: 4 }
                },
                now: mockNow,
                isIndependent: false,
                attemptNumber: 1
            });

            expect(tournament).toBeDefined();
            expect(tournament._id).toBe("tournament1");
        });

        it("应该拒绝重复参与非独立锦标赛", async () => {
            await expect(
                findOrCreateTournament(mockCtx as any, {
                    uid: "user1", // 已经在 tournament1 中
                    gameType: "ludo",
                    tournamentType: "daily_quick_match",
                    player: { segmentName: "bronze" },
                    season: { _id: "season1" },
                    config: {
                        matchRules: { maxPlayers: 4 }
                    },
                    now: mockNow,
                    isIndependent: false,
                    attemptNumber: 1
                })
            ).rejects.toThrow("您已经参与了这个锦标赛");
        });
    });
}); 