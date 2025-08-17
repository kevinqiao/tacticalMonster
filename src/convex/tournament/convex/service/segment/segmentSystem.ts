
// ============================================================================
// 段位系统核心服务
// ============================================================================

export type SegmentName = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "grandmaster";

export interface SegmentConfig {
    name: SegmentName;
    displayName: string;
    minRankPoints: number;
    maxRankPoints: number;
    color: string;
    icon: string;
    upgradeRewards: SegmentUpgradeRewards;
}

export interface SegmentUpgradeRewards {
    coins: number;
    seasonPoints: number;
    tickets: Ticket[];
    props: Prop[];
}

export interface Ticket {
    type: string; // "bronze", "silver", "gold"
    quantity: number;
}

export interface Prop {
    gameType: string;
    propType: string;
    quantity: number;
}

export interface PlayerSegment {
    uid: string;
    segmentName: SegmentName;
    rankPoints: number;
    seasonId: string;
    lastUpdated: string;
    upgradeHistory: SegmentUpgradeHistory[];
}

export interface SegmentUpgradeHistory {
    fromSegment: SegmentName;
    toSegment: SegmentName;
    rankPoints: number;
    upgradeDate: string;
    rewards: SegmentUpgradeRewards;
}

export class SegmentSystem {
    // ============================================================================
    // 段位配置
    // ============================================================================

    /**
     * 获取段位配置
     */
    static getSegmentConfigs(): Record<SegmentName, SegmentConfig> {
        return {
            bronze: {
                name: "bronze",
                displayName: "青铜",
                minRankPoints: 0,
                maxRankPoints: 999,
                color: "#CD7F32",
                icon: "🥉",
                upgradeRewards: {
                    coins: 100,
                    seasonPoints: 50,
                    tickets: [{ type: "bronze", quantity: 2 }],
                    props: []
                }
            },
            silver: {
                name: "silver",
                displayName: "白银",
                minRankPoints: 1000,
                maxRankPoints: 2499,
                color: "#C0C0C0",
                icon: "🥈",
                upgradeRewards: {
                    coins: 200,
                    seasonPoints: 100,
                    tickets: [{ type: "bronze", quantity: 3 }, { type: "silver", quantity: 1 }],
                    props: []
                }
            },
            gold: {
                name: "gold",
                displayName: "黄金",
                minRankPoints: 2500,
                maxRankPoints: 4999,
                color: "#FFD700",
                icon: "🥇",
                upgradeRewards: {
                    coins: 300,
                    seasonPoints: 150,
                    tickets: [{ type: "bronze", quantity: 5 }, { type: "silver", quantity: 2 }],
                    props: []
                }
            },
            platinum: {
                name: "platinum",
                displayName: "铂金",
                minRankPoints: 5000,
                maxRankPoints: 9999,
                color: "#E5E4E2",
                icon: "💎",
                upgradeRewards: {
                    coins: 500,
                    seasonPoints: 250,
                    tickets: [{ type: "bronze", quantity: 8 }, { type: "silver", quantity: 3 }, { type: "gold", quantity: 1 }],
                    props: []
                }
            },
            diamond: {
                name: "diamond",
                displayName: "钻石",
                minRankPoints: 10000,
                maxRankPoints: 19999,
                color: "#B9F2FF",
                icon: "💎",
                upgradeRewards: {
                    coins: 800,
                    seasonPoints: 400,
                    tickets: [{ type: "bronze", quantity: 10 }, { type: "silver", quantity: 5 }, { type: "gold", quantity: 2 }],
                    props: []
                }
            },
            master: {
                name: "master",
                displayName: "大师",
                minRankPoints: 20000,
                maxRankPoints: 49999,
                color: "#FF6B6B",
                icon: "👑",
                upgradeRewards: {
                    coins: 1200,
                    seasonPoints: 600,
                    tickets: [{ type: "bronze", quantity: 15 }, { type: "silver", quantity: 8 }, { type: "gold", quantity: 3 }],
                    props: []
                }
            },
            grandmaster: {
                name: "grandmaster",
                displayName: "宗师",
                minRankPoints: 50000,
                maxRankPoints: 999999,
                color: "#FF1493",
                icon: "👑",
                upgradeRewards: {
                    coins: 2000,
                    seasonPoints: 1000,
                    tickets: [{ type: "bronze", quantity: 20 }, { type: "silver", quantity: 10 }, { type: "gold", quantity: 5 }],
                    props: []
                }
            }
        };
    }

