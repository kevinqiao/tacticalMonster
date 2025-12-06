
// ============================================================================
// Battle Pass 系统核心服务 - 基于Season Points
// ============================================================================

import { TimeZoneUtils } from "../../util/TimeZoneUtils";
import { RewardService } from "../reward/rewardService";

export interface BattlePassConfig {
    seasonId: string;
    seasonName: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    freeTrack: BattlePassTrack;
    premiumTrack: BattlePassTrack;
    seasonPointsPerLevel: number; // 每级需要的赛季积分
    maxLevel: number;
    price: number; // 金币价格
    description: string;
    theme: string; // 赛季主题
}

export interface BattlePassTrack {
    trackType: "free" | "premium";
    levels: BattlePassLevel[];
    totalRewards: BattlePassRewards;
    description: string;
}

export interface BattlePassLevel {
    level: number;
    seasonPointsRequired: number; // 需要的赛季积分
    rewards: BattlePassRewards;
    isUnlocked: boolean;
    isClaimed: boolean;
    progress: number; // 0-100 进度百分比
}

export interface BattlePassRewards {
    coins?: number;
    tickets?: Ticket[];
    props?: Prop[];
    seasonPoints?: number;
    prestige?: number; // 声望
    exclusiveItems?: ExclusiveItem[];
    rankPoints?: number; // 段位积分
}

export interface Ticket {
    type: string; // "bronze", "silver", "gold"
    quantity: number;
}

export interface Prop {
    gameType: string;
    propType: string;
    quantity: number;
    rarity: "common" | "rare" | "epic" | "legendary";
}

export interface ExclusiveItem {
    itemId: string;
    itemType: "avatar" | "frame" | "emote" | "title" | "background" | "effect";
    name: string;
    description: string;
    rarity: "common" | "rare" | "epic" | "legendary";
    previewUrl?: string;
}

export interface PlayerBattlePass {
    uid: string;
    seasonId: string;
    currentLevel: number;
    currentSeasonPoints: number; // 当前赛季积分
    totalSeasonPoints: number; // 总赛季积分
    isPremium: boolean;
    purchasedAt?: string;
    lastUpdated: string;
    progress: BattlePassProgress;
    claimedLevels: number[]; // 已领取的等级
    nextRewardLevel: number; // 下一个可领取的等级
}

export interface BattlePassProgress {
    // 各来源的赛季积分统计
    tournamentSeasonPoints: number;
    quickMatchSeasonPoints: number;
    propMatchSeasonPoints: number;
    taskSeasonPoints: number;
    socialSeasonPoints: number;
    achievementSeasonPoints: number;
    // 游戏特定积分统计（多游戏支持）
    gameSpecificPoints?: { [gameType: string]: { [source: string]: number } };
    // 每日统计
    dailySeasonPoints: { [date: string]: number };
    // 每周统计
    weeklySeasonPoints: { [week: string]: number };
    // 月度统计
    monthlySeasonPoints: { [month: string]: number };
}

export interface BattlePassStats {
    totalPlayers: number;
    averageLevel: number;
    averageSeasonPoints: number;
    premiumPlayers: number;
    maxLevel: number;
    totalSeasonPoints: number;
    levelDistribution: { [level: number]: number };
    sourceDistribution: {
        tournament: number;
        quickMatch: number;
        propMatch: number;
        task: number;
        social: number;
        achievement: number;
        segmentUpgrade: number;
    };
    completionRate: number;
    premiumConversionRate: number;
}

export class BattlePassSystem {
    // ============================================================================
    // Battle Pass 配置
    // ============================================================================

    /**
     * 获取当前赛季Battle Pass配置
     */
    static getCurrentBattlePassConfig(): BattlePassConfig {
        const nowISO = new Date().toISOString();
        const seasonStart = new Date(nowISO);
        seasonStart.setDate(1); // 每月1日开始
        const seasonEnd = new Date(seasonStart);
        seasonEnd.setMonth(seasonEnd.getMonth() + 1);

        return {
            seasonId: `season_${seasonStart.getFullYear()}_${String(seasonStart.getMonth() + 1).padStart(2, '0')}`,
            seasonName: `${seasonStart.getFullYear()}年${seasonStart.getMonth() + 1}月赛季`,
            startDate: seasonStart.toISOString(),
            endDate: seasonEnd.toISOString(),
            isActive: true,
            seasonPointsPerLevel: 100, // 每级需要100赛季积分
            maxLevel: 25, // 总共25级
            price: 500, // 金币价格
            description: "全新赛季，更多精彩奖励等你来拿！",
            theme: "seasonal",
            freeTrack: this.getFreeTrack(),
            premiumTrack: this.getPremiumTrack()
        };
    }

