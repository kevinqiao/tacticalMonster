// @ts-nocheck
import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getTorontoDate } from "../utils";

// 加载段位数据
export const loadSegmentData = mutation({
    args: {},
    handler: async (ctx) => {
        const now = getTorontoDate();

        // 段位定义数据
        const segments = [
            {
                segmentId: "bronze",
                name: "青铜",
                displayName: "青铜段位",
                description: "初学者的起点，从这里开始你的竞技之旅",
                tier: 1,
                minPoints: 0,
                maxPoints: 999,
                color: "#CD7F32",
                icon: "/icons/segments/bronze.svg",
                badge: "/badges/segments/bronze.png",
                rewards: {
                    coins: 50,
                    props: [
                        { gameType: "solitaire", propType: "hint", quantity: 1 }
                    ],
                    tickets: [],
                    dailyBonus: {
                        coins: 10,
                        props: []
                    }
                },
                promotionBonus: {
                    coins: 100,
                    props: [
                        { gameType: "solitaire", propType: "hint", quantity: 2 },
                        { gameType: "solitaire", propType: "undo", quantity: 1 }
                    ],
                    tickets: [
                        { gameType: "solitaire", tournamentType: "daily_special", quantity: 1 }
                    ]
                },
                demotionProtection: false,
                protectionMatches: 0,
                isActive: true
            },
            {
                segmentId: "silver",
                name: "白银",
                displayName: "白银段位",
                description: "掌握基础技巧，展现你的潜力",
                tier: 2,
                minPoints: 1000,
                maxPoints: 2499,
                color: "#C0C0C0",
                icon: "/icons/segments/silver.svg",
                badge: "/badges/segments/silver.png",
                rewards: {
                    coins: 100,
                    props: [
                        { gameType: "solitaire", propType: "hint", quantity: 2 },
                        { gameType: "solitaire", propType: "undo", quantity: 1 }
                    ],
                    tickets: [
                        { gameType: "solitaire", tournamentType: "daily_special", quantity: 1 }
                    ],
                    dailyBonus: {
                        coins: 20,
                        props: [
                            { gameType: "solitaire", propType: "hint", quantity: 1 }
                        ]
                    }
                },
                promotionBonus: {
                    coins: 200,
                    props: [
                        { gameType: "solitaire", propType: "hint", quantity: 3 },
                        { gameType: "solitaire", propType: "undo", quantity: 2 },
                        { gameType: "solitaire", propType: "shuffle", quantity: 1 }
                    ],
                    tickets: [
                        { gameType: "solitaire", tournamentType: "weekly_championship", quantity: 1 }
                    ]
                },
                demotionProtection: true,
                protectionMatches: 3,
                isActive: true
            },
            {
                segmentId: "gold",
                name: "黄金",
                displayName: "黄金段位",
                description: "技艺精湛，在竞技场中崭露头角",
                tier: 3,
                minPoints: 2500,
                maxPoints: 4999,
                color: "#FFD700",
                icon: "/icons/segments/gold.svg",
                badge: "/badges/segments/gold.png",
                rewards: {
                    coins: 200,
                    props: [
                        { gameType: "solitaire", propType: "hint", quantity: 3 },
                        { gameType: "solitaire", propType: "undo", quantity: 2 },
                        { gameType: "solitaire", propType: "shuffle", quantity: 1 }
                    ],
                    tickets: [
                        { gameType: "solitaire", tournamentType: "weekly_championship", quantity: 2 }
                    ],
                    dailyBonus: {
                        coins: 40,
                        props: [
                            { gameType: "solitaire", propType: "hint", quantity: 1 },
                            { gameType: "solitaire", propType: "undo", quantity: 1 }
                        ]
                    }
                },
                promotionBonus: {
                    coins: 500,
                    props: [
                        { gameType: "solitaire", propType: "hint", quantity: 5 },
                        { gameType: "solitaire", propType: "undo", quantity: 3 },
                        { gameType: "solitaire", propType: "shuffle", quantity: 2 }
                    ],
                    tickets: [
                        { gameType: "solitaire", tournamentType: "monthly_grand", quantity: 1 }
                    ]
                },
                demotionProtection: true,
                protectionMatches: 5,
                isActive: true
            },
            {
                segmentId: "platinum",
                name: "铂金",
                displayName: "铂金段位",
                description: "精英玩家，在高端竞技中展现实力",
                tier: 4,
                minPoints: 5000,
                maxPoints: 9999,
                color: "#E5E4E2",
                icon: "/icons/segments/platinum.svg",
                badge: "/badges/segments/platinum.png",
                rewards: {
                    coins: 400,
                    props: [
                        { gameType: "solitaire", propType: "hint", quantity: 5 },
                        { gameType: "solitaire", propType: "undo", quantity: 3 },
                        { gameType: "solitaire", propType: "shuffle", quantity: 2 }
                    ],
                    tickets: [
                        { gameType: "solitaire", tournamentType: "monthly_grand", quantity: 2 }
                    ],
                    dailyBonus: {
                        coins: 80,
                        props: [
                            { gameType: "solitaire", propType: "hint", quantity: 2 },
                            { gameType: "solitaire", propType: "undo", quantity: 1 }
                        ]
                    }
                },
                promotionBonus: {
                    coins: 1000,
                    props: [
                        { gameType: "solitaire", propType: "hint", quantity: 8 },
                        { gameType: "solitaire", propType: "undo", quantity: 5 },
                        { gameType: "solitaire", propType: "shuffle", quantity: 3 }
                    ],
                    tickets: [
                        { gameType: "solitaire", tournamentType: "season_final", quantity: 1 }
                    ]
                },
                demotionProtection: true,
                protectionMatches: 7,
                isActive: true
            },
            {
                segmentId: "diamond",
                name: "钻石",
                displayName: "钻石段位",
                description: "顶级玩家，在最高殿堂中争夺荣耀",
                tier: 5,
                minPoints: 10000,
                maxPoints: 19999,
                color: "#B9F2FF",
                icon: "/icons/segments/diamond.svg",
                badge: "/badges/segments/diamond.png",
                rewards: {
                    coins: 800,
                    props: [
                        { gameType: "solitaire", propType: "hint", quantity: 8 },
                        { gameType: "solitaire", propType: "undo", quantity: 5 },
                        { gameType: "solitaire", propType: "shuffle", quantity: 3 }
                    ],
                    tickets: [
                        { gameType: "solitaire", tournamentType: "season_final", quantity: 2 }
                    ],
                    dailyBonus: {
                        coins: 160,
                        props: [
                            { gameType: "solitaire", propType: "hint", quantity: 3 },
                            { gameType: "solitaire", propType: "undo", quantity: 2 }
                        ]
                    }
                },
                promotionBonus: {
                    coins: 2000,
                    props: [
                        { gameType: "solitaire", propType: "hint", quantity: 10 },
                        { gameType: "solitaire", propType: "undo", quantity: 8 },
                        { gameType: "solitaire", propType: "shuffle", quantity: 5 }
                    ],
                    tickets: [
                        { gameType: "solitaire", tournamentType: "season_final", quantity: 3 }
                    ]
                },
                demotionProtection: true,
                protectionMatches: 10,
                isActive: true
            },
            {
                segmentId: "master",
                name: "大师",
                displayName: "大师段位",
                description: "传奇玩家，在竞技史上留下不朽传说",
                tier: 6,
                minPoints: 20000,
                maxPoints: 999999,
                color: "#FF6B6B",
                icon: "/icons/segments/master.svg",
                badge: "/badges/segments/master.png",
                rewards: {
                    coins: 1500,
                    props: [
                        { gameType: "solitaire", propType: "hint", quantity: 10 },
                        { gameType: "solitaire", propType: "undo", quantity: 8 },
                        { gameType: "solitaire", propType: "shuffle", quantity: 5 }
                    ],
                    tickets: [
                        { gameType: "solitaire", tournamentType: "season_final", quantity: 5 }
                    ],
                    dailyBonus: {
                        coins: 300,
                        props: [
                            { gameType: "solitaire", propType: "hint", quantity: 5 },
                            { gameType: "solitaire", propType: "undo", quantity: 3 }
                        ]
                    }
                },
                promotionBonus: {
                    coins: 5000,
                    props: [
                        { gameType: "solitaire", propType: "hint", quantity: 15 },
                        { gameType: "solitaire", propType: "undo", quantity: 10 },
                        { gameType: "solitaire", propType: "shuffle", quantity: 8 }
                    ],
                    tickets: [
                        { gameType: "solitaire", tournamentType: "season_final", quantity: 5 }
                    ]
                },
                demotionProtection: true,
                protectionMatches: 15,
                isActive: true
            }
        ];

        let loadedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        for (const segment of segments) {
            try {
                // 检查是否已存在
                const existing = await ctx.db
                    .query("segments")
                    .withIndex("by_segmentId", (q) => q.eq("segmentId", segment.segmentId))
                    .first();

                if (existing) {
                    // 更新现有记录
                    await ctx.db.patch(existing._id, {
                        ...segment,
                        updatedAt: now.iso
                    });
                    updatedCount++;
                    console.log(`更新段位: ${segment.name}`);
                } else {
                    // 创建新记录
                    await ctx.db.insert("segments", {
                        ...segment,
                        createdAt: now.iso,
                        updatedAt: now.iso
                    });
                    loadedCount++;
                    console.log(`加载段位: ${segment.name}`);
                }
            } catch (error) {
                console.error(`加载段位 ${segment.name} 时出错:`, error);
                skippedCount++;
            }
        }

        return {
            success: true,
            loaded: loadedCount,
            updated: updatedCount,
            skipped: skippedCount,
            total: segments.length
        };
    }
});