    /**
     * 根据积分获取段位
     */
    static getSegmentByRankPoints(rankPoints: number): SegmentName {
        const configs = this.getSegmentConfigs();

        for (const [name, config] of Object.entries(configs)) {
            if (rankPoints >= config.minRankPoints && rankPoints <= config.maxRankPoints) {
                return name as SegmentName;
            }
        }

        return "bronze"; // 默认青铜段位
    }

    /**
     * 获取段位配置
     */
    static getSegmentConfig(segmentName: SegmentName): SegmentConfig {
        const configs = this.getSegmentConfigs();
        return configs[segmentName];
    }

    // ============================================================================
    // 玩家段位管理
    // ============================================================================

    /**
     * 获取玩家段位信息
     */
    static async getPlayerSegment(ctx: any, uid: string): Promise<PlayerSegment | null> {
        const nowISO = new Date().toISOString();
        const currentSeasonId = this.getCurrentSeasonId();

        const playerSegment = await ctx.db.query("player_segments")
            .withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", currentSeasonId))
            .unique();

        if (!playerSegment) {
            return null;
        }

        return {
            uid: playerSegment.uid,
            segmentName: playerSegment.segmentName,
            rankPoints: playerSegment.rankPoints,
            seasonId: playerSegment.seasonId,
            lastUpdated: playerSegment.lastUpdated,
            upgradeHistory: playerSegment.upgradeHistory || []
        };
    }

    /**
     * 初始化玩家段位
     */
    static async initializePlayerSegment(ctx: any, uid: string): Promise<PlayerSegment> {
        const nowISO = new Date().toISOString();
        const currentSeasonId = this.getCurrentSeasonId();

        // 检查是否已存在
        const existingSegment = await this.getPlayerSegment(ctx, uid);
        if (existingSegment) {
            return existingSegment;
        }

        // 创建新段位记录
        const playerSegment: PlayerSegment = {
            uid,
            segmentName: "bronze",
            rankPoints: 0,
            seasonId: currentSeasonId,
            lastUpdated: nowISO,
            upgradeHistory: []
        };

        await ctx.db.insert("player_segments", {
            uid,
            segmentName: "bronze",
            rankPoints: 0,
            seasonId: currentSeasonId,
            lastUpdated: nowISO,
            upgradeHistory: [],
            createdAt: nowISO,
            updatedAt: nowISO
        });

        return playerSegment;
    }

    /**
     * 添加积分并检查段位升级
     */
    static async addRankPoints(ctx: any, uid: string, rankPoints: number, source: string): Promise<{ success: boolean; message: string; newSegment?: SegmentName; upgradeRewards?: SegmentUpgradeRewards }> {
        const nowISO = new Date().toISOString();

        try {
            // 获取或初始化玩家段位
            let playerSegment = await this.getPlayerSegment(ctx, uid);
            if (!playerSegment) {
                playerSegment = await this.initializePlayerSegment(ctx, uid);
            }

            const oldSegment = playerSegment.segmentName;
            const oldRankPoints = playerSegment.rankPoints;
            const newRankPoints = oldRankPoints + rankPoints;
            const newSegment = this.getSegmentByRankPoints(newRankPoints);

            // 获取数据库记录进行更新
            const currentSeasonId = this.getCurrentSeasonId();
            const segmentRecord = await ctx.db.query("player_segments")
                .withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", currentSeasonId))
                .unique();

            if (!segmentRecord) {
                return { success: false, message: "段位记录不存在" };
            }

            // 更新积分
            await ctx.db.patch(segmentRecord._id, {
                rankPoints: newRankPoints,
                lastUpdated: nowISO,
                updatedAt: nowISO
            });

            // 检查是否段位升级
            if (newSegment !== oldSegment && this.isHigherSegment(newSegment, oldSegment)) {
                const upgradeRewards = this.getSegmentConfig(newSegment).upgradeRewards;

                // 记录升级历史
                const upgradeHistory: SegmentUpgradeHistory = {
                    fromSegment: oldSegment,
                    toSegment: newSegment,
                    rankPoints: newRankPoints,
                    upgradeDate: nowISO,
                    rewards: upgradeRewards
                };

                await ctx.db.patch(segmentRecord._id, {
                    segmentName: newSegment,
                    upgradeHistory: [...playerSegment.upgradeHistory, upgradeHistory],
                    updatedAt: nowISO
                });

                // 发放升级奖励
                await this.grantUpgradeRewards(ctx, uid, upgradeRewards, oldSegment, newSegment, newRankPoints);

                return {
                    success: true,
                    message: `恭喜升级到${this.getSegmentConfig(newSegment).displayName}段位！`,
                    newSegment,
                    upgradeRewards
                };
            }

            return {
                success: true,
                message: `积分增加 ${rankPoints}，当前积分 ${newRankPoints}`,
                newSegment: oldSegment
            };

        } catch (error) {
            console.error("添加积分失败:", error);
            return {
                success: false,
                message: "添加积分失败"
            };
        }
    }

