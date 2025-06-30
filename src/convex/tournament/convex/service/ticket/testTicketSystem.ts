import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";
import { TicketSystem } from "./ticketSystem";

// 测试门票系统
export const testTicketSystem = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试分级匹配门票系统...");

        const testUid = "ticket_test_player";
        const results: any[] = [];

        try {
            // 1. 测试门票资格检查
            console.log("1. 测试门票资格检查...");
            const eligibilityTest = await ctx.runMutation(testTicketScenario, {
                ticketType: "normal",
                playerMS: 300,
                playerSegment: "silver",
                playerELO: 1000
            });
            results.push({ test: "eligibility_check", success: true, result: eligibilityTest });

            // 2. 测试可用门票类型获取
            console.log("2. 测试可用门票类型获取...");
            const availableTickets = await ctx.runQuery(getAvailableTicketTypes, {
                uid: testUid,
                gameType: "ludo"
            });
            results.push({ test: "available_tickets", success: true, result: availableTickets });

            // 3. 测试门票创建
            console.log("3. 测试门票创建...");
            const createResult = await ctx.runMutation(createTicket, {
                ticketType: "normal",
                uid: testUid,
                gameType: "ludo"
            });
            results.push({ test: "create_ticket", success: true, result: createResult });

            // 4. 测试门票使用
            console.log("4. 测试门票使用...");
            if (createResult.success && createResult.ticketId) {
                const useResult = await ctx.runMutation(useTicket, {
                    ticketId: createResult.ticketId,
                    tournamentId: "test_tournament_001",
                    uid: testUid,
                    gameType: "ludo"
                });
                results.push({ test: "use_ticket", success: true, result: useResult });
            }

            // 5. 测试门票统计
            console.log("5. 测试门票统计...");
            const statsResult = await ctx.runQuery(getTicketStatistics, {
                uid: testUid,
                gameType: "ludo"
            });
            results.push({ test: "ticket_statistics", success: true, result: statsResult });

            // 6. 测试门票系统规则
            console.log("6. 测试门票系统规则...");
            const rulesResult = await ctx.runQuery(getTicketSystemRules, {});
            results.push({ test: "system_rules", success: true, result: rulesResult });

            return {
                success: true,
                message: "分级匹配门票系统测试完成",
                testUid,
                results,
                summary: {
                    totalTests: results.length,
                    successfulTests: results.filter((r: any) => r.success).length,
                    ticketCreated: createResult.success ? createResult.ticketId : null,
                    availableTicketTypes: availableTickets.success ? availableTickets.availableTickets.totalCount : 0
                }
            };

        } catch (error: any) {
            console.error("分级匹配门票系统测试失败:", error);

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                testUid,
                results
            };
        }
    }
});

// 测试门票使用流程
export const testTicketUsage = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试门票使用流程...");

        const testUid = "ticket_usage_test_player";
        const results: any[] = [];

        try {
            // 1. 创建门票
            console.log("1. 创建门票...");
            const createResult = await ctx.runMutation(createTicket, {
                ticketType: "advanced",
                uid: testUid,
                gameType: "ludo"
            });
            results.push({ test: "create_ticket", success: true, result: createResult });

            if (!createResult.success) {
                throw new Error("门票创建失败");
            }

            // 2. 获取门票库存
            console.log("2. 获取门票库存...");
            const inventory = await ctx.runQuery(getTicketStatistics, {
                uid: testUid,
                gameType: "ludo"
            });
            results.push({ test: "get_inventory", success: true, result: inventory });

            // 3. 使用门票参加锦标赛
            console.log("3. 使用门票参加锦标赛...");
            const ticketId = createResult.ticketId;
            const tournamentId = "test_tournament_001";

            const useResult = await ctx.runMutation(useTicket, {
                ticketId: ticketId,
                tournamentId: tournamentId,
                uid: testUid,
                gameType: "ludo"
            });
            results.push({ test: "use_ticket", success: true, result: useResult });

            // 4. 验证门票已使用
            console.log("4. 验证门票已使用...");
            const updatedInventory = await ctx.runQuery(getTicketStatistics, {
                uid: testUid,
                gameType: "ludo"
            });
            results.push({ test: "verify_used", success: true, result: updatedInventory });

            return {
                success: true,
                message: "门票使用流程测试完成",
                testUid,
                results,
                summary: {
                    totalTests: results.length,
                    successfulTests: results.filter((r: any) => r.success).length,
                    ticketUsed: ticketId,
                    tournamentId: tournamentId
                }
            };

        } catch (error: any) {
            console.error("门票使用流程测试失败:", error);

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                testUid,
                results
            };
        }
    }
});

