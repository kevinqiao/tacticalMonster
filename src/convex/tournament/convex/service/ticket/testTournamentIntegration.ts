// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";
import { TicketSystem } from "./ticketSystem";
import { TournamentTicketIntegration } from "./tournamentIntegration";

// 测试门票与锦标赛集成
export const testTournamentIntegration = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试门票与锦标赛集成...");

        const testUid = "tournament_integration_test_player";
        const results: any[] = [];

        try {
            // 1. 创建测试门票
            console.log("1. 创建测试门票...");
            const ticket = TicketSystem.createTicket({
                ticketType: "normal",
                uid: testUid,
                gameType: "ludo"
            });

            const ticketId = await ctx.db.insert("tickets", {
                ...ticket,
                createdAt: getTorontoDate().iso
            });
            results.push({ test: "create_ticket", success: true, ticketId });

            // 2. 创建测试锦标赛
            console.log("2. 创建测试锦标赛...");
            const tournamentId = "test_tournament_001";
            const tournamentData = {
                tournamentId,
                tournamentName: "测试锦标赛",
                tournamentType: "基础",
                gameType: "ludo",
                isActive: true,
                currentParticipants: 0,
                maxParticipants: 100,
                baseReward: 100,
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                createdAt: getTorontoDate().iso
            };

            const tournamentDbId = await ctx.db.insert("tournaments", tournamentData);
            results.push({ test: "create_tournament", success: true, tournamentId });

            // 3. 创建玩家段位信息
            console.log("3. 创建玩家段位信息...");
            const playerSegmentData = {
                uid: testUid,
                gameType: "ludo",
                segment: "bronze",
                points: 200,
                elo: 1000,
                createdAt: getTorontoDate().iso,
                lastUpdated: getTorontoDate().iso
            };

            const segmentId = await ctx.db.insert("player_segments", playerSegmentData);
            results.push({ test: "create_player_segment", success: true, segmentId });

            // 4. 验证锦标赛参赛资格
            console.log("4. 验证锦标赛参赛资格...");
            const validation = await TournamentTicketIntegration.validateTournamentEntry({
                ctx,
                uid: testUid,
                gameType: "ludo",
                tournamentId,
                ticketId
            });
            results.push({ test: "validate_entry", success: validation.valid, result: validation });

            // 5. 使用门票参加锦标赛
            console.log("5. 使用门票参加锦标赛...");
            const joinResult = await TournamentTicketIntegration.joinTournamentWithTicket({
                ctx,
                uid: testUid,
                gameType: "ludo",
                tournamentId,
                ticketId
            });
            results.push({ test: "join_tournament", success: joinResult.success, result: joinResult });

            // 6. 处理锦标赛结果
            console.log("6. 处理锦标赛结果...");
            if (joinResult.success && joinResult.participantId) {
                const resultProcess = await TournamentTicketIntegration.processTournamentResult({
                    ctx,
                    tournamentId,
                    participantId: joinResult.participantId,
                    result: "win",
                    performance: 85
                });
                results.push({ test: "process_result", success: resultProcess.success, result: resultProcess });
            }

            // 7. 获取可参加的锦标赛
            console.log("7. 获取可参加的锦标赛...");
            const availableTournaments = await TournamentTicketIntegration.getAvailableTournaments({
                ctx,
                uid: testUid,
                gameType: "ludo"
            });
            results.push({ test: "get_available_tournaments", success: availableTournaments.success, result: availableTournaments });

            return {
                success: true,
                message: "门票与锦标赛集成测试完成",
                testUid,
                tournamentId,
                results,
                summary: {
                    totalTests: results.length,
                    successfulTests: results.filter((r: any) => r.success).length,
                    ticketCreated: ticketId,
                    tournamentCreated: tournamentDbId,
                    playerSegmentCreated: segmentId
                }
            };

        } catch (error: any) {
            console.error("门票与锦标赛集成测试失败:", error);

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                testUid,
                results
            };
        }
    }
});