    /**
     * 获取免费轨道配置
     * 混合设计：每级都有基础奖励，特殊等级有额外奖励
     */
    private static getFreeTrack(): BattlePassTrack {
        const levels: BattlePassLevel[] = [];
        let totalCoins = 0;
        let totalBronzeTickets = 0;
        let totalSilverTickets = 0;
        let totalGoldTickets = 0;

        for (let level = 1; level <= 25; level++) {
            const seasonPointsRequired = level * 100;
            let rewards: BattlePassRewards = {};

            // 1. 每级都有基础奖励（20 coins）
            rewards.coins = 20;
            totalCoins += 20;

            // 2. 特殊等级额外奖励（里程碑奖励）
            if (level === 1) {
                // 第1级：欢迎奖励
                rewards.coins += 80; // 总计100
                rewards.tickets = [{ type: "bronze", quantity: 1 }];
                totalCoins += 80;
                totalBronzeTickets += 1;
            } else if (level === 5) {
                // 第5级：第一个里程碑
                rewards.coins += 80; // 总计100
                rewards.tickets = [{ type: "bronze", quantity: 1 }];
                totalCoins += 80;
                totalBronzeTickets += 1;
            } else if (level === 10) {
                // 第10级：中期里程碑
                rewards.coins += 180; // 总计200
                rewards.tickets = [{ type: "bronze", quantity: 2 }];
                totalCoins += 180;
                totalBronzeTickets += 2;
            } else if (level === 15) {
                // 第15级：高级里程碑
                rewards.coins += 280; // 总计300
                rewards.tickets = [{ type: "silver", quantity: 1 }];
                totalCoins += 280;
                totalSilverTickets += 1;
            } else if (level === 20) {
                // 第20级：接近完成
                rewards.coins += 480; // 总计500
                rewards.tickets = [{ type: "silver", quantity: 2 }];
                totalCoins += 480;
                totalSilverTickets += 2;
            } else if (level === 25) {
                // 第25级：最终奖励
                rewards.coins += 980; // 总计1000
                rewards.tickets = [{ type: "gold", quantity: 1 }];
                totalCoins += 980;
                totalGoldTickets += 1;
            } else {
                // 3. 非特殊等级的额外奖励
                if (level % 3 === 0) {
                    // 每3级额外金币奖励
                    rewards.coins += 30; // 总计50
                    totalCoins += 30;
                } else if (level % 5 === 0) {
                    // 每5级额外门票奖励（但5, 10, 15, 20, 25已被特殊等级覆盖）
                    rewards.tickets = [{ type: "bronze", quantity: 1 }];
                    totalBronzeTickets += 1;
                }
            }

            levels.push({
                level,
                seasonPointsRequired,
                rewards,
                isUnlocked: false,
                isClaimed: false,
                progress: 0
            });
        }

        return {
            trackType: "free",
            levels,
            description: "免费轨道，每级都有奖励，特殊等级更有惊喜！",
            totalRewards: {
                coins: totalCoins,
                tickets: [
                    { type: "bronze", quantity: totalBronzeTickets },
                    { type: "silver", quantity: totalSilverTickets },
                    { type: "gold", quantity: totalGoldTickets }
                ]
            }
        };
    }

