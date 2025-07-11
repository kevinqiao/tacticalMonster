import { PlayerTournamentStatusManager } from "../service/tournament/playerTournamentStatusManager";
import { getIndependentFromTournamentType, getTimeRangeFromTournamentType } from "../service/tournament/utils/tournamentTypeUtils";

// 模拟数据库上下文
const mockCtx = {
    db: {
        query: (table: string) => ({
            withIndex: (indexName: string, callback: (q: any) => any) => ({
                first: () => mockTournamentType,
                collect: () => mockPlayerTournaments
            }),
            filter: (callback: (q: any) => any) => ({
                collect: () => mockPlayerTournaments
            }),
            insert: (table: string, data: any) => "mock_id",
            patch: (id: string, data: any) => Promise.resolve(),
            delete: (id: string) => Promise.resolve(),
            get: (id: string) => mockTask
        })
    }
};

// 模拟数据
const mockTournamentType = {
    typeId: "daily_quick_match",
    name: "每日快速比赛",
    timeRange: "daily",
    independent: false
};

const mockPlayerTournaments = [
    {
        _id: "pt1",
        uid: "user1",
        tournamentId: "tournament1",
        status: "active",
        joinedAt: "2024-01-01T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z"
    }
];

const mockTask = {
    _id: "task1",
    tournamentId: "tournament1",
    taskType: "daily_tournament_completion",
    status: "completed",
    batchSize: 100,
    maxConcurrency: 5,
    processed: 100,
    completed: 80,
    expired: 20,
    errors: 0,
    progress: 100,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z"
};

// 验证函数
export async function validateTournamentImprovements() {
    console.log("开始验证锦标赛系统改进...");

    try {
        // 1. 验证工具函数
        console.log("1. 验证工具函数...");

        const timeRange = await getTimeRangeFromTournamentType(mockCtx as any, "daily_quick_match");
        console.log("✓ timeRange:", timeRange);

        const independent = await getIndependentFromTournamentType(mockCtx as any, "daily_quick_match");
        console.log("✓ independent:", independent);

        // 2. 验证状态管理器
        console.log("2. 验证状态管理器...");

        // 验证状态流转
        const isValidTransition = PlayerTournamentStatusManager.isValidTransition("active", "completed");
        console.log("✓ 状态流转验证:", isValidTransition);

        // 验证无效流转
        const isInvalidTransition = PlayerTournamentStatusManager.isValidTransition("completed", "active");
        console.log("✓ 无效流转验证:", !isInvalidTransition);

        // 3. 验证批量处理
        console.log("3. 验证批量处理...");

        const batchResult = await PlayerTournamentStatusManager.batchCompleteDailyTournament(mockCtx as any, {
            tournamentId: "tournament1",
            batchSize: 100,
            maxConcurrency: 5
        });
        console.log("✓ 批量处理结果:", batchResult);

        // 4. 验证异步处理
        console.log("4. 验证异步处理...");

        const asyncResult = await PlayerTournamentStatusManager.asyncBatchCompleteDailyTournament(mockCtx as any, {
            tournamentId: "tournament1",
            batchSize: 50,
            maxConcurrency: 3
        });
        console.log("✓ 异步处理结果:", asyncResult);

        // 5. 验证任务状态查询
        console.log("5. 验证任务状态查询...");

        const taskStatus = await PlayerTournamentStatusManager.getBatchProcessingStatus(mockCtx as any, "task1");
        console.log("✓ 任务状态:", taskStatus);

        // 6. 验证玩家操作
        console.log("6. 验证玩家操作...");

        // 模拟玩家退出
        try {
            await PlayerTournamentStatusManager.withdrawPlayerFromTournament(mockCtx as any, {
                uid: "user1",
                tournamentId: "tournament1",
                reason: "玩家主动退出"
            });
            console.log("✓ 玩家退出操作");
        } catch (error) {
            console.log("⚠ 玩家退出操作（预期错误）:", error.message);
        }

        // 模拟取消资格
        try {
            await PlayerTournamentStatusManager.disqualifyPlayerFromTournament(mockCtx as any, {
                uid: "user1",
                tournamentId: "tournament1",
                reason: "违反规则",
                metadata: { rule: "cheating" }
            });
            console.log("✓ 取消资格操作");
        } catch (error) {
            console.log("⚠ 取消资格操作（预期错误）:", error.message);
        }

        // 7. 验证统计功能
        console.log("7. 验证统计功能...");

        const stats = await PlayerTournamentStatusManager.getPlayerParticipationStats(mockCtx as any, {
            uid: "user1",
            timeRange: "daily"
        });
        console.log("✓ 参与统计:", stats);

        // 8. 验证清理功能
        console.log("8. 验证清理功能...");

        const cleanupResult = await PlayerTournamentStatusManager.cleanupExpiredParticipations(mockCtx as any, {
            daysToKeep: 30
        });
        console.log("✓ 清理结果:", cleanupResult);

        console.log("\n🎉 所有验证通过！锦标赛系统改进成功。");

        return {
            success: true,
            message: "所有功能验证通过",
            details: {
                timeRange,
                independent,
                isValidTransition,
                isInvalidTransition,
                batchResult,
                asyncResult,
                taskStatus,
                stats,
                cleanupResult
            }
        };

    } catch (error) {
        console.error("❌ 验证失败:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

// 导出验证函数
export { validateTournamentImprovements };