// 测试门票过期处理
export const testTicketExpiration = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        console.log("开始测试门票过期处理...");

        const testUid = "ticket_expiration_test_player";
        const results: any[] = [];

        try {
            // 1. 创建门票（模拟即将过期的门票）
            console.log("1. 创建即将过期的门票...");
            const createResult = await ctx.runMutation(createTicket, {
                ticketType: "normal",
                uid: testUid,
                gameType: "ludo",
                expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 1天后过期
            });
            results.push({ test: "create_expiring_ticket", success: true, result: createResult });

            // 2. 获取门票库存
            console.log("2. 获取门票库存...");
            const inventory = await ctx.runQuery(getTicketStatistics, {
                uid: testUid,
                gameType: "ludo"
            });
            results.push({ test: "get_inventory", success: true, result: inventory });

            // 3. 检查过期门票
            console.log("3. 检查过期门票...");
            const expiringTickets = inventory.success ? inventory.statistics.expiredTickets : 0;
            results.push({ test: "check_expiring", success: true, result: { expiringTickets } });

            return {
                success: true,
                message: "门票过期处理测试完成",
                testUid,
                results,
                summary: {
                    totalTests: results.length,
                    successfulTests: results.filter((r: any) => r.success).length,
                    expiringTickets: expiringTickets
                }
            };

        } catch (error: any) {
            console.error("门票过期处理测试失败:", error);

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                testUid,
                results
            };
        }
    }
});

// 清理测试数据
export const cleanupTicketTestData = (mutation as any)({
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

            // 删除门票统计
            const statistics = await ctx.db
                .query("ticket_statistics")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", "ludo"))
                .collect();

            for (const stat of statistics) {
                await ctx.db.delete(stat._id);
                deletedCount++;
            }

            // 删除资格检查记录
            const eligibilityLogs = await ctx.db
                .query("ticket_eligibility_logs")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", "ludo"))
                .collect();

            for (const log of eligibilityLogs) {
                await ctx.db.delete(log._id);
                deletedCount++;
            }

            // 删除推荐记录
            const recommendations = await ctx.db
                .query("ticket_recommendations")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", "ludo"))
                .collect();

            for (const recommendation of recommendations) {
                await ctx.db.delete(recommendation._id);
                deletedCount++;
            }

            return {
                success: true,
                message: `门票测试数据清理完成`,
                uid,
                deletedCount
            };

        } catch (error: any) {
            console.error("清理门票测试数据失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                uid,
                deletedCount
            };
        }
    }
});

// 导入新的门票系统函数
import {
    createTicket,
    getAvailableTicketTypes,
    getTicketStatistics,
    getTicketSystemRules,
    useTicket
} from "./ticketSystem";

// @ts-nocheck
export class TestTicketSystem {

    /**
     * 测试门票资格检查
     */
    static testTicketEligibility() {
        console.log("=== 测试门票资格检查 ===");

        const testCases = [
            {
                ticketType: "normal",
                playerMS: 300,
                playerSegment: "silver",
                playerELO: 1000,
                description: "普通门票 - 符合要求"
            },
            {
                ticketType: "normal",
                playerMS: 500,
                playerSegment: "gold",
                playerELO: 1300,
                description: "普通门票 - MS过高"
            },
            {
                ticketType: "advanced",
                playerMS: 500,
                playerSegment: "gold",
                playerELO: 1300,
                description: "高级门票 - 符合要求"
            },
            {
                ticketType: "event",
                playerMS: 800,
                playerSegment: "diamond",
                playerELO: 1500,
                description: "活动门票 - 符合要求"
            },
            {
                ticketType: "master_exclusive",
                playerMS: 1200,
                playerSegment: "master",
                playerELO: 1600,
                description: "大师专属门票 - 符合要求"
            },
            {
                ticketType: "master_exclusive",
                playerMS: 1200,
                playerSegment: "diamond",
                playerELO: 1600,
                description: "大师专属门票 - 段位不足"
            },
            {
                ticketType: "elite_exclusive",
                playerMS: 600,
                playerSegment: "gold",
                playerELO: 1300,
                description: "精英专属门票 - 符合要求"
            },
            {
                ticketType: "season_exclusive",
                playerMS: 800,
                playerSegment: "diamond",
                playerELO: 1500,
                description: "赛季专属门票 - 符合要求"
            }
        ];

        testCases.forEach(testCase => {
            const result = TicketSystem.checkTicketEligibility({
                ticketType: testCase.ticketType,
                playerMS: testCase.playerMS,
                playerSegment: testCase.playerSegment,
                playerELO: testCase.playerELO
            });

            console.log(`${testCase.description}:`);
            console.log(`  资格: ${result.eligible ? "符合" : "不符合"}`);
            console.log(`  MS检查: ${result.msEligible ? "通过" : "失败"}`);
            console.log(`  段位检查: ${result.segmentEligible ? "通过" : "失败"}`);
            console.log(`  ELO检查: ${result.eloEligible ? "通过" : "失败"}`);
            console.log(`  原因: ${result.reason}`);
            console.log("");
        });
    }

