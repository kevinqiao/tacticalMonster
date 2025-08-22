/**
 * 段位系统数据访问层
 * 统一管理所有数据库操作
 */

import { PlayerProtectionData, PlayerSegmentData, SegmentChangeRecord, SegmentName } from './types';

export interface DatabaseContext {
    db: any;
    auth: any;
}

// ==================== 玩家段位数据访问 ====================

export class PlayerSegmentDataAccess {
    /**
     * 获取玩家段位数据
     */
    static async getPlayerSegmentData(
        ctx: DatabaseContext,
        uid: string
    ): Promise<PlayerSegmentData | null> {
        try {
            const playerData = await ctx.db
                .query("player_performance_metrics")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!playerData) {
                return null;
            }

            return {
                uid: playerData.uid,
                currentSegment: playerData.segmentName as SegmentName,
                points: playerData.points || 0,
                totalMatches: playerData.totalMatches || 0,
                totalWins: playerData.totalWins || 0,
                currentWinStreak: playerData.currentWinStreak || 0,
                currentLoseStreak: playerData.currentLoseStreak || 0,
                lastMatchDate: playerData.lastMatchDate || new Date().toISOString(),
                createdAt: playerData.createdAt || new Date().toISOString(),
                updatedAt: playerData.updatedAt || new Date().toISOString()
            };
        } catch (error) {
            console.error(`获取玩家段位数据失败: ${uid}`, error);
            return null;
        }
    }

    /**
     * 更新玩家段位数据
     */
    static async updatePlayerSegmentData(
        ctx: DatabaseContext,
        uid: string,
        updates: Partial<PlayerSegmentData>
    ): Promise<boolean> {
        try {
            const playerData = await ctx.db
                .query("player_performance_metrics")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!playerData) {
                return false;
            }

            await ctx.db.patch(playerData._id, {
                ...updates,
                updatedAt: new Date().toISOString()
            });

            return true;
        } catch (error) {
            console.error(`更新玩家段位数据失败: ${uid}`, error);
            return false;
        }
    }

    /**
     * 创建玩家段位数据
     */
    static async createPlayerSegmentData(
        ctx: DatabaseContext,
        playerData: Omit<PlayerSegmentData, 'createdAt' | 'updatedAt'>
    ): Promise<boolean> {
        try {
            await ctx.db.insert("player_performance_metrics", {
                ...playerData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            return true;
        } catch (error) {
            console.error(`创建玩家段位数据失败: ${playerData.uid}`, error);
            return false;
        }
    }
}

// ==================== 玩家保护数据访问 ====================

export class PlayerProtectionDataAccess {
    /**
     * 获取玩家保护数据
     */
    static async getPlayerProtectionData(
        ctx: DatabaseContext,
        uid: string
    ): Promise<PlayerProtectionData | null> {
        try {
            const protectionData = await ctx.db
                .query("player_protection_status")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!protectionData) {
                return null;
            }

            return {
                uid: protectionData.uid,
                segmentName: protectionData.segmentName as SegmentName,
                protectionLevel: protectionData.protectionLevel || 0,
                gracePeriodRemaining: protectionData.gracePeriodRemaining || 0,
                lastSegmentChange: protectionData.lastSegmentChange || new Date().toISOString(),
                createdAt: protectionData.createdAt || new Date().toISOString(),
                updatedAt: protectionData.updatedAt || new Date().toISOString()
            };
        } catch (error) {
            console.error(`获取玩家保护数据失败: ${uid}`, error);
            return null;
        }
    }

    /**
     * 更新玩家保护数据
     */
    static async updatePlayerProtectionData(
        ctx: DatabaseContext,
        uid: string,
        updates: Partial<PlayerProtectionData>
    ): Promise<boolean> {
        try {
            const protectionData = await ctx.db
                .query("player_protection_status")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!protectionData) {
                return false;
            }

            await ctx.db.patch(protectionData._id, {
                ...updates,
                updatedAt: new Date().toISOString()
            });

            return true;
        } catch (error) {
            console.error(`更新玩家保护数据失败: ${uid}`, error);
            return false;
        }
    }

    /**
     * 创建玩家保护数据
     */
    static async createPlayerProtectionData(
        ctx: DatabaseContext,
        protectionData: Omit<PlayerProtectionData, 'createdAt' | 'updatedAt'>
    ): Promise<boolean> {
        try {
            await ctx.db.insert("player_protection_status", {
                ...protectionData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            return true;
        } catch (error) {
            console.error(`创建玩家保护数据失败: ${protectionData.uid}`, error);
            return false;
        }
    }

    /**
     * 设置保护状态
     */
    static async setProtectionStatus(
        ctx: DatabaseContext,
        uid: string,
        segmentName: SegmentName,
        protectionLevel: number,
        gracePeriodRemaining: number = 0
    ): Promise<boolean> {
        try {
            let protectionData = await this.getPlayerProtectionData(ctx, uid);

            if (!protectionData) {
                // 创建新的保护数据
                return await this.createPlayerProtectionData(ctx, {
                    uid,
                    segmentName,
                    protectionLevel,
                    gracePeriodRemaining,
                    lastSegmentChange: new Date().toISOString()
                });
            }

            // 更新现有保护数据
            return await this.updatePlayerProtectionData(ctx, uid, {
                segmentName,
                protectionLevel,
                gracePeriodRemaining,
                lastSegmentChange: new Date().toISOString()
            });
        } catch (error) {
            console.error(`设置保护状态失败: ${uid}`, error);
            return false;
        }
    }

    /**
     * 重置保护状态
     */
    static async resetProtectionStatus(
        ctx: DatabaseContext,
        uid: string
    ): Promise<boolean> {
        try {
            return await this.updatePlayerProtectionData(ctx, uid, {
                protectionLevel: 0,
                gracePeriodRemaining: 0,
                lastSegmentChange: new Date().toISOString()
            });
        } catch (error) {
            console.error(`重置保护状态失败: ${uid}`, error);
            return false;
        }
    }
}

// ==================== 段位变化记录访问 ====================

export class SegmentChangeRecordAccess {
    /**
     * 记录段位变化
     */
    static async recordSegmentChange(
        ctx: DatabaseContext,
        changeRecord: Omit<SegmentChangeRecord, 'createdAt'>
    ): Promise<boolean> {
        try {
            await ctx.db.insert("segment_change_history", {
                ...changeRecord,
                createdAt: new Date().toISOString()
            });

            return true;
        } catch (error) {
            console.error(`记录段位变化失败: ${changeRecord.uid}`, error);
            return false;
        }
    }

    /**
     * 获取玩家段位变化历史
     */
    static async getPlayerSegmentChangeHistory(
        ctx: DatabaseContext,
        uid: string,
        limit: number = 10
    ): Promise<SegmentChangeRecord[]> {
        try {
            const changes = await ctx.db
                .query("segment_change_history")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .order("desc")
                .take(limit);

            return changes.map((change: any) => ({
                uid: change.uid,
                oldSegment: change.oldSegment as SegmentName,
                newSegment: change.newSegment as SegmentName,
                changeType: change.changeType as "promotion" | "demotion",
                pointsConsumed: change.pointsConsumed,
                reason: change.reason,
                matchId: change.matchId,
                createdAt: change.createdAt
            }));
        } catch (error) {
            console.error(`获取玩家段位变化历史失败: ${uid}`, error);
            return [];
        }
    }

    /**
     * 获取最近的段位变化记录
     */
    static async getRecentSegmentChanges(
        ctx: DatabaseContext,
        limit: number = 20
    ): Promise<SegmentChangeRecord[]> {
        try {
            const changes = await ctx.db
                .query("segment_change_history")
                .order("desc")
                .take(limit);

            return changes.map((change: any) => ({
                uid: change.uid,
                oldSegment: change.oldSegment as SegmentName,
                newSegment: change.newSegment as SegmentName,
                changeType: change.changeType as "promotion" | "demotion",
                pointsConsumed: change.pointsConsumed,
                reason: change.reason,
                matchId: change.matchId,
                createdAt: change.createdAt
            }));
        } catch (error) {
            console.error(`获取最近段位变化记录失败`, error);
            return [];
        }
    }
}

// ==================== 比赛记录访问 ====================

export class MatchRecordAccess {
    /**
     * 获取玩家最近的比赛记录
     */
    static async getPlayerRecentMatches(
        ctx: DatabaseContext,
        uid: string,
        limit: number = 10
    ): Promise<any[]> {
        try {
            const matches = await ctx.db
                .query("match_results")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .order("desc")
                .take(limit);

            return matches;
        } catch (error) {
            console.error(`获取玩家最近比赛记录失败: ${uid}`, error);
            return [];
        }
    }

    /**
     * 检查玩家在指定段位的稳定性
     */
    static async checkPlayerStabilityInSegment(
        ctx: DatabaseContext,
        uid: string,
        segmentName: SegmentName,
        requiredPeriod: number
    ): Promise<{ stable: boolean; currentPeriod: number; requiredPeriod: number }> {
        try {
            const recentMatches = await this.getPlayerRecentMatches(ctx, uid, requiredPeriod);

            if (recentMatches.length < requiredPeriod) {
                return {
                    stable: false,
                    currentPeriod: recentMatches.length,
                    requiredPeriod
                };
            }

            // 检查是否都在当前段位
            const allInSegment = recentMatches.every((match: any) => {
                return match.segmentName === segmentName;
            });

            return {
                stable: allInSegment,
                currentPeriod: recentMatches.length,
                requiredPeriod
            };
        } catch (error) {
            console.error(`检查玩家段位稳定性失败: ${uid}`, error);
            return {
                stable: false,
                currentPeriod: 0,
                requiredPeriod
            };
        }
    }
}

// ==================== 统计查询访问 ====================

export class StatisticsAccess {
    /**
     * 获取段位分布统计
     */
    static async getSegmentDistribution(
        ctx: DatabaseContext
    ): Promise<Record<SegmentName, number>> {
        try {
            const players = await ctx.db
                .query("player_performance_metrics")
                .collect();

            const distribution: Record<SegmentName, number> = {
                bronze: 0,
                silver: 0,
                gold: 0,
                platinum: 0,
                diamond: 0,
                master: 0,
                grandmaster: 0
            };

            players.forEach((player: any) => {
                const segment = player.segmentName as SegmentName;
                if (distribution[segment] !== undefined) {
                    distribution[segment]++;
                }
            });

            return distribution;
        } catch (error) {
            console.error(`获取段位分布统计失败`, error);
            return {
                bronze: 0,
                silver: 0,
                gold: 0,
                platinum: 0,
                diamond: 0,
                master: 0,
                grandmaster: 0
            };
        }
    }

    /**
     * 获取总玩家数量
     */
    static async getTotalPlayerCount(ctx: DatabaseContext): Promise<number> {
        try {
            const players = await ctx.db
                .query("player_performance_metrics")
                .collect();

            return players.length;
        } catch (error) {
            console.error(`获取总玩家数量失败`, error);
            return 0;
        }
    }
}