    /**
     * 获取付费轨道配置
     * 混合设计：每级都有基础奖励（比免费轨道更多），特殊等级有额外奖励
     */
    private static getPremiumTrack(): BattlePassTrack {
        const levels: BattlePassLevel[] = [];
        let totalCoins = 0;
        let totalBronzeTickets = 0;
        let totalSilverTickets = 0;
        let totalGoldTickets = 0;

        for (let level = 1; level <= 25; level++) {
            const seasonPointsRequired = level * 100;
            let rewards: BattlePassRewards = {};

            // 1. 每级都有基础奖励（50 coins，比免费轨道多）
            rewards.coins = 50;
            totalCoins += 50;

            // 2. 特殊等级额外奖励（里程碑奖励）
            if (level === 1) {
                // 第1级：欢迎奖励
                rewards.coins += 50; // 总计100
                rewards.tickets = [{ type: "bronze", quantity: 2 }];
                totalCoins += 50;
                totalBronzeTickets += 2;
            } else if (level === 5) {
                // 第5级：第一个里程碑
                rewards.coins += 150; // 总计200
                rewards.tickets = [
                    { type: "bronze", quantity: 3 },
                    { type: "silver", quantity: 1 }
                ];
                totalCoins += 150;
                totalBronzeTickets += 3;
                totalSilverTickets += 1;
            } else if (level === 10) {
                // 第10级：中期里程碑
                rewards.coins += 350; // 总计400
                rewards.tickets = [{ type: "silver", quantity: 2 }];
                totalCoins += 350;
                totalSilverTickets += 2;
            } else if (level === 15) {
                // 第15级：高级里程碑
                rewards.coins += 550; // 总计600
                rewards.tickets = [
                    { type: "silver", quantity: 3 },
                    { type: "gold", quantity: 1 }
                ];
                totalCoins += 550;
                totalSilverTickets += 3;
                totalGoldTickets += 1;
            } else if (level === 20) {
                // 第20级：接近完成
                rewards.coins += 950; // 总计1000
                rewards.tickets = [{ type: "gold", quantity: 2 }];
                totalCoins += 950;
                totalGoldTickets += 2;
            } else if (level === 25) {
                // 第25级：最终奖励 + 专属物品
                rewards.coins += 1950; // 总计2000
                rewards.tickets = [{ type: "gold", quantity: 3 }];
                rewards.exclusiveItems = [
                    {
                        itemId: "premium_avatar_25",
                        itemType: "avatar",
                        name: "宗师头像",
                        description: "25级付费轨道专属头像",
                        rarity: "legendary",
                        previewUrl: "/assets/avatars/premium_25.png"
                    }
                ];
                totalCoins += 1950;
                totalGoldTickets += 3;
            } else {
                // 3. 非特殊等级的额外奖励
                if (level % 2 === 0) {
                    // 每2级额外奖励（金币 + 门票）
                    rewards.coins += 50; // 总计100
                    rewards.tickets = [{ type: "bronze", quantity: 1 }];
                    totalCoins += 50;
                    totalBronzeTickets += 1;
                } else if (level % 3 === 0) {
                    // 每3级额外金币奖励
                    rewards.coins += 100; // 总计150
                    totalCoins += 100;
                } else if (level % 5 === 0) {
                    // 每5级额外门票奖励（但5, 10, 15, 20, 25已被特殊等级覆盖）
                    rewards.tickets = [{ type: "silver", quantity: 1 }];
                    totalSilverTickets += 1;
                }
            }

            levels.push({
                level,
                seasonPointsRequired,
                rewards,
                isUnlocked: false,
                isClaimed: false,
                progress: 0
            });
        }

        return {
            trackType: "premium",
            levels,
            description: "付费轨道，每级奖励更丰厚，专属物品等你来拿！",
            totalRewards: {
                coins: totalCoins,
                tickets: [
                    { type: "bronze", quantity: totalBronzeTickets },
                    { type: "silver", quantity: totalSilverTickets },
                    { type: "gold", quantity: totalGoldTickets }
                ],
                exclusiveItems: [
                    {
                        itemId: "premium_avatar_25",
                        itemType: "avatar",
                        name: "宗师头像",
                        description: "25级付费轨道专属头像",
                        rarity: "legendary",
                        previewUrl: "/assets/avatars/premium_25.png"
                    }
                ]
            }
        };
    }

    // ============================================================================
    // 玩家Battle Pass管理
    // ============================================================================

    /**
     * 获取玩家Battle Pass信息
     */
    static async getPlayerBattlePass(ctx: any, uid: string): Promise<PlayerBattlePass | null> {
        const config = this.getCurrentBattlePassConfig();

        const playerBattlePass = await ctx.db.query("player_battle_pass")
            .withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", config.seasonId))
            .unique();

        if (!playerBattlePass) {
            return null;
        }

        // 计算下一个可领取的等级
        const nextRewardLevel = this.calculateNextRewardLevel(playerBattlePass);

        return {
            uid: playerBattlePass.uid,
            seasonId: playerBattlePass.seasonId,
            currentLevel: playerBattlePass.currentLevel,
            currentSeasonPoints: playerBattlePass.currentSeasonPoints,
            totalSeasonPoints: playerBattlePass.totalSeasonPoints,
            isPremium: playerBattlePass.isPremium,
            purchasedAt: playerBattlePass.purchasedAt,
            lastUpdated: playerBattlePass.lastUpdated,
            progress: playerBattlePass.progress,
            claimedLevels: playerBattlePass.claimedLevels || [],
            nextRewardLevel
        };
    }