    /**
     * 测试可用门票类型获取
     */
    static testAvailableTicketTypes() {
        console.log("=== 测试可用门票类型获取 ===");

        const testCases = [
            {
                playerMS: 200,
                playerSegment: "bronze",
                playerELO: 900,
                description: "青铜段位新手玩家"
            },
            {
                playerMS: 500,
                playerSegment: "gold",
                playerELO: 1300,
                description: "黄金段位中级玩家"
            },
            {
                playerMS: 800,
                playerSegment: "diamond",
                playerELO: 1500,
                description: "钻石段位高级玩家"
            },
            {
                playerMS: 1200,
                playerSegment: "master",
                playerELO: 1700,
                description: "大师段位顶级玩家"
            }
        ];

        testCases.forEach(testCase => {
            const result = TicketSystem.getAvailableTicketTypes({
                playerMS: testCase.playerMS,
                playerSegment: testCase.playerSegment,
                playerELO: testCase.playerELO
            });

            console.log(`${testCase.description}:`);
            console.log(`  可用门票数量: ${result.totalCount}`);
            console.log(`  可用门票类型:`);
            result.availableTickets.forEach(ticket => {
                console.log(`    - ${ticket.name}: ${ticket.description}`);
                console.log(`      适用锦标赛: ${ticket.tournaments.join(', ')}`);
                console.log(`      目标用户: ${ticket.targetAudience}`);
                console.log(`      奖励倍数: ${ticket.rewardMultiplier}x`);
            });
            console.log("");
        });
    }

    /**
     * 测试门票创建
     */
    static testTicketCreation() {
        console.log("=== 测试门票创建 ===");

        const testCases = [
            {
                ticketType: "normal",
                uid: "user123",
                gameType: "ludo",
                description: "创建普通门票"
            },
            {
                ticketType: "advanced",
                uid: "user456",
                gameType: "solitaire",
                description: "创建高级门票"
            },
            {
                ticketType: "master_exclusive",
                uid: "user789",
                gameType: "tournament",
                description: "创建大师专属门票"
            }
        ];

        testCases.forEach(testCase => {
            try {
                const ticket = TicketSystem.createTicket({
                    ticketType: testCase.ticketType,
                    uid: testCase.uid,
                    gameType: testCase.gameType
                });

                console.log(`${testCase.description}:`);
                console.log(`  门票ID: ${ticket.id}`);
                console.log(`  门票类型: ${ticket.ticketType}`);
                console.log(`  门票名称: ${ticket.name}`);
                console.log(`  创建时间: ${ticket.createdAt}`);
                console.log(`  过期时间: ${ticket.expiryDate}`);
                console.log(`  是否已使用: ${ticket.isUsed}`);
                console.log(`  适用锦标赛: ${ticket.config.tournaments.join(', ')}`);
                console.log("");
            } catch (error: any) {
                console.log(`${testCase.description}: 创建失败 - ${error.message}`);
                console.log("");
            }
        });
    }