    /**
     * 发放升级奖励
     */
    private static async grantUpgradeRewards(ctx: any, uid: string, rewards: SegmentUpgradeRewards, fromSegment: SegmentName, toSegment: SegmentName, rankPoints: number): Promise<void> {
        const nowISO = new Date().toISOString();

        // 发放金币
        if (rewards.coins > 0) {
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (player) {
                await ctx.db.patch(player._id, {
                    coins: player.coins + rewards.coins
                });
            }
        }

        // 发放门票
        if (rewards.tickets && rewards.tickets.length > 0) {
            for (const ticket of rewards.tickets) {
                // 这里应该调用TicketSystem
                // await TicketSystem.grantTicketReward(ctx, {
                //     uid,
                //     type: ticket.type,
                //     quantity: ticket.quantity
                // });
            }
        }

        // 发放道具
        if (rewards.props && rewards.props.length > 0) {
            for (const prop of rewards.props) {
                // 这里应该调用PropSystem
                // await PropSystem.grantProp(ctx, {
                //     uid,
                //     gameType: prop.gameType,
                //     propType: prop.propType,
                //     quantity: prop.quantity
                // });
            }
        }

        // 发放赛季积分到Battle Pass
        if (rewards.seasonPoints > 0) {
            // 这里应该调用BattlePassSystem
            // await BattlePassSystem.addSeasonPoints(ctx, uid, rewards.seasonPoints, "segment_upgrade");
        }

        // 记录升级日志
        await ctx.db.insert("segment_upgrade_logs", {
            uid,
            fromSegment,
            toSegment,
            rankPoints,
            upgradeDate: nowISO,
            seasonId: this.getCurrentSeasonId(),
            rewards: {
                coins: rewards.coins,
                seasonPoints: rewards.seasonPoints,
                tickets: rewards.tickets,
                props: rewards.props
            },
            createdAt: nowISO
        });
    }

    /**
     * 检查段位是否更高
     */
    private static isHigherSegment(newSegment: SegmentName, oldSegment: SegmentName): boolean {
        const segmentOrder: SegmentName[] = ["bronze", "silver", "gold", "platinum", "diamond", "master", "grandmaster"];
        const newIndex = segmentOrder.indexOf(newSegment);
        const oldIndex = segmentOrder.indexOf(oldSegment);
        return newIndex > oldIndex;
    }

    /**
     * 获取当前赛季ID
     */
    private static getCurrentSeasonId(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `season_${year}_${month}`;
    }

    // ============================================================================
    // 段位统计和查询
    // ============================================================================

    /**
     * 获取段位分布统计
     */
    static async getSegmentDistribution(ctx: any): Promise<Record<SegmentName, number>> {
        const currentSeasonId = this.getCurrentSeasonId();
        const configs = this.getSegmentConfigs();
        const distribution: Record<SegmentName, number> = {} as Record<SegmentName, number>;

        // 初始化所有段位为0
        for (const segmentName of Object.keys(configs)) {
            distribution[segmentName as SegmentName] = 0;
        }

        // 统计各段位玩家数量
        const playerSegments = await ctx.db.query("player_segments")
            .withIndex("by_season", (q: any) => q.eq("seasonId", currentSeasonId))
            .collect();

        for (const playerSegment of playerSegments) {
            const segmentName = playerSegment.segmentName as SegmentName;
            distribution[segmentName]++;
        }

        return distribution;
    }

    /**
     * 获取段位排行榜
     */
    static async getSegmentLeaderboard(ctx: any, limit: number = 100): Promise<any[]> {
        const currentSeasonId = this.getCurrentSeasonId();

        const leaderboard = await ctx.db.query("player_segments")
            .withIndex("by_season", (q: any) => q.eq("seasonId", currentSeasonId))
            .order("desc")
            .take(limit)
            .collect();

        return leaderboard.map((entry: any, index: number) => ({
            rank: index + 1,
            uid: entry.uid,
            segmentName: entry.segmentName,
            rankPoints: entry.rankPoints,
            displayName: this.getSegmentConfig(entry.segmentName).displayName,
            color: this.getSegmentConfig(entry.segmentName).color,
            icon: this.getSegmentConfig(entry.segmentName).icon
        }));
    }
} 