    /**
     * 初始化玩家Battle Pass
     */
    static async initializePlayerBattlePass(ctx: any, uid: string): Promise<PlayerBattlePass> {
        const config = this.getCurrentBattlePassConfig();
        const nowISO = new Date().toISOString();

        const initialProgress: BattlePassProgress = {
            tournamentSeasonPoints: 0,
            quickMatchSeasonPoints: 0,
            propMatchSeasonPoints: 0,
            taskSeasonPoints: 0,
            socialSeasonPoints: 0,
            achievementSeasonPoints: 0,
            gameSpecificPoints: {},
            dailySeasonPoints: {},
            weeklySeasonPoints: {},
            monthlySeasonPoints: {}
        };

        await ctx.db.insert("player_battle_pass", {
            uid,
            seasonId: config.seasonId,
            currentLevel: 1,
            currentSeasonPoints: 0,
            totalSeasonPoints: 0,
            isPremium: false,
            lastUpdated: nowISO,
            progress: initialProgress,
            claimedLevels: [],
            createdAt: nowISO,
            updatedAt: nowISO
        });

        return {
            uid,
            seasonId: config.seasonId,
            currentLevel: 1,
            currentSeasonPoints: 0,
            totalSeasonPoints: 0,
            isPremium: false,
            lastUpdated: nowISO,
            progress: initialProgress,
            claimedLevels: [],
            nextRewardLevel: 1
        };
    }

    /**
     * 购买Premium Battle Pass
     */
    static async purchasePremiumBattlePass(ctx: any, uid: string): Promise<{ success: boolean; message: string; battlePass?: PlayerBattlePass | null }> {
        const config = this.getCurrentBattlePassConfig();
        const nowISO = new Date().toISOString();

        // 检查玩家是否存在
        const player = await ctx.db.query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .unique();

        if (!player) {
            return { success: false, message: "玩家不存在" };
        }

        // 检查玩家金币（从 player_inventory 检查）
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!inventory) {
            return { success: false, message: "玩家库存不存在" };
        }

        const currentCoins = inventory.coins || 0;
        if (currentCoins < config.price) {
            return { success: false, message: `金币不足，需要 ${config.price} 金币，当前只有 ${currentCoins} 金币` };
        }

        // 获取或创建玩家Battle Pass
        let playerBattlePass = await this.getPlayerBattlePass(ctx, uid);
        if (!playerBattlePass) {
            playerBattlePass = await this.initializePlayerBattlePass(ctx, uid);
        }

        if (playerBattlePass.isPremium) {
            return { success: false, message: "已经购买了Premium Battle Pass" };
        }