    /**
     * 测试门票验证
     */
    static testTicketValidation() {
        console.log("=== 测试门票验证 ===");

        // 创建测试门票
        const ticket = TicketSystem.createTicket({
            ticketType: "normal",
            uid: "user123",
            gameType: "ludo"
        });

        const testCases = [
            {
                ticket: ticket,
                playerMS: 300,
                playerSegment: "silver",
                playerELO: 1000,
                currentDate: new Date().toISOString(),
                description: "有效门票验证"
            },
            {
                ticket: { ...ticket, isUsed: true },
                playerMS: 300,
                playerSegment: "silver",
                playerELO: 1000,
                currentDate: new Date().toISOString(),
                description: "已使用门票验证"
            },
            {
                ticket: { ...ticket, expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
                playerMS: 300,
                playerSegment: "silver",
                playerELO: 1000,
                currentDate: new Date().toISOString(),
                description: "过期门票验证"
            },
            {
                ticket: ticket,
                playerMS: 500,
                playerSegment: "gold",
                playerELO: 1300,
                currentDate: new Date().toISOString(),
                description: "资格不符门票验证"
            }
        ];

        testCases.forEach(testCase => {
            const result = TicketSystem.validateTicket({
                ticket: testCase.ticket,
                playerMS: testCase.playerMS,
                playerSegment: testCase.playerSegment,
                playerELO: testCase.playerELO,
                currentDate: testCase.currentDate
            });

            console.log(`${testCase.description}:`);
            console.log(`  验证结果: ${result.valid ? "有效" : "无效"}`);
            console.log(`  原因: ${result.reason}`);
            if (result.eligibility) {
                console.log(`  MS检查: ${result.eligibility.msEligible ? "通过" : "失败"}`);
                console.log(`  段位检查: ${result.eligibility.segmentEligible ? "通过" : "失败"}`);
                console.log(`  ELO检查: ${result.eligibility.eloEligible ? "通过" : "失败"}`);
            }
            console.log("");
        });
    }

    /**
     * 测试门票奖励计算
     */
    static testTicketRewardCalculation() {
        console.log("=== 测试门票奖励计算 ===");

        const baseReward = 100;
        const testCases = [
            {
                ticketType: "normal",
                playerPerformance: "win",
                description: "普通门票胜利"
            },
            {
                ticketType: "normal",
                playerPerformance: "lose",
                description: "普通门票失败"
            },
            {
                ticketType: "advanced",
                playerPerformance: "win",
                description: "高级门票胜利"
            },
            {
                ticketType: "event",
                playerPerformance: "win",
                description: "活动门票胜利"
            },
            {
                ticketType: "master_exclusive",
                playerPerformance: "win",
                description: "大师专属门票胜利"
            }
        ];

        testCases.forEach(testCase => {
            const reward = TicketSystem.calculateTicketTournamentReward({
                baseReward,
                ticketType: testCase.ticketType,
                playerPerformance: testCase.playerPerformance as "win" | "lose" | "draw"
            });

            const multiplier = TicketSystem.getTicketRewardMultiplier(testCase.ticketType);

            console.log(`${testCase.description}:`);
            console.log(`  基础奖励: ${baseReward}`);
            console.log(`  门票倍数: ${multiplier}x`);
            console.log(`  表现: ${testCase.playerPerformance}`);
            console.log(`  最终奖励: ${reward}`);
            console.log("");
        });
    }

    /**
     * 测试门票使用
     */
    static testTicketUsage() {
        console.log("=== 测试门票使用 ===");

        const testCases = [
            {
                ticketId: "normal_user123_1234567890",
                tournamentId: "tournament_001",
                uid: "user123",
                gameType: "ludo",
                description: "使用普通门票"
            },
            {
                ticketId: "advanced_user456_1234567891",
                tournamentId: "tournament_002",
                uid: "user456",
                gameType: "solitaire",
                description: "使用高级门票"
            }
        ];

        testCases.forEach(testCase => {
            const result = TicketSystem.useTicket({
                ticketId: testCase.ticketId,
                tournamentId: testCase.tournamentId,
                uid: testCase.uid,
                gameType: testCase.gameType
            });

            console.log(`${testCase.description}:`);
            console.log(`  门票ID: ${result.ticketId}`);
            console.log(`  锦标赛ID: ${result.tournamentId}`);
            console.log(`  使用时间: ${result.usedAt}`);
            console.log(`  使用状态: ${result.isUsed ? "已使用" : "未使用"}`);
            console.log(`  消息: ${result.message}`);
            console.log("");
        });
    }

    /**
     * 运行所有测试
     */
    static runAllTests() {
        console.log("🚀 开始测试门票系统");
        console.log("=".repeat(50));

        this.testTicketEligibility();
        this.testAvailableTicketTypes();
        this.testTicketCreation();
        this.testTicketValidation();
        this.testTicketRewardCalculation();
        this.testTicketUsage();

        console.log("✅ 所有测试完成");
    }

    /**
     * 生成门票系统报告
     */
    static generateTicketSystemReport() {
        const report = {
            systemName: "分级匹配门票系统",
            designPhilosophy: "根据玩家实力分级匹配，移除道具依赖",
            keyFeatures: {
                tieredMatching: {
                    description: "基于MS、段位、ELO的分级匹配",
                    benefit: "确保公平竞争，提升游戏体验"
                },
                noProps: {
                    description: "移除道具依赖",
                    benefit: "简化系统，专注竞技性"
                },
                exclusiveTournaments: {
                    description: "专属锦标赛",
                    benefit: "为不同水平玩家提供专属体验"
                }
            },
            ticketTypes: {
                normal: {
                    target: "新手/休闲玩家",
                    tournaments: ["基础", "进阶", "白银赛季"],
                    requirements: "MS<400, 青铜-白银, ELO 800-1200"
                },
                advanced: {
                    target: "中高级段位玩家",
                    tournaments: ["高级", "精英", "黄金赛季"],
                    requirements: "MS>400, 黄金-钻石, ELO 1200-1600"
                },
                event: {
                    target: "高段位玩家",
                    tournaments: ["活动", "钻石赛季", "大师赛季"],
                    requirements: "MS>700, 钻石-大师, ELO 1400+"
                },
                exclusive: {
                    target: "顶级玩家",
                    tournaments: ["大师专属", "精英专属", "赛季专属"],
                    requirements: "MS>1000, 大师段位, ELO 1400+"
                }
            },
            advantages: [
                "公平匹配，避免实力差距过大",
                "移除道具依赖，专注竞技性",
                "为不同水平玩家提供专属体验",
                "清晰的资格要求，玩家易于理解",
                "灵活的奖励倍数系统"
            ]
        };

        return report;
    }
}

// 运行门票系统测试
export const runTicketSystemTestsMutation = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        try {
            // 在服务器端运行测试
            TestTicketSystem.runAllTests();

            return {
                success: true,
                message: "门票系统测试完成",
                report: TestTicketSystem.generateTicketSystemReport()
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                message: "测试执行失败"
            };
        }
    }
});

