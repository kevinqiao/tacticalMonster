import { getTorontoDate } from "../../utils";

/**
 * 测试工具函数
 */
export class TestUtils {

    /**
     * 初始化测试环境
     */
    static async initializeTestEnvironment(ctx: any, testUid: string) {
        const now = getTorontoDate();

        // 1. 检查并创建锦标赛类型配置
        let tournamentType = await ctx.db
            .query("tournament_types")
            .withIndex("by_typeId", (q: any) => q.eq("typeId", "daily_special"))
            .first();

        if (!tournamentType) {
            console.log("创建 daily_special 锦标赛类型...");
            const typeId = await ctx.db.insert("tournament_types", {
                typeId: "daily_special",
                name: "每日特殊锦标赛",
                description: "每日限时特殊锦标赛，提供丰厚奖励",
                category: "daily",
                gameType: "solitaire",
                handlerModule: "single_player_tournament",
                defaultConfig: {
                    entryFee: {
                        coins: 50
                    },
                    rules: {
                        maxAttempts: 3,
                        isSingleMatch: true
                    },
                    duration: 24 * 60 * 60 * 1000
                },
                isActive: true,
                createdAt: now.iso,
                updatedAt: now.iso
            });
            tournamentType = await ctx.db.get(typeId);
            console.log("tournamentType", tournamentType);
        }

        // 2. 创建测试用户
        const playerId = await ctx.db.insert("players", {
            uid: testUid,
            displayName: "测试用户",
            segmentName: "bronze",
            isActive: true,
            isSubscribed: false,
            totalPoints: 1000,
            eloScore: 1000,
            lastActive: now.iso,
            createdAt: now.iso,
            updatedAt: now.iso
        });

        // 3. 创建用户库存
        await ctx.db.insert("player_inventory", {
            uid: testUid,
            coins: 1000,
            props: [],
            tickets: [],
            createdAt: now.iso,
            updatedAt: now.iso
        });

        // 4. 确保有活跃赛季
        let season = await ctx.db
            .query("seasons")
            .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
            .first();

        if (!season) {
            const seasonId = await ctx.db.insert("seasons", {
                name: "测试赛季",
                startDate: "2024-01-01",
                endDate: "2024-12-31",
                isActive: true,
                createdAt: now.iso,
                updatedAt: now.iso
            });
            season = await ctx.db.get(seasonId);
        }

        // 5. 创建玩家赛季记录
        await ctx.db.insert("player_seasons", {
            uid: testUid,
            seasonId: season._id,
            seasonPoints: 0,
            gamePoints: { solitaire: 0, uno: 0, ludo: 0, rummy: 0 },
            matchesPlayed: 0,
            matchesWon: 0,
            winRate: 0,
            lastMatchAt: now.iso,
            createdAt: now.iso,
            updatedAt: now.iso
        });

        return {
            playerId,
            tournamentType,
            season
        };
    }

    /**
     * 清理测试数据
     */
    static async cleanupTestData(ctx: any, playerId: string, testUid: string) {
        try {
            // 删除玩家
            await ctx.db.delete(playerId);

            // 删除相关记录
            const inventory = await ctx.db
                .query("player_inventory")
                .withIndex("by_uid", (q: any) => q.eq("uid", testUid))
                .first();
            if (inventory) {
                await ctx.db.delete(inventory._id);
            }

            const playerSeason = await ctx.db
                .query("player_seasons")
                .withIndex("by_uid_season", (q: any) => q.eq("uid", testUid))
                .first();
            if (playerSeason) {
                await ctx.db.delete(playerSeason._id);
            }

            console.log("测试数据清理完成");
        } catch (error) {
            console.log("清理测试数据时出错（不影响测试结果）:", error);
        }
    }

    /**
     * 生成唯一测试用户ID
     */
    static generateTestUid(prefix: string = "test_user"): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
} 