        try {
            // 扣除金币（从 player_inventory 扣除）
            await ctx.db.patch(inventory._id, {
                coins: currentCoins - config.price,
                updatedAt: new Date().toISOString(),
            });

            // 更新Battle Pass状态
            const battlePassRecord = await ctx.db.query("player_battle_pass")
                .withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", config.seasonId))
                .unique();

            if (battlePassRecord) {
                await ctx.db.patch(battlePassRecord._id, {
                    isPremium: true,
                    purchasedAt: nowISO,
                    lastUpdated: nowISO,
                    updatedAt: nowISO
                });
            }

            // 记录购买日志
            await ctx.db.insert("battle_pass_purchase_logs", {
                uid,
                seasonId: config.seasonId,
                price: config.price,
                purchasedAt: nowISO,
                createdAt: nowISO
            });

            // 获取更新后的Battle Pass信息
            const updatedBattlePass = await this.getPlayerBattlePass(ctx, uid);

            return {
                success: true,
                message: "成功购买Premium Battle Pass",
                battlePass: updatedBattlePass || undefined
            };
        } catch (error) {
            console.error("购买Premium Battle Pass失败:", error);
            return { success: false, message: "购买失败，请稍后重试" };
        }
    }

    // ============================================================================
    // 赛季积分获取和进度更新
    // ============================================================================

    /**
     * 添加赛季积分到玩家Battle Pass
     */
    static async addSeasonPoints(ctx: any, uid: string, seasonPointsAmount: number, source: string): Promise<{ success: boolean; message: string; newLevel?: number; rewards?: BattlePassRewards[] }> {
        const nowISO = new Date().toISOString();
        const config = this.getCurrentBattlePassConfig();

        try {
            // 获取或初始化玩家Battle Pass
            let playerBattlePass = await this.getPlayerBattlePass(ctx, uid);
            if (!playerBattlePass) {
                playerBattlePass = await this.initializePlayerBattlePass(ctx, uid);
            }

            const oldLevel = playerBattlePass.currentLevel;
            const oldSeasonPoints = playerBattlePass.currentSeasonPoints;
            const newSeasonPoints = oldSeasonPoints + seasonPointsAmount;
            const newLevel = Math.min(Math.floor(newSeasonPoints / config.seasonPointsPerLevel) + 1, config.maxLevel);

            // 更新Battle Pass进度
            const progress = { ...playerBattlePass.progress };

            // 根据来源更新对应的赛季积分
            // 支持游戏特定来源格式：gameType:source
            if (source.includes(":")) {
                const [gameType, sourceAction] = source.split(":");
                // 游戏特定积分统计（预留，未来可以扩展）
                if (!progress.gameSpecificPoints) {
                    progress.gameSpecificPoints = {};
                }
                if (!progress.gameSpecificPoints[gameType]) {
                    progress.gameSpecificPoints[gameType] = {};
                }
                if (!progress.gameSpecificPoints[gameType][sourceAction]) {
                    progress.gameSpecificPoints[gameType][sourceAction] = 0;
                }
                progress.gameSpecificPoints[gameType][sourceAction] += seasonPointsAmount;
            } else {
                // 通用来源
                switch (source) {
                    case "tournament":
                        progress.tournamentSeasonPoints += seasonPointsAmount;
                        break;
                    case "quick_match":
                        progress.quickMatchSeasonPoints += seasonPointsAmount;
                        break;
                    case "prop_match":
                        progress.propMatchSeasonPoints += seasonPointsAmount;
                        break;
                    case "task":
                        progress.taskSeasonPoints += seasonPointsAmount;
                        break;
                    case "social":
                        progress.socialSeasonPoints += seasonPointsAmount;
                        break;
                    case "achievement":
                        progress.achievementSeasonPoints += seasonPointsAmount;
                        break;
                }
            }

            // 更新每日统计
            const today = nowISO.split('T')[0];
            progress.dailySeasonPoints[today] = (progress.dailySeasonPoints[today] || 0) + seasonPointsAmount;

            // 更新每周统计
            const weekStart = TimeZoneUtils.getTimeZoneWeekStartISO("America/Toronto");
            progress.weeklySeasonPoints[weekStart] = (progress.weeklySeasonPoints[weekStart] || 0) + seasonPointsAmount;

            // 更新每月统计
            const monthStart = TimeZoneUtils.getTimeZoneMonthStartISO("America/Toronto");
            progress.monthlySeasonPoints[monthStart] = (progress.monthlySeasonPoints[monthStart] || 0) + seasonPointsAmount;

            // 获取数据库记录进行更新
            const battlePassRecord = await ctx.db.query("player_battle_pass")
                .withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", config.seasonId))
                .unique();

            if (battlePassRecord) {
                await ctx.db.patch(battlePassRecord._id, {
                    currentSeasonPoints: newSeasonPoints,
                    totalSeasonPoints: playerBattlePass.totalSeasonPoints + seasonPointsAmount,
                    currentLevel: newLevel,
                    lastUpdated: nowISO,
                    progress: progress,
                    updatedAt: nowISO
                });
            }

            // 记录赛季积分日志
            await ctx.db.insert("battle_pass_season_points_logs", {
                uid,
                seasonPointsAmount,
                source,
                currentLevel: newLevel,
                totalSeasonPoints: playerBattlePass.totalSeasonPoints + seasonPointsAmount,
                createdAt: nowISO
            });

            // 检查是否有新等级解锁的奖励
            const unlockedRewards: BattlePassRewards[] = [];
            if (newLevel > oldLevel) {
                for (let level = oldLevel + 1; level <= newLevel; level++) {
                    const track = playerBattlePass.isPremium ? config.premiumTrack : config.freeTrack;
                    const levelConfig = track.levels.find(l => l.level === level);
                    if (levelConfig && levelConfig.rewards) {
                        unlockedRewards.push(levelConfig.rewards);
                    }
                }
            }

            return {
                success: true,
                message: `成功添加 ${seasonPointsAmount} 赛季积分，当前等级 ${newLevel}`,
                newLevel,
                rewards: unlockedRewards.length > 0 ? unlockedRewards : undefined
            };

        } catch (error) {
            console.error("添加赛季积分失败:", error);
            return {
                success: false,
                message: "添加赛季积分失败"
            };
        }
    }

    // ============================================================================
    // 奖励发放
    // ============================================================================

    /**
     * 发放Battle Pass奖励
     */
    static async claimBattlePassRewards(ctx: any, uid: string, level: number): Promise<{ success: boolean; message: string; rewards?: BattlePassRewards }> {
        const config = this.getCurrentBattlePassConfig();
        const nowISO = new Date().toISOString();

        // 获取玩家Battle Pass
        const playerBattlePass = await this.getPlayerBattlePass(ctx, uid);
        if (!playerBattlePass) {
            return { success: false, message: "Battle Pass不存在" };
        }

        // 检查等级是否达到
        if (playerBattlePass.currentLevel < level) {
            return { success: false, message: `等级不足，当前等级 ${playerBattlePass.currentLevel}，需要等级 ${level}` };
        }

        // 检查是否已经领取
        if (playerBattlePass.claimedLevels.includes(level)) {
            return { success: false, message: `等级 ${level} 的奖励已经领取过了` };
        }

        // 获取奖励配置
        const track = playerBattlePass.isPremium ? config.premiumTrack : config.freeTrack;
        const levelConfig = track.levels.find(l => l.level === level);

        if (!levelConfig) {
            return { success: false, message: "等级配置不存在" };
        }

        try {
            // 发放奖励（使用统一奖励服务）
            const rewards = levelConfig.rewards;
            const rewardResults = await this.grantBattlePassRewards(ctx, uid, rewards, level, config.seasonId);

            // 更新已领取等级
            const battlePassRecord = await ctx.db.query("player_battle_pass")
                .withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", config.seasonId))
                .unique();

            if (battlePassRecord) {
                const updatedClaimedLevels = [...playerBattlePass.claimedLevels, level];
                await ctx.db.patch(battlePassRecord._id, {
                    claimedLevels: updatedClaimedLevels,
                    lastUpdated: nowISO,
                    updatedAt: nowISO
                });
            }

            // 记录奖励领取日志
            await ctx.db.insert("battle_pass_reward_claims", {
                uid,
                seasonId: config.seasonId,
                level,
                rewards,
                claimedAt: nowISO,
                createdAt: nowISO
            });

            return {
                success: true,
                message: `成功领取 ${level} 级奖励`,
                rewards
            };
        } catch (error) {
            console.error("发放Battle Pass奖励失败:", error);
            return { success: false, message: "发放奖励失败，请稍后重试" };
        }
    }

    /**
     * 发放Battle Pass奖励的具体实现（使用统一奖励服务）
     */
    private static async grantBattlePassRewards(ctx: any, uid: string, rewards: BattlePassRewards, level?: number, seasonId?: string): Promise<{ success: boolean; message: string }> {
        try {
            // 转换 BattlePassRewards 为 UnifiedRewards
            const unifiedRewards: any = {
                coins: rewards.coins,
                seasonPoints: rewards.seasonPoints,
                props: rewards.props,
                exclusiveItems: rewards.exclusiveItems?.map(item => ({
                    itemId: item.itemId,
                    itemType: item.itemType,
                    quantity: 1, // ExclusiveItem 没有 quantity 字段，默认为 1
                })),
            };

            // 调用统一奖励服务
            const result = await RewardService.grantRewards(ctx, {
                uid,
                rewards: unifiedRewards,
                source: {
                    source: "battle_pass",
                    sourceId: level !== undefined ? `level_${level}` : undefined,
                    metadata: {
                        level,
                        seasonId,
                    },
                },
            });

            // 处理失败奖励
            if (result.failedRewards && result.failedRewards.length > 0) {
                const failedMessages = result.failedRewards.map(f => `${f.type}: ${f.reason}`).join(", ");
                console.error(`部分奖励发放失败: ${failedMessages}`);
            }

            return {
                success: result.success,
                message: result.success ? "奖励发放成功" : result.message,
            };
        } catch (error: any) {
            console.error("发放Battle Pass奖励失败:", error);
            return { success: false, message: `奖励发放失败: ${error.message}` };
        }
    }

    // ============================================================================
    // 统计和分析
    // ============================================================================

    /**
     * 获取玩家Battle Pass统计
     */
    static async getPlayerBattlePassStats(ctx: any, uid: string): Promise<any> {
        const playerBattlePass = await this.getPlayerBattlePass(ctx, uid);
        if (!playerBattlePass) {
            return null;
        }

        const config = this.getCurrentBattlePassConfig();
        const progressPercentage = (playerBattlePass.currentLevel / config.maxLevel) * 100;
        const seasonPointsToNextLevel = config.seasonPointsPerLevel - playerBattlePass.currentSeasonPoints;
        const totalClaimedRewards = playerBattlePass.claimedLevels.length;
        const availableRewards = playerBattlePass.currentLevel - totalClaimedRewards;

        return {
            currentLevel: playerBattlePass.currentLevel,
            currentSeasonPoints: playerBattlePass.currentSeasonPoints,
            totalSeasonPoints: playerBattlePass.totalSeasonPoints,
            isPremium: playerBattlePass.isPremium,
            progressPercentage,
            seasonPointsToNextLevel,
            maxLevel: config.maxLevel,
            totalClaimedRewards,
            availableRewards,
            nextRewardLevel: playerBattlePass.nextRewardLevel,
            progress: playerBattlePass.progress
        };
    }

    /**
     * 获取赛季排行榜
     */
    static async getSeasonLeaderboard(ctx: any, limit: number = 100): Promise<any[]> {
        const config = this.getCurrentBattlePassConfig();

        const leaderboard = await ctx.db.query("player_battle_pass")
            .withIndex("by_season_totalSeasonPoints", (q: any) => q.eq("seasonId", config.seasonId))
            .order("desc")
            .take(limit);

        return leaderboard.map((entry: any, index: number) => ({
            rank: index + 1,
            uid: entry.uid,
            currentLevel: entry.currentLevel,
            totalSeasonPoints: entry.totalSeasonPoints,
            isPremium: entry.isPremium
        }));
    }

    /**
     * 获取Battle Pass统计数据
     */
    static async getBattlePassStats(ctx: any): Promise<BattlePassStats> {
        const config = this.getCurrentBattlePassConfig();

        // 获取所有玩家Battle Pass数据
        const allBattlePass = await ctx.db.query("player_battle_pass")
            .withIndex("by_season", (q: any) => q.eq("seasonId", config.seasonId))
            .collect();

        // 计算统计数据
        const stats: BattlePassStats = {
            totalPlayers: allBattlePass.length,
            averageLevel: 0,
            averageSeasonPoints: 0,
            premiumPlayers: 0,
            maxLevel: 0,
            totalSeasonPoints: 0,
            levelDistribution: {},
            sourceDistribution: {
                tournament: 0,
                quickMatch: 0,
                propMatch: 0,
                task: 0,
                social: 0,
                achievement: 0,
                segmentUpgrade: 0
            },
            completionRate: 0,
            premiumConversionRate: 0
        };

        if (allBattlePass.length > 0) {
            let totalLevel = 0;
            let totalSeasonPoints = 0;
            let premiumCount = 0;
            let maxLevelFound = 0;
            let completedCount = 0;

            for (const battlePass of allBattlePass) {
                totalLevel += battlePass.currentLevel;
                totalSeasonPoints += battlePass.totalSeasonPoints;
                if (battlePass.isPremium) premiumCount++;
                if (battlePass.currentLevel > maxLevelFound) maxLevelFound = battlePass.currentLevel;
                if (battlePass.currentLevel >= config.maxLevel) completedCount++;

                // 等级分布
                const level = battlePass.currentLevel;
                stats.levelDistribution[level] = (stats.levelDistribution[level] || 0) + 1;

                // 来源分布
                const progress = battlePass.progress;
                stats.sourceDistribution.tournament += progress.tournamentSeasonPoints;
                stats.sourceDistribution.quickMatch += progress.quickMatchSeasonPoints;
                stats.sourceDistribution.propMatch += progress.propMatchSeasonPoints;
                stats.sourceDistribution.task += progress.taskSeasonPoints;
                stats.sourceDistribution.social += progress.socialSeasonPoints;
                stats.sourceDistribution.achievement += progress.achievementSeasonPoints;
            }

            stats.averageLevel = totalLevel / allBattlePass.length;
            stats.averageSeasonPoints = totalSeasonPoints / allBattlePass.length;
            stats.premiumPlayers = premiumCount;
            stats.maxLevel = maxLevelFound;
            stats.totalSeasonPoints = totalSeasonPoints;
            stats.completionRate = (completedCount / allBattlePass.length) * 100;
            stats.premiumConversionRate = (premiumCount / allBattlePass.length) * 100;
        }

        return stats;
    }

    // ============================================================================
    // 工具方法
    // ============================================================================

    /**
     * 计算下一个可领取的等级
     */
    private static calculateNextRewardLevel(playerBattlePass: PlayerBattlePass): number {
        for (let level = 1; level <= playerBattlePass.currentLevel; level++) {
            if (!playerBattlePass.claimedLevels.includes(level)) {
                return level;
            }
        }
        return playerBattlePass.currentLevel + 1;
    }

    /**
     * 获取周开始日期
     */
    private static getWeekStart(date: Date): string {
        const dayOfWeek = date.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
        const diff = date.getDate() - dayOfWeek; // Adjust to get the Monday of the current week
        const weekStart = new Date(date);
        weekStart.setDate(diff);
        return weekStart.toISOString().split('T')[0];
    }

    // ============================================================================
    // 赛季重置
    // ============================================================================

    /**
     * 为新赛季重置所有玩家的Battle Pass
     * 这个方法会在每月1日自动执行，将所有玩家的Battle Pass重置为新赛季
     * 
     * 注意：由于Battle Pass采用延迟初始化策略，这个方法主要做以下事情：
     * 1. 检测当前赛季ID
     * 2. 查找所有旧赛季的Battle Pass记录（可选：保留历史记录）
     * 3. 新赛季的Battle Pass会在玩家首次访问时自动创建
     * 
     * 如果需要强制为所有玩家创建新赛季记录，可以取消注释相关代码
     */
    static async resetAllPlayersBattlePassForNewSeason(ctx: any): Promise<{
        success: boolean;
        message: string;
        currentSeasonId: string;
        oldSeasonRecords?: number;
        resetCount?: number;
    }> {
        const nowISO = new Date().toISOString();
        const currentConfig = this.getCurrentBattlePassConfig();
        const currentSeasonId = currentConfig.seasonId;

        console.log(`[Battle Pass Reset] 开始新赛季重置 - 当前赛季: ${currentSeasonId}`);

        try {
            // 查找所有旧赛季的Battle Pass记录
            const allBattlePassRecords = await ctx.db
                .query("player_battle_pass")
                .collect();

            // 过滤出非当前赛季的记录
            const oldSeasonRecords = allBattlePassRecords.filter(
                (record: any) => record.seasonId !== currentSeasonId
            );

            console.log(`[Battle Pass Reset] 找到 ${oldSeasonRecords.length} 条旧赛季记录`);

            // 可选：删除旧赛季记录（如果需要保留历史，可以注释掉这部分）
            // 注意：删除旧记录可以节省存储空间，但会丢失历史数据
            // 如果将来需要历史数据分析，建议保留记录或迁移到历史表
            let deletedCount = 0;
            for (const oldRecord of oldSeasonRecords) {
                // 只删除非当前赛季的记录
                if (oldRecord.seasonId !== currentSeasonId) {
                    await ctx.db.delete(oldRecord._id);
                    deletedCount++;
                }
            }

            // 可选：为新赛季预创建所有玩家的Battle Pass记录
            // 注意：这会为所有玩家创建记录，即使他们可能不活跃
            // 由于采用延迟初始化策略，建议不预创建，让玩家在首次访问时自动创建
            // 
            // 如果需要预创建，可以取消注释以下代码：
            /*
            const allPlayers = await ctx.db.query("players").collect();
            let createdCount = 0;
            for (const player of allPlayers) {
                // 检查是否已有当前赛季的记录
                const existing = await ctx.db.query("player_battle_pass")
                    .withIndex("by_uid_season", (q: any) => 
                        q.eq("uid", player.uid).eq("seasonId", currentSeasonId)
                    )
                    .unique();
                
                if (!existing) {
                    await this.initializePlayerBattlePass(ctx, player.uid);
                    createdCount++;
                }
            }
            console.log(`[Battle Pass Reset] 为新赛季预创建了 ${createdCount} 条记录`);
            */

            console.log(`[Battle Pass Reset] 重置完成 - 删除了 ${deletedCount} 条旧记录`);

            return {
                success: true,
                message: `Battle Pass新赛季重置完成 - ${currentSeasonId}`,
                currentSeasonId,
                oldSeasonRecords: oldSeasonRecords.length,
                resetCount: deletedCount
            };

        } catch (error) {
            console.error("[Battle Pass Reset] 重置失败:", error);
            return {
                success: false,
                message: `Battle Pass重置失败: ${error}`,
                currentSeasonId
            };
        }
    }

    /**
     * 检查并重置单个玩家的Battle Pass（如果赛季已切换）
     * 这个方法在玩家访问Battle Pass时自动调用
     */
    static async checkAndResetPlayerBattlePassIfNeeded(ctx: any, uid: string): Promise<{
        reset: boolean;
        newSeasonId?: string;
    }> {
        const currentConfig = this.getCurrentBattlePassConfig();
        const currentSeasonId = currentConfig.seasonId;

        // 获取玩家当前Battle Pass记录
        const playerBattlePass = await ctx.db.query("player_battle_pass")
            .withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", currentSeasonId))
            .unique();

        // 如果已有当前赛季的记录，不需要重置
        if (playerBattlePass) {
            return { reset: false };
        }

        // 检查是否有旧赛季的记录
        const allPlayerRecords = await ctx.db.query("player_battle_pass")
            .withIndex("by_uid_season", (q: any) => q.eq("uid", uid))
            .collect();

        // 删除所有旧赛季的记录
        for (const oldRecord of allPlayerRecords) {
            if (oldRecord.seasonId !== currentSeasonId) {
                await ctx.db.delete(oldRecord._id);
            }
        }

        // 为新赛季初始化（延迟初始化）
        await this.initializePlayerBattlePass(ctx, uid);

        return {
            reset: true,
            newSeasonId: currentSeasonId
        };
    }
} 