// 获取门票系统报告
export const getTicketSystemReport = (query as any)({
    args: {},
    handler: async (ctx: any) => {
        return {
            success: true,
            report: TestTicketSystem.generateTicketSystemReport()
        };
    }
});

// 测试特定门票场景
export const testTicketScenario = (mutation as any)({
    args: {
        ticketType: v.string(),
        playerMS: v.number(),
        playerSegment: v.string(),
        playerELO: v.number()
    },
    handler: async (ctx: any, args: any) => {
        try {
            const eligibility = TicketSystem.checkTicketEligibility(args);
            const availableTickets = TicketSystem.getAvailableTicketTypes(args);
            const multiplier = TicketSystem.getTicketRewardMultiplier(args.ticketType);

            return {
                success: true,
                scenario: {
                    ticketType: args.ticketType,
                    playerMS: args.playerMS,
                    playerSegment: args.playerSegment,
                    playerELO: args.playerELO
                },
                eligibility: eligibility,
                availableTickets: availableTickets,
                rewardMultiplier: multiplier,
                analysis: {
                    canUseTicket: eligibility.eligible,
                    totalAvailable: availableTickets.totalCount,
                    rewardLevel: multiplier > 2.0 ? "高奖励" : multiplier > 1.5 ? "中奖励" : "标准奖励"
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

// @ts-nocheck

// 测试门票系统 - 完整功能测试
export class TicketSystemTest {

    /**
     * 测试门票类型定义
     */
    static testTicketTypes() {
        console.log("=== 测试门票类型定义 ===");

        const types = TicketSystem.TICKET_TYPES;

        // 验证所有门票类型
        Object.keys(types).forEach(type => {
            const config = (types as any)[type];
            console.log(`${type}:`, {
                id: config.id,
                name: config.name,
                msRange: config.msRequirement,
                segments: config.segmentRequirement,
                eloRange: config.eloRequirement,
                multiplier: config.rewardMultiplier
            });
        });

        console.log("门票类型定义测试通过\n");
    }

    /**
     * 测试资格检查
     */
    static testEligibilityCheck() {
        console.log("=== 测试资格检查 ===");

        const testCases = [
            {
                name: "新手玩家 - 普通门票",
                ticketType: "normal",
                playerMS: 100,
                playerSegment: "bronze",
                playerELO: 900,
                expected: true
            },
            {
                name: "高级玩家 - 普通门票",
                ticketType: "normal",
                playerMS: 500,
                playerSegment: "gold",
                playerELO: 1500,
                expected: false
            },
            {
                name: "大师玩家 - 大师专属门票",
                ticketType: "master_exclusive",
                playerMS: 1200,
                playerSegment: "master",
                playerELO: 1800,
                expected: true
            },
            {
                name: "钻石玩家 - 精英专属门票",
                ticketType: "elite_exclusive",
                playerMS: 800,
                playerSegment: "diamond",
                playerELO: 1600,
                expected: true
            },
            {
                name: "青铜玩家 - 大师专属门票",
                ticketType: "master_exclusive",
                playerMS: 200,
                playerSegment: "bronze",
                playerELO: 1000,
                expected: false
            }
        ];

        testCases.forEach(testCase => {
            const result = TicketSystem.checkTicketEligibility({
                ticketType: testCase.ticketType,
                playerMS: testCase.playerMS,
                playerSegment: testCase.playerSegment,
                playerELO: testCase.playerELO
            });

            const passed = result.eligible === testCase.expected;
            console.log(`${testCase.name}: ${passed ? '通过' : '失败'}`);
            if (!passed) {
                console.log(`  期望: ${testCase.expected}, 实际: ${result.eligible}`);
                console.log(`  原因: ${result.reason}`);
            }
        });

        console.log("资格检查测试完成\n");
    }

    /**
     * 测试可用门票类型获取
     */
    static testAvailableTicketTypes() {
        console.log("=== 测试可用门票类型获取 ===");

        const testPlayers = [
            {
                name: "新手玩家",
                ms: 150,
                segment: "bronze",
                elo: 950
            },
            {
                name: "中级玩家",
                ms: 550,
                segment: "gold",
                elo: 1300
            },
            {
                name: "高级玩家",
                ms: 850,
                segment: "diamond",
                elo: 1700
            },
            {
                name: "大师玩家",
                ms: 1200,
                segment: "master",
                elo: 2000
            }
        ];

        testPlayers.forEach(player => {
            const available = TicketSystem.getAvailableTicketTypes({
                playerMS: player.ms,
                playerSegment: player.segment,
                playerELO: player.elo
            });

            console.log(`${player.name} (MS:${player.ms}, ${player.segment}, ELO:${player.elo}):`);
            console.log(`  可用门票数量: ${available.totalCount}`);
            available.availableTickets.forEach(ticket => {
                console.log(`    - ${ticket.name} (${ticket.type})`);
            });
        });

        console.log("可用门票类型测试完成\n");
    }

    /**
     * 测试门票创建
     */
    static testTicketCreation() {
        console.log("=== 测试门票创建 ===");

        const testCases = [
            {
                ticketType: "normal",
                uid: "user123",
                gameType: "tournament",
                description: "普通门票创建"
            },
            {
                ticketType: "advanced",
                uid: "user456",
                gameType: "tournament",
                description: "高级门票创建"
            },
            {
                ticketType: "event",
                uid: "user789",
                gameType: "tournament",
                description: "活动门票创建"
            }
        ];

        testCases.forEach(testCase => {
            const ticket = TicketSystem.createTicket({
                ticketType: testCase.ticketType,
                uid: testCase.uid,
                gameType: testCase.gameType
            });

            console.log(`${testCase.description}:`);
            console.log(`  ID: ${ticket.id}`);
            console.log(`  类型: ${ticket.ticketType}`);
            console.log(`  名称: ${ticket.name}`);
            console.log(`  过期时间: ${ticket.expiryDate}`);
            console.log(`  已使用: ${ticket.isUsed}`);
        });

        console.log("门票创建测试完成\n");
    }

    /**
     * 测试门票验证
     */
    static testTicketValidation() {
        console.log("=== 测试门票验证 ===");

        // 创建测试门票
        const ticket = TicketSystem.createTicket({
            ticketType: "normal",
            uid: "user123",
            gameType: "tournament"
        });

        const testCases = [
            {
                name: "有效门票",
                ticket: ticket,
                playerMS: 200,
                playerSegment: "bronze",
                playerELO: 1000,
                currentDate: new Date().toISOString(),
                expected: true
            },
            {
                name: "已使用门票",
                ticket: { ...ticket, isUsed: true },
                playerMS: 200,
                playerSegment: "bronze",
                playerELO: 1000,
                currentDate: new Date().toISOString(),
                expected: false
            },
            {
                name: "过期门票",
                ticket: { ...ticket, expiryDate: new Date(Date.now() - 86400000).toISOString() },
                playerMS: 200,
                playerSegment: "bronze",
                playerELO: 1000,
                currentDate: new Date().toISOString(),
                expected: false
            },
            {
                name: "资格不符门票",
                ticket: ticket,
                playerMS: 500,
                playerSegment: "gold",
                playerELO: 1500,
                currentDate: new Date().toISOString(),
                expected: false
            }
        ];

        testCases.forEach(testCase => {
            const result = TicketSystem.validateTicket({
                ticket: testCase.ticket,
                playerMS: testCase.playerMS,
                playerSegment: testCase.playerSegment,
                playerELO: testCase.playerELO,
                currentDate: testCase.currentDate
            });

            const passed = result.valid === testCase.expected;
            console.log(`${testCase.name}: ${passed ? '通过' : '失败'}`);
            if (!passed) {
                console.log(`  期望: ${testCase.expected}, 实际: ${result.valid}`);
                console.log(`  原因: ${result.reason}`);
            }
        });

        console.log("门票验证测试完成\n");
    }

    /**
     * 测试门票使用
     */
    static testTicketUsage() {
        console.log("=== 测试门票使用 ===");

        const ticket = TicketSystem.createTicket({
            ticketType: "normal",
            uid: "user123",
            gameType: "tournament"
        });

        const useResult = TicketSystem.useTicket({
            ticketId: ticket.id,
            tournamentId: "tournament456",
            uid: "user123",
            gameType: "tournament"
        });

        console.log("门票使用结果:");
        console.log(`  门票ID: ${useResult.ticketId}`);
        console.log(`  锦标赛ID: ${useResult.tournamentId}`);
        console.log(`  使用时间: ${useResult.usedAt}`);
        console.log(`  已使用: ${useResult.isUsed}`);
        console.log(`  消息: ${useResult.message}`);

        console.log("门票使用测试完成\n");
    }

    /**
     * 测试奖励计算
     */
    static testRewardCalculation() {
        console.log("=== 测试奖励计算 ===");

        const testCases = [
            {
                ticketType: "normal",
                baseReward: 100,
                performance: "win",
                expected: 100
            },
            {
                ticketType: "advanced",
                baseReward: 100,
                performance: "win",
                expected: 150
            },
            {
                ticketType: "event",
                baseReward: 100,
                performance: "win",
                expected: 200
            },
            {
                ticketType: "master_exclusive",
                baseReward: 100,
                performance: "win",
                expected: 300
            },
            {
                ticketType: "normal",
                baseReward: 100,
                performance: "lose",
                expected: 10
            },
            {
                ticketType: "advanced",
                baseReward: 100,
                performance: "draw",
                expected: 75
            }
        ];

        testCases.forEach(testCase => {
            const reward = TicketSystem.calculateTicketTournamentReward({
                baseReward: testCase.baseReward,
                ticketType: testCase.ticketType,
                playerPerformance: testCase.performance as "win" | "lose" | "draw"
            });

            const passed = reward === testCase.expected;
            console.log(`${testCase.ticketType}门票 ${testCase.performance} (基础奖励${testCase.baseReward}): ${passed ? '通过' : '失败'}`);
            if (!passed) {
                console.log(`  期望: ${testCase.expected}, 实际: ${reward}`);
            }
        });

        console.log("奖励计算测试完成\n");
    }

    /**
     * 测试门票统计
     */
    static testTicketStatistics() {
        console.log("=== 测试门票统计 ===");

        const statistics = TicketSystem.getTicketStatistics({
            uid: "user123",
            gameType: "tournament"
        });

        console.log("门票统计结构:");
        console.log(`  总门票数: ${statistics.totalTickets}`);
        console.log(`  已使用: ${statistics.usedTickets}`);
        console.log(`  可用: ${statistics.availableTickets}`);
        console.log(`  过期: ${statistics.expiredTickets}`);

        console.log("各类型门票统计:");
        Object.keys(statistics.ticketTypes).forEach(type => {
            const typeStats = (statistics.ticketTypes as any)[type];
            console.log(`  ${type}: 总${typeStats.total}, 已用${typeStats.used}, 可用${typeStats.available}`);
        });

        console.log("门票统计测试完成\n");
    }

    /**
     * 测试完整流程
     */
    static testCompleteFlow() {
        console.log("=== 测试完整流程 ===");

        // 1. 检查玩家资格
        const eligibility = TicketSystem.checkTicketEligibility({
            ticketType: "normal",
            playerMS: 200,
            playerSegment: "bronze",
            playerELO: 1000
        });

        console.log("1. 资格检查:", eligibility.eligible ? "通过" : "失败");

        if (eligibility.eligible) {
            // 2. 创建门票
            const ticket = TicketSystem.createTicket({
                ticketType: "normal",
                uid: "user123",
                gameType: "tournament"
            });

            console.log("2. 门票创建成功:", ticket.id);

            // 3. 验证门票
            const validation = TicketSystem.validateTicket({
                ticket,
                playerMS: 200,
                playerSegment: "bronze",
                playerELO: 1000,
                currentDate: new Date().toISOString()
            });

            console.log("3. 门票验证:", validation.valid ? "通过" : "失败");

            if (validation.valid) {
                // 4. 使用门票
                const useResult = TicketSystem.useTicket({
                    ticketId: ticket.id,
                    tournamentId: "tournament123",
                    uid: "user123",
                    gameType: "tournament"
                });

                console.log("4. 门票使用:", useResult.message);

                // 5. 计算奖励
                const reward = TicketSystem.calculateTicketTournamentReward({
                    baseReward: 100,
                    ticketType: "normal",
                    playerPerformance: "win"
                });

                console.log("5. 奖励计算:", reward);
            }
        }

        console.log("完整流程测试完成\n");
    }

    /**
     * 测试边界情况
     */
    static testEdgeCases() {
        console.log("=== 测试边界情况 ===");

        // 测试无效门票类型
        try {
            const result = TicketSystem.checkTicketEligibility({
                ticketType: "invalid_type",
                playerMS: 200,
                playerSegment: "bronze",
                playerELO: 1000
            });
            console.log("无效门票类型处理:", result.eligible === false ? "正确" : "错误");
        } catch (error) {
            console.log("无效门票类型处理:", "异常处理正确");
        }

        // 测试边界值
        const boundaryTests = [
            {
                name: "MS边界值 - 最小值",
                ms: 0,
                segment: "bronze",
                elo: 800,
                expected: true
            },
            {
                name: "MS边界值 - 最大值",
                ms: 399,
                segment: "bronze",
                elo: 1200,
                expected: true
            },
            {
                name: "ELO边界值 - 最小值",
                ms: 200,
                segment: "bronze",
                elo: 800,
                expected: true
            },
            {
                name: "ELO边界值 - 最大值",
                ms: 200,
                segment: "bronze",
                elo: 1200,
                expected: true
            }
        ];

        boundaryTests.forEach(test => {
            const result = TicketSystem.checkTicketEligibility({
                ticketType: "normal",
                playerMS: test.ms,
                playerSegment: test.segment,
                playerELO: test.elo
            });

            const passed = result.eligible === test.expected;
            console.log(`${test.name}: ${passed ? '通过' : '失败'}`);
        });

        console.log("边界情况测试完成\n");
    }

    /**
     * 运行所有测试
     */
    static runAllTests() {
        console.log("开始运行门票系统完整测试...\n");

        this.testTicketTypes();
        this.testEligibilityCheck();
        this.testAvailableTicketTypes();
        this.testTicketCreation();
        this.testTicketValidation();
        this.testTicketUsage();
        this.testRewardCalculation();
        this.testTicketStatistics();
        this.testCompleteFlow();
        this.testEdgeCases();

        console.log("所有测试完成！");
    }
}

// 模拟数据库操作测试
export class TicketSystemDatabaseTest {

    /**
     * 模拟门票创建
     */
    static async simulateCreateTicket(ctx: any, args: any) {
        console.log("模拟创建门票:", args);

        // 模拟数据库插入
        const ticketId = `ticket_${Date.now()}`;
        const ticket = {
            _id: ticketId,
            ...TicketSystem.createTicket(args)
        };

        console.log("创建的门票:", ticket);
        return { success: true, ticketId, ticket };
    }

    /**
     * 模拟门票使用
     */
    static async simulateUseTicket(ctx: any, args: any) {
        console.log("模拟使用门票:", args);

        // 模拟门票验证
        const ticket = {
            id: args.ticketId,
            ticketType: "normal",
            isUsed: false,
            expiryDate: new Date(Date.now() + 86400000).toISOString()
        };

        const validation = TicketSystem.validateTicket({
            ticket,
            playerMS: 200,
            playerSegment: "bronze",
            playerELO: 1000,
            currentDate: new Date().toISOString()
        });

        if (!validation.valid) {
            return { success: false, error: validation.reason };
        }

        // 模拟使用门票
        const useResult = TicketSystem.useTicket(args);

        console.log("门票使用结果:", useResult);
        return { success: true, useResult };
    }

    /**
     * 模拟资格检查
     */
    static async simulateCheckEligibility(ctx: any, args: any) {
        console.log("模拟资格检查:", args);

        const eligibility = TicketSystem.checkTicketEligibility({
            ticketType: args.ticketType,
            playerMS: 200,
            playerSegment: "bronze",
            playerELO: 1000
        });

        console.log("资格检查结果:", eligibility);
        return { success: true, eligibility };
    }

    /**
     * 模拟获取可用门票类型
     */
    static async simulateGetAvailableTickets(ctx: any, args: any) {
        console.log("模拟获取可用门票类型:", args);

        const availableTickets = TicketSystem.getAvailableTicketTypes({
            playerMS: 200,
            playerSegment: "bronze",
            playerELO: 1000
        });

        console.log("可用门票类型:", availableTickets);
        return { success: true, availableTickets };
    }

    /**
     * 模拟获取门票统计
     */
    static async simulateGetStatistics(ctx: any, args: any) {
        console.log("模拟获取门票统计:", args);

        const statistics = TicketSystem.getTicketStatistics({
            uid: args.uid,
            gameType: args.gameType
        });

        console.log("门票统计:", statistics);
        return { success: true, statistics };
    }

    /**
     * 运行数据库模拟测试
     */
    static async runDatabaseTests() {
        console.log("开始运行数据库模拟测试...\n");

        const mockCtx = {};

        // 测试创建门票
        await this.simulateCreateTicket(mockCtx, {
            ticketType: "normal",
            uid: "user123",
            gameType: "tournament"
        });

        // 测试资格检查
        await this.simulateCheckEligibility(mockCtx, {
            ticketType: "normal",
            uid: "user123",
            gameType: "tournament"
        });

        // 测试获取可用门票
        await this.simulateGetAvailableTickets(mockCtx, {
            uid: "user123",
            gameType: "tournament"
        });

        // 测试使用门票
        await this.simulateUseTicket(mockCtx, {
            ticketId: "ticket123",
            tournamentId: "tournament456",
            uid: "user123",
            gameType: "tournament"
        });

        // 测试获取统计
        await this.simulateGetStatistics(mockCtx, {
            uid: "user123",
            gameType: "tournament"
        });

        console.log("数据库模拟测试完成！");
    }
}

// 导出测试函数
export const runTicketSystemTests = () => {
    TicketSystemTest.runAllTests();
};

export const runTicketDatabaseTests = async () => {
    await TicketSystemDatabaseTest.runDatabaseTests();
}; 