// 创建测试玩家段位数据
export const createTestPlayerSegments = mutation({
    args: {
        playerCount: v.optional(v.number())
    },
    handler: async (ctx, { playerCount = 10 }) => {
        const now = getTorontoDate();
        const gameTypes = ["solitaire", "ludo", "rummy"];
        const segments = await ctx.db.query("segments").collect();

        let createdCount = 0;

        for (let i = 0; i < playerCount; i++) {
            const uid = `test_segment_player_${i + 1}`;

            for (const gameType of gameTypes) {
                try {
                    // 随机选择段位
                    const randomSegment = segments[Math.floor(Math.random() * segments.length)];
                    const randomPoints = Math.floor(Math.random() * (randomSegment.maxPoints - randomSegment.minPoints + 1)) + randomSegment.minPoints;

                    // 创建玩家段位信息
                    await ctx.db.insert("player_segments", {
                        uid,
                        gameType,
                        currentSegment: randomSegment.segmentId,
                        currentPoints: randomPoints,
                        highestSegment: randomSegment.segmentId,
                        highestPoints: randomPoints,
                        seasonHighestSegment: randomSegment.segmentId,
                        seasonHighestPoints: randomPoints,
                        promotionMatches: Math.floor(Math.random() * 5),
                        demotionProtection: Math.random() > 0.5,
                        protectionMatchesRemaining: Math.floor(Math.random() * 3),
                        totalMatches: Math.floor(Math.random() * 100) + 10,
                        wins: Math.floor(Math.random() * 80) + 5,
                        losses: Math.floor(Math.random() * 20) + 5,
                        winRate: Math.random() * 0.8 + 0.2,
                        streak: Math.floor(Math.random() * 10) - 5,
                        streakType: Math.random() > 0.5 ? "win" : "loss",
                        seasonStartSegment: randomSegment.segmentId,
                        seasonStartPoints: randomPoints - Math.floor(Math.random() * 500),
                        updatedAt: now.iso
                    });

                    createdCount++;
                } catch (error) {
                    console.error(`创建玩家段位 ${uid} ${gameType} 时出错:`, error);
                }
            }
        }

        return {
            success: true,
            createdCount,
            totalPlayers: playerCount,
            totalGameTypes: gameTypes.length,
            message: `成功创建 ${createdCount} 个玩家段位记录`
        };
    }
});