// 测试门票资格验证
export const testTicketEligibilityValidation = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        tournamentId: v.string(),
        ticketType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType, tournamentId, ticketType } = args;
        const now = getTorontoDate();

        try {
            // 1. 创建门票
            const ticket = TicketSystem.createTicket({
                ticketType,
                uid,
                gameType
            });

            const ticketId = await ctx.db.insert("tickets", {
                ...ticket,
                createdAt: now.iso
            });

            // 2. 验证资格
            const validation = await TournamentTicketIntegration.validateTournamentEntry({
                ctx,
                uid,
                gameType,
                tournamentId,
                ticketId
            });

            return {
                success: true,
                ticketId,
                validation,
                analysis: {
                    canJoin: validation.valid,
                    reason: validation.reason,
                    ticketType,
                    tournamentId
                }
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 测试锦标赛奖励计算
export const testTournamentRewardCalculation = (mutation as any)({
    args: {
        tournamentId: v.string(),
        participantId: v.string(),
        result: v.string(),
        performance: v.number()
    },
    handler: async (ctx: any, args: any) => {
        const { tournamentId, participantId, result, performance } = args;

        try {
            const rewardResult = await TournamentTicketIntegration.processTournamentResult({
                ctx,
                tournamentId,
                participantId,
                result: result as "win" | "lose" | "draw",
                performance
            });

            return {
                success: true,
                rewardResult,
                analysis: {
                    result,
                    performance,
                    reward: rewardResult.reward,
                    ticketMultiplier: rewardResult.ticketMultiplier,
                    performanceMultiplier: rewardResult.performanceMultiplier
                }
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 获取门票锦标赛统计
export const getTicketTournamentStats = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType } = args;

        try {
            // 获取玩家门票使用记录
            const ticketUsage = await ctx.db
                .query("ticket_usage_logs")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                .collect();

            // 获取玩家锦标赛参与记录
            const tournamentParticipation = await ctx.db
                .query("tournament_participants")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                .collect();

            // 统计信息
            const stats = {
                totalTicketsUsed: ticketUsage.length,
                totalTournamentsJoined: tournamentParticipation.length,
                totalRewards: 0,
                ticketTypeBreakdown: {} as any,
                tournamentResults: {
                    wins: 0,
                    losses: 0,
                    draws: 0
                }
            };

            // 统计门票类型使用情况
            ticketUsage.forEach((usage: any) => {
                const ticketType = usage.ticketType;
                if (!stats.ticketTypeBreakdown[ticketType]) {
                    stats.ticketTypeBreakdown[ticketType] = {
                        count: 0,
                        totalReward: 0
                    };
                }
                stats.ticketTypeBreakdown[ticketType].count++;
                stats.ticketTypeBreakdown[ticketType].totalReward += usage.rewardInfo?.finalReward || 0;
                stats.totalRewards += usage.rewardInfo?.finalReward || 0;
            });

            // 统计锦标赛结果
            tournamentParticipation.forEach((participation: any) => {
                if (participation.result) {
                    stats.tournamentResults[participation.result]++;
                }
            });

            return {
                success: true,
                uid,
                gameType,
                stats
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 测试门票系统集成场景
export const testTicketIntegrationScenarios = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试门票系统集成场景...");

        const scenarios = [
            {
                name: "新手玩家参加基础锦标赛",
                playerMS: 150,
                playerSegment: "bronze",
                playerELO: 900,
                ticketType: "normal",
                tournamentType: "基础",
                expectedResult: "eligible"
            },
            {
                name: "高级玩家参加大师专属锦标赛",
                playerMS: 1200,
                playerSegment: "master",
                playerELO: 1800,
                ticketType: "master_exclusive",
                tournamentType: "大师专属",
                expectedResult: "eligible"
            },
            {
                name: "新手玩家尝试参加高级锦标赛",
                playerMS: 150,
                playerSegment: "bronze",
                playerELO: 900,
                ticketType: "advanced",
                tournamentType: "高级",
                expectedResult: "ineligible"
            }
        ];

        const results = [];

        for (const scenario of scenarios) {
            console.log(`测试场景: ${scenario.name}`);

            try {
                // 创建测试玩家
                const testUid = `scenario_${Date.now()}_${Math.random()}`;

                // 创建玩家段位
                await ctx.db.insert("player_segments", {
                    uid: testUid,
                    gameType: "ludo",
                    segment: scenario.playerSegment,
                    points: scenario.playerMS,
                    elo: scenario.playerELO,
                    createdAt: getTorontoDate().iso
                });

                // 创建门票
                const ticket = TicketSystem.createTicket({
                    ticketType: scenario.ticketType,
                    uid: testUid,
                    gameType: "ludo"
                });

                const ticketId = await ctx.db.insert("tickets", {
                    ...ticket,
                    createdAt: getTorontoDate().iso
                });

                // 创建锦标赛
                const tournamentId = `scenario_tournament_${Date.now()}`;
                await ctx.db.insert("tournaments", {
                    tournamentId,
                    tournamentName: scenario.name,
                    tournamentType: scenario.tournamentType,
                    gameType: "ludo",
                    isActive: true,
                    currentParticipants: 0,
                    maxParticipants: 100,
                    baseReward: 100,
                    createdAt: getTorontoDate().iso
                });

                // 验证资格
                const validation = await TournamentTicketIntegration.validateTournamentEntry({
                    ctx,
                    uid: testUid,
                    gameType: "ludo",
                    tournamentId,
                    ticketId
                });

                const passed = (scenario.expectedResult === "eligible" && validation.valid) ||
                    (scenario.expectedResult === "ineligible" && !validation.valid);

                results.push({
                    scenario: scenario.name,
                    passed,
                    expected: scenario.expectedResult,
                    actual: validation.valid ? "eligible" : "ineligible",
                    reason: validation.reason
                });

            } catch (error: any) {
                results.push({
                    scenario: scenario.name,
                    passed: false,
                    error: error.message
                });
            }
        }

        return {
            success: true,
            message: "门票系统集成场景测试完成",
            results,
            summary: {
                totalScenarios: scenarios.length,
                passedScenarios: results.filter((r: any) => r.passed).length,
                failedScenarios: results.filter((r: any) => !r.passed).length
            }
        };
    }
});

// 清理测试数据
export const cleanupTournamentIntegrationTestData = (mutation as any)({
    args: { uid: v.string() },
    handler: async (ctx: any, args: any) => {
        const { uid } = args;
        const now = getTorontoDate();

        let deletedCount = 0;

        try {
            // 删除门票
            const tickets = await ctx.db
                .query("tickets")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", "ludo"))
                .collect();

            for (const ticket of tickets) {
                await ctx.db.delete(ticket._id);
                deletedCount++;
            }

            // 删除门票使用记录
            const usageLogs = await ctx.db
                .query("ticket_usage_logs")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", "ludo"))
                .collect();

            for (const log of usageLogs) {
                await ctx.db.delete(log._id);
                deletedCount++;
            }

            // 删除锦标赛参与者
            const participants = await ctx.db
                .query("tournament_participants")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", "ludo"))
                .collect();

            for (const participant of participants) {
                await ctx.db.delete(participant._id);
                deletedCount++;
            }

            // 删除玩家段位
            const segments = await ctx.db
                .query("player_segments")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", "ludo"))
                .collect();

            for (const segment of segments) {
                await ctx.db.delete(segment._id);
                deletedCount++;
            }

            return {
                success: true,
                message: `锦标赛集成测试数据清理完成`,
                uid,
                deletedCount
            };

        } catch (error: any) {
            console.error("清理锦标赛集成测试数据失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                uid,
                deletedCount
            };
        }
    }
}); 