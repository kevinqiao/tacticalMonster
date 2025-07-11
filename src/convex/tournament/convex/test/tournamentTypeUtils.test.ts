import { getIndependentFromTournamentType, getTimeRangeFromTournamentType } from "../service/tournament/utils/tournamentTypeUtils";

// 模拟数据库上下文
const mockCtx = {
    db: {
        query: (table: string) => ({
            withIndex: (indexName: string, callback: (q: any) => any) => ({
                first: () => mockTournamentType
            })
        })
    }
};

// 模拟锦标赛类型数据
const mockTournamentType = {
    typeId: "daily_quick_match",
    name: "每日快速比赛",
    timeRange: "daily",
    independent: false
};

describe("TournamentTypeUtils", () => {
    describe("getTimeRangeFromTournamentType", () => {
        it("应该从数据库获取时间范围", async () => {
            const timeRange = await getTimeRangeFromTournamentType(mockCtx as any, "daily_quick_match");
            expect(timeRange).toBe("daily");
        });

        it("当锦标赛类型不存在时应该抛出错误", async () => {
            const mockCtxWithError = {
                db: {
                    query: (table: string) => ({
                        withIndex: (indexName: string, callback: (q: any) => any) => ({
                            first: () => null
                        })
                    })
                }
            };

            await expect(
                getTimeRangeFromTournamentType(mockCtxWithError as any, "non_existent_type")
            ).rejects.toThrow("锦标赛类型 non_existent_type 不存在");
        });

        it("当没有timeRange字段时应该返回默认值", async () => {
            const mockCtxWithDefault = {
                db: {
                    query: (table: string) => ({
                        withIndex: (indexName: string, callback: (q: any) => any) => ({
                            first: () => ({ ...mockTournamentType, timeRange: undefined })
                        })
                    })
                }
            };

            const timeRange = await getTimeRangeFromTournamentType(mockCtxWithDefault as any, "daily_quick_match");
            expect(timeRange).toBe("total");
        });
    });

    describe("getIndependentFromTournamentType", () => {
        it("应该从数据库获取独立状态", async () => {
            const independent = await getIndependentFromTournamentType(mockCtx as any, "daily_quick_match");
            expect(independent).toBe(false);
        });

        it("当锦标赛类型不存在时应该抛出错误", async () => {
            const mockCtxWithError = {
                db: {
                    query: (table: string) => ({
                        withIndex: (indexName: string, callback: (q: any) => any) => ({
                            first: () => null
                        })
                    })
                }
            };

            await expect(
                getIndependentFromTournamentType(mockCtxWithError as any, "non_existent_type")
            ).rejects.toThrow("锦标赛类型 non_existent_type 不存在");
        });

        it("当没有independent字段时应该返回默认值", async () => {
            const mockCtxWithDefault = {
                db: {
                    query: (table: string) => ({
                        withIndex: (indexName: string, callback: (q: any) => any) => ({
                            first: () => ({ ...mockTournamentType, independent: undefined })
                        })
                    })
                }
            };

            const independent = await getIndependentFromTournamentType(mockCtxWithDefault as any, "daily_quick_match");
            expect(independent).toBe(false);
        });
    });
}); 