// 清空段位数据
export const clearSegmentData = mutation({
    args: {},
    handler: async (ctx) => {
        const segments = await ctx.db.query("segments").collect();
        const playerSegments = await ctx.db.query("player_segments").collect();
        const segmentChanges = await ctx.db.query("segment_changes").collect();
        const segmentRewards = await ctx.db.query("segment_rewards").collect();

        let deletedCount = 0;

        // 删除段位变更记录
        for (const change of segmentChanges) {
            await ctx.db.delete(change._id);
            deletedCount++;
        }

        // 删除段位奖励记录
        for (const reward of segmentRewards) {
            await ctx.db.delete(reward._id);
            deletedCount++;
        }

        // 删除玩家段位信息
        for (const playerSegment of playerSegments) {
            await ctx.db.delete(playerSegment._id);
            deletedCount++;
        }

        // 删除段位定义
        for (const segment of segments) {
            await ctx.db.delete(segment._id);
            deletedCount++;
        }

        return {
            success: true,
            deleted: deletedCount,
            segments: segments.length,
            playerSegments: playerSegments.length,
            segmentChanges: segmentChanges.length,
            segmentRewards: segmentRewards.length
        };
    }
});

// 获取段位统计信息
export const getSegmentStatistics = mutation({
    args: {},
    handler: async (ctx) => {
        const segments = await ctx.db.query("segments").collect();
        const playerSegments = await ctx.db.query("player_segments").collect();

        // 按段位统计玩家数量
        const segmentStats = segments.map(segment => {
            const playersInSegment = playerSegments.filter(ps => ps.currentSegment === segment.segmentId);
            return {
                segmentId: segment.segmentId,
                name: segment.name,
                tier: segment.tier,
                playerCount: playersInSegment.length,
                averagePoints: playersInSegment.length > 0 ?
                    playersInSegment.reduce((sum, ps) => sum + ps.currentPoints, 0) / playersInSegment.length : 0,
                averageWinRate: playersInSegment.length > 0 ?
                    playersInSegment.reduce((sum, ps) => sum + ps.winRate, 0) / playersInSegment.length : 0
            };
        });

        // 按游戏类型统计
        const gameTypeStats = {};
        const gameTypes = [...new Set(playerSegments.map(ps => ps.gameType))];

        for (const gameType of gameTypes) {
            const gamePlayers = playerSegments.filter(ps => ps.gameType === gameType);
            gameTypeStats[gameType] = {
                totalPlayers: gamePlayers.length,
                averagePoints: gamePlayers.reduce((sum, ps) => sum + ps.currentPoints, 0) / gamePlayers.length,
                averageWinRate: gamePlayers.reduce((sum, ps) => sum + ps.winRate, 0) / gamePlayers.length,
                segmentDistribution: segments.map(segment => ({
                    segmentId: segment.segmentId,
                    name: segment.name,
                    count: gamePlayers.filter(ps => ps.currentSegment === segment.segmentId).length
                }))
            };
        }

        return {
            success: true,
            totalSegments: segments.length,
            totalPlayers: playerSegments.length,
            segmentStats,
            gameTypeStats,
            summary: {
                mostPopularSegment: segmentStats.reduce((max, stat) =>
                    stat.playerCount > max.playerCount ? stat : max
                ),
                averagePoints: playerSegments.reduce((sum, ps) => sum + ps.currentPoints, 0) / playerSegments.length,
                averageWinRate: playerSegments.reduce((sum, ps) => sum + ps.winRate, 0) / playerSegments.length
            }
        };
    